/*
--
SDZ
2026-05-06
Chat context: Echo Fragment reroll — own rolls, inventory check, quantity decrement.
--
*/

import { findItemOnActorBySlug, getMessageActor, isOwnPlayerRollMessage } from "../lib/actor-helpers.mjs";
import { getChatMessageFromContextTarget, resolveContextMenuTarget } from "../lib/chat-from-li.mjs";
import { debugContext, debugContextEnabled } from "../lib/module-debug.mjs";
import { loc, MODULE_ID } from "../lib/module-constants.mjs";
import { getEchoFragmentSlug, SETTING_ECHO_SLUG } from "../lib/module-settings.mjs";
import { tryPf2eCheckRerollKeepNew, tryPf2eDamageRollKeepNew } from "../lib/pf2e-reroll.mjs";

/**
 * Strike cards use {@link getMessageActor}. Players: only the roller may pay fragments.
 * GMs: also search other owned actors so a fragment on one character sheet still works
 * when testing attacks from another token ("Echo Fighter" vs "Echo of an Hellknight").
 *
 * @param {ChatMessage} message
 * @returns {Actor[]}
 */
function collectActorsForEchoInventory(message)
{
    /** @type {string[]} */
    const seen = [];
    /** @type {Actor[]} */
    const out = [];

    const push = (/** @type {Actor | null | undefined} */ a) =>
    {
        if (!a)
        {
            return;
        }

        if (seen.includes(a.id))
        {
            return;
        }

        seen.push(a.id);
        out.push(a);
    };

    push(getMessageActor(message));

    if (!game.user?.isGM)
    {
        return out;
    }

    push(game.user?.character ?? null);

    for (const a of game.actors)
    {
        if (a.type !== "character" && a.type !== "npc")
        {
            continue;
        }

        if (!a.isOwner)
        {
            continue;
        }

        push(a);
    }

    return out;
}

/**
 * @param {ChatMessage} message
 * @param {string} slug
 * @returns {Item | null}
 */
function findEchoFragmentItem(message, slug)
{
    const want = String(slug ?? "").trim().toLowerCase();
    if (!want)
    {
        return null;
    }

    const dbg = debugContextEnabled();
    /** @type {{ actorId: string, actorName: string, matched: boolean, qty: number | null }[]} */
    const tried = [];

    for (const actor of collectActorsForEchoInventory(message))
    {
        const echoItem = findItemOnActorBySlug(actor, want);
        const qtyRaw = echoItem ? Number(echoItem.system?.quantity) : NaN;

        if (dbg)
        {
            tried.push({
                actorId: actor.id,
                actorName: actor.name,
                matched: echoItem != null,
                qty: echoItem && Number.isFinite(qtyRaw) ? qtyRaw : null
            });
        }

        if (!echoItem)
        {
            continue;
        }

        const qty = Number(echoItem.system?.quantity);
        if (Number.isFinite(qty) && qty <= 0)
        {
            continue;
        }

        if (dbg)
        {
            debugContext("findEchoFragmentItem:found", { want, actorId: actor.id, itemId: echoItem.id, qty });
        }

        return echoItem;
    }

    if (dbg)
    {
        debugContext("findEchoFragmentItem:none", { want, tried });
    }

    return null;
}

/**
 * @returns {object}
 */
export function createEchoFragmentMenuEntry()
{
    const label = loc("CONTEXT.ECHO_FRAGMENT_REROLL");

    return {
        _deocId: "echo-fragment",
        name: label,
        label,
        icon: '<i class="fas fa-dice-d20"></i>',
        condition: (first, second) => echoCondition(first, second),
        visible: (first, second) => echoCondition(first, second),
        callback: (first, second) =>
        {
            void echoCallback(first, second);
        },
        onClick: (first, second) =>
        {
            void echoCallback(first, second);
        }
    };
}

/**
 * @param {unknown} first
 * @param {unknown} second
 * @returns {boolean}
 */
function echoCondition(first, second)
{
    const dbg = debugContextEnabled();
    const el = resolveContextMenuTarget(first, second);

    if (dbg)
    {
        const msgEarly = getChatMessageFromContextTarget(el);
        debugContext("echoCondition:start", {
            firstType: first?.constructor?.name ?? typeof first,
            secondType: second?.constructor?.name ?? typeof second,
            elTag: el?.tagName ?? null,
            elMessageId: el?.closest?.("[data-message-id]")?.dataset?.messageId ?? null,
            messageId: msgEarly?.id ?? null
        });
    }

    const message = getChatMessageFromContextTarget(el);
    if (!message || game.system?.id !== "pf2e")
    {
        if (dbg)
        {
            debugContext("echoCondition:false", {
                reason: "no-message-or-not-pf2e",
                hasMessage: Boolean(message),
                systemId: game.system?.id ?? null
            });
        }

        return false;
    }

    const actor = getMessageActor(message);

    if (dbg)
    {
        debugContext("echoCondition:gates", {
            messageId: message.id,
            isAuthor: message.isAuthor,
            isOwnerMsg: message.isOwner,
            authorId: message.author?.id ?? null,
            userId: game.user?.id ?? null,
            actorId: actor?.id ?? null,
            actorName: actor?.name ?? null,
            actorIsOwner: actor?.isOwner ?? null,
            rollActorId: /** @type {any} */ (message).rollActorId ?? null,
            isOwnPlayerRoll: isOwnPlayerRollMessage(message)
        });
    }

    if (!isOwnPlayerRollMessage(message))
    {
        if (dbg)
        {
            debugContext("echoCondition:false", { reason: "not-own-player-roll", messageId: message.id });
        }

        return false;
    }

    const slug = String(game.settings.get(MODULE_ID, SETTING_ECHO_SLUG) ?? "").trim().toLowerCase();
    if (!slug)
    {
        if (dbg)
        {
            debugContext("echoCondition:false", { reason: "empty-slug-setting", messageId: message.id });
        }

        return false;
    }

    const found = findEchoFragmentItem(message, slug) !== null;

    if (dbg)
    {
        debugContext(found ? "echoCondition:true" : "echoCondition:false", found
            ? { messageId: message.id, slug }
            : { reason: "no-echo-item", messageId: message.id, slug });
    }

    return found;
}

/**
 * @param {Item} echoItem
 * @returns {Promise<void>}
 */
export async function consumeOneEchoFragment(echoItem)
{
    const qtyRaw = echoItem.system?.quantity;
    const qty = Number(qtyRaw);

    if (!Number.isFinite(qty) || qty <= 1)
    {
        await echoItem.delete();
        return;
    }

    await echoItem.update({ "system.quantity": qty - 1 });
}

/**
 * @param {unknown} first
 * @param {unknown} second
 * @returns {Promise<void>}
 */
async function echoCallback(first, second)
{
    const el = resolveContextMenuTarget(first, second);
    const message = getChatMessageFromContextTarget(el);
    if (!message)
    {
        return;
    }

    if (!isOwnPlayerRollMessage(message))
    {
        ui.notifications.warn(loc("WARN.ECHO_NOT_OWNER"));
        return;
    }

    const slug = getEchoFragmentSlug();
    const echoItem = findEchoFragmentItem(message, slug);
    if (!echoItem)
    {
        ui.notifications.warn(loc("WARN.ECHO_NO_ITEM"));
        return;
    }

    const isDamageCard = message.flags?.pf2e?.context?.type === "damage-roll";
    const ok = isDamageCard ? await tryPf2eDamageRollKeepNew(message) : await tryPf2eCheckRerollKeepNew(message);
    if (!ok)
    {
        ui.notifications.warn(loc("WARN.ECHO_PF2E_API"));
        return;
    }

    await consumeOneEchoFragment(echoItem);
}
