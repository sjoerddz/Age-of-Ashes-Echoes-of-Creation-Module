/*
--
SDZ
2026-05-16
Chat context: Echo Fragment reroll initiated by the spell caster — target save (standalone or PF2e Toolbelt embedded), consume one fragment from the caster.
--
*/

import {
    canUserInvokeCasterSaveEchoReroll,
    currentUserMayUpdateChatMessage,
    findEchoFragmentOnActor,
    getSpellCasterActorFromSaveRelatedMessage,
    isCasterSaveEchoEligibleMessage,
    isStandalonePf2eSavingThrowMessage,
    isToolbeltSpellWithEmbeddedSaves
} from "../lib/caster-save-helpers.mjs";
import { requestGmStandaloneSaveRerollKeepNew } from "../lib/caster-save-gm-socket.mjs";
import { selectToolbeltSavePickWithDialog } from "../lib/toolbelt-save-target-dialog.mjs";
import { getChatMessageFromContextTarget, resolveContextMenuTarget } from "../lib/chat-from-li.mjs";
import { loc, MODULE_ID } from "../lib/module-constants.mjs";
import { debugContext, debugContextEnabled } from "../lib/module-debug.mjs";
import { SETTING_ECHO_SLUG } from "../lib/module-settings.mjs";
import {
    listToolbeltEmbeddedSavePicks,
    tryPf2eStandaloneSavingThrowRerollKeepNewManual,
    tryPf2eToolbeltEmbeddedSaveRerollKeepNew
} from "../lib/pf2e-reroll.mjs";
import { consumeOneEchoFragment } from "./echo-fragment-context.mjs";

/**
 * @returns {object}
 */
export function createCasterSaveEchoMenuEntry()
{
    const label = loc("CONTEXT.CASTER_SAVE_ECHO_REROLL");

    return {
        _deocId: "caster-save-echo",
        name: label,
        label,
        icon: '<i class="fas fa-user-shield"></i>',
        condition: (first, second) => casterSaveEchoCondition(first, second),
        visible: (first, second) => casterSaveEchoCondition(first, second),
        callback: (first, second) =>
        {
            void casterSaveEchoCallback(first, second);
        },
        onClick: (first, second) =>
        {
            void casterSaveEchoCallback(first, second);
        }
    };
}

/**
 * @param {unknown} first
 * @param {unknown} second
 * @returns {boolean}
 */
function casterSaveEchoCondition(first, second)
{
    const dbg = debugContextEnabled();
    const el = resolveContextMenuTarget(first, second);

    if (dbg)
    {
        const msgEarly = getChatMessageFromContextTarget(el);
        debugContext("casterSaveEchoCondition:start", {
            messageId: msgEarly?.id ?? null
        });
    }

    const message = getChatMessageFromContextTarget(el);

    if (!message || game.system?.id !== "pf2e")
    {
        return false;
    }

    if (!isCasterSaveEchoEligibleMessage(message))
    {
        if (dbg)
        {
            debugContext("casterSaveEchoCondition:false", {
                reason: "not-eligible-type",
                messageId: message.id,
                ctxType: message.flags?.pf2e?.context?.type ?? null
            });
        }

        return false;
    }

    const caster = getSpellCasterActorFromSaveRelatedMessage(message);

    if (dbg)
    {
        debugContext("casterSaveEchoCondition:caster", {
            messageId: message.id,
            casterId: caster?.id ?? null,
            casterName: caster?.name ?? null
        });
    }

    if (!canUserInvokeCasterSaveEchoReroll(caster))
    {
        if (dbg)
        {
            debugContext("casterSaveEchoCondition:false", {
                reason: "cannot-invoke-caster-gate",
                messageId: message.id
            });
        }

        return false;
    }

    const slug = String(game.settings.get(MODULE_ID, SETTING_ECHO_SLUG) ?? "").trim().toLowerCase();

    if (!slug)
    {
        return false;
    }

    const echo = findEchoFragmentOnActor(caster, slug);
    const qty = echo ? Number(echo.system?.quantity) : NaN;
    const found = echo != null && Number.isFinite(qty) && qty > 0;

    if (dbg)
    {
        debugContext(found ? "casterSaveEchoCondition:true" : "casterSaveEchoCondition:false", {
            messageId: message.id,
            slug,
            found
        });
    }

    return found;
}

/**
 * @param {unknown} first
 * @param {unknown} second
 * @returns {Promise<void>}
 */
async function casterSaveEchoCallback(first, second)
{
    const el = resolveContextMenuTarget(first, second);
    const message = getChatMessageFromContextTarget(el);

    if (!message)
    {
        return;
    }

    const caster = getSpellCasterActorFromSaveRelatedMessage(message);

    if (!canUserInvokeCasterSaveEchoReroll(caster))
    {
        ui.notifications.warn(loc("WARN.CASTER_SAVE_ECHO_NOT_CASTER_OWNER"));
        return;
    }

    const slug = String(game.settings.get(MODULE_ID, SETTING_ECHO_SLUG) ?? "").trim().toLowerCase();
    const echoItem = findEchoFragmentOnActor(caster, slug);

    if (!echoItem)
    {
        ui.notifications.warn(loc("WARN.CASTER_SAVE_ECHO_NO_ITEM"));
        return;
    }

    let ok = false;
    /** When the active GM rerolled via socket, they already spent the Echo Fragment. */
    let fragmentAlreadySpent = false;

    if (isToolbeltSpellWithEmbeddedSaves(message))
    {
        const picks = listToolbeltEmbeddedSavePicks(message);
        const chosen = await selectToolbeltSavePickWithDialog(picks);

        if (!chosen)
        {
            return;
        }

        ok = await tryPf2eToolbeltEmbeddedSaveRerollKeepNew(message, chosen);
    }
    else if (isStandalonePf2eSavingThrowMessage(message))
    {
        /*
         * Do not call {@link tryPf2eCheckRerollKeepNew} here: PF2e {@code Check.rerollFromMessage}
         * deletes the chat message and recreates it. When the GM rolled the save (poster is GM,
         * caster only pays the fragment), the caster is often not {@link ChatMessage#isAuthor},
         * which yields {@code PF2E.RerollMenu.ErrorCantDelete} while some fallthrough paths can
         * still resolve {@code true} — spending the fragment for a failed reroll.
         *
         * In-place keep-new uses {@link ChatMessage#update}. Players lack that permission on
         * GM-authored cards — {@link requestGmStandaloneSaveRerollKeepNew} has the active GM apply
         * the update and spend the fragment.
         */
        if (currentUserMayUpdateChatMessage(message))
        {
            ok = await tryPf2eStandaloneSavingThrowRerollKeepNewManual(message);
        }
        else
        {
            ok = await requestGmStandaloneSaveRerollKeepNew({ messageId: message.id });
            fragmentAlreadySpent = ok;
        }
    }

    if (!ok)
    {
        ui.notifications.warn(loc("WARN.CASTER_SAVE_ECHO_PF2E_API"));
        return;
    }

    if (!fragmentAlreadySpent)
    {
        await consumeOneEchoFragment(echoItem);
    }
}
