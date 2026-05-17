/*
--
SDZ
2026-05-17
When a player cannot update a GM-authored saving-throw chat card, request the active GM to run the in-place reroll and spend the caster's Echo Fragment via socket.
--
*/

import {
    canUserInvokeCasterSaveEchoRerollForUser,
    findEchoFragmentOnActor,
    getSpellCasterActorFromSaveRelatedMessage,
    isStandalonePf2eSavingThrowMessage
} from "./caster-save-helpers.mjs";
import { loc, MODULE_ID } from "./module-constants.mjs";
import { debugContext, debugContextEnabled } from "./module-debug.mjs";
import { SETTING_ECHO_SLUG } from "./module-settings.mjs";
import { tryPf2eStandaloneSavingThrowRerollKeepNewManual } from "./pf2e-reroll.mjs";
import { consumeOneEchoFragment } from "../features/echo-fragment-context.mjs";

const SOCKET_CHANNEL = `module.${MODULE_ID}`;

/** @enum {string} */
const SocketOp = {
    STANDALONE_SAVE_REROLL: "deocCasterStandaloneSaveReroll",
    STANDALONE_SAVE_REROLL_RESULT: "deocCasterStandaloneSaveRerollResult"
};

/**
 * Only one GM client should apply updates to avoid duplicate rerolls / charges.
 *
 * @returns {boolean}
 */
function shouldHandleSocketAsResponsibleGm()
{
    if (!game.user?.isGM)
    {
        return false;
    }

    /** @type {any} */
    const users = game.users;
    /** @type {any} */
    const active = users?.activeGM;

    if (active && active.id !== game.user.id)
    {
        return false;
    }

    return true;
}

/**
 * @param {string} requestId
 * @param {string} userId
 * @param {boolean} success
 */
function emitStandaloneSaveRerollResult(requestId, userId, success)
{
    game.socket.emit(SOCKET_CHANNEL, {
        op: SocketOp.STANDALONE_SAVE_REROLL_RESULT,
        requestId,
        userId,
        success
    });
}

/**
 * @param {unknown} data
 */
async function onSocketMessage(data)
{
    /** @type {any} */
    const d = data;

    if (d?.op !== SocketOp.STANDALONE_SAVE_REROLL)
    {
        return;
    }

    if (!shouldHandleSocketAsResponsibleGm())
    {
        return;
    }

    const requestId = d.requestId;
    const userId = d.userId;
    const messageId = d.messageId;

    if (typeof requestId !== "string" || typeof userId !== "string" || typeof messageId !== "string")
    {
        return;
    }

    let success = false;

    try
    {
        const message = game.messages.get(messageId);
        const requestingUser = game.users.get(userId);

        if (!message || !requestingUser || !isStandalonePf2eSavingThrowMessage(message))
        {
            if (debugContextEnabled())
            {
                debugContext("casterSaveSocket:reject", {
                    reason: "bad-message-or-user",
                    messageId,
                    userId
                });
            }

            success = false;
            return;
        }

        const caster = getSpellCasterActorFromSaveRelatedMessage(message);

        if (!canUserInvokeCasterSaveEchoRerollForUser(requestingUser, caster))
        {
            if (debugContextEnabled())
            {
                debugContext("casterSaveSocket:reject", { reason: "not-caster-owner", messageId, userId });
            }

            success = false;
            return;
        }

        const slug = String(game.settings.get(MODULE_ID, SETTING_ECHO_SLUG) ?? "").trim().toLowerCase();

        if (!slug)
        {
            success = false;
            return;
        }

        const echoItem = findEchoFragmentOnActor(caster, slug);
        const qty = echoItem ? Number(echoItem.system?.quantity) : NaN;

        if (!echoItem || !Number.isFinite(qty) || qty <= 0)
        {
            if (debugContextEnabled())
            {
                debugContext("casterSaveSocket:reject", { reason: "no-echo-item", messageId, userId });
            }

            success = false;
            return;
        }

        const ok = await tryPf2eStandaloneSavingThrowRerollKeepNewManual(message);

        if (!ok)
        {
            if (debugContextEnabled())
            {
                debugContext("casterSaveSocket:reject", { reason: "reroll-failed", messageId });
            }

            success = false;
            return;
        }

        await consumeOneEchoFragment(echoItem);
        success = true;

        if (debugContextEnabled())
        {
            debugContext("casterSaveSocket:ok", { messageId, userId });
        }
    }
    catch (err)
    {
        console.warn("[desires-echoes-of-creation] caster-save GM socket", err);
        success = false;
    }
    finally
    {
        emitStandaloneSaveRerollResult(requestId, userId, success);
    }
}

/**
 * Register GM-side handler (all clients listen; only responsible GM acts).
 */
export function registerCasterSaveGmSocket()
{
    if (typeof game.socket?.on !== "function")
    {
        return;
    }

    game.socket.on(SOCKET_CHANNEL, onSocketMessage);
}

/**
 * Ask the active GM to perform {@link tryPf2eStandaloneSavingThrowRerollKeepNewManual} and spend one fragment on the caster.
 *
 * @param {{ messageId: string }} opts
 * @returns {Promise<boolean>}
 */
export function requestGmStandaloneSaveRerollKeepNew(opts)
{
    const messageId = opts.messageId;

    if (typeof messageId !== "string" || !messageId)
    {
        return Promise.resolve(false);
    }

    if (typeof game.socket?.emit !== "function")
    {
        return Promise.resolve(false);
    }

    /** @type {any} */
    const activeGm = /** @type {any} */ (game.users).activeGM;

    if (!game.user?.isGM && (activeGm === undefined || activeGm === null))
    {
        ui.notifications?.warn(loc("WARN.CASTER_SAVE_ECHO_NO_GM"));
        return Promise.resolve(false);
    }

    const requestId = foundry.utils.randomID();
    const userId = game.user.id;

    return new Promise((resolve) =>
    {
        const timeoutMs = 25000;

        /**
         * @param {unknown} payload
         */
        const onReply = (payload) =>
        {
            /** @type {any} */
            const p = payload;

            if (p?.op !== SocketOp.STANDALONE_SAVE_REROLL_RESULT)
            {
                return;
            }

            if (p.requestId !== requestId || p.userId !== userId)
            {
                return;
            }

            game.socket.off(SOCKET_CHANNEL, onReply);
            window.clearTimeout(timer);
            resolve(p.success === true);
        };

        const timer = window.setTimeout(() =>
        {
            game.socket.off(SOCKET_CHANNEL, onReply);
            ui.notifications?.warn(loc("WARN.CASTER_SAVE_ECHO_SOCKET_TIMEOUT"));
            resolve(false);
        }, timeoutMs);

        game.socket.on(SOCKET_CHANNEL, onReply);
        game.socket.emit(SOCKET_CHANNEL, {
            op: SocketOp.STANDALONE_SAVE_REROLL,
            requestId,
            messageId,
            userId
        });
    });
}
