/*
--
SDZ
2026-05-16
Spell caster resolution and permission checks for caster-paid Echo Fragment save rerolls (standalone saves and PF2e Toolbelt embedded saves).
--
*/

import { findItemOnActorBySlug } from "./actor-helpers.mjs";
import { pickSingleToolbeltEmbeddedSave } from "./pf2e-reroll.mjs";

/**
 * @param {unknown} ref
 * @returns {Actor | null}
 */
function resolveActorFromPf2eRef(ref)
{
    if (!ref)
    {
        return null;
    }

    if (ref instanceof Actor)
    {
        return ref;
    }

    /** @type {any} */
    const anyRef = ref;

    const uuid = typeof anyRef === "string" ? anyRef : anyRef?.uuid;

    if (typeof uuid === "string" && (uuid.startsWith("Actor.") || uuid.includes("Actor.")))
    {
        try
        {
            const d = foundry.utils.fromUuidSync(uuid);
            return d instanceof Actor ? d : null;
        }
        catch (_e)
        {
            return null;
        }
    }

    const id = typeof anyRef === "string" ? null : anyRef?.id;

    if (typeof id === "string" && id.length > 0)
    {
        return game.actors.get(id) ?? null;
    }

    return null;
}

/**
 * @param {ChatMessage} message
 * @returns {Actor | null}
 */
export function getSpellCasterActorFromSaveRelatedMessage(message)
{
    /** @type {any} */
    const f = message.flags?.pf2e;

    if (!f)
    {
        return null;
    }

    const fromCtx = resolveActorFromPf2eRef(f.context?.origin?.actor);

    if (fromCtx)
    {
        return fromCtx;
    }

    const fromOrigin = resolveActorFromPf2eRef(f.origin?.actor ?? f.origin);

    if (fromOrigin)
    {
        return fromOrigin;
    }

    const ou = typeof f.origin?.uuid === "string" ? f.origin.uuid : null;

    if (ou && ou.startsWith("Actor."))
    {
        try
        {
            const d = foundry.utils.fromUuidSync(ou);
            return d instanceof Actor ? d : null;
        }
        catch (_e)
        {
            return null;
        }
    }

    return null;
}

/**
 * @param {ChatMessage} message
 * @returns {boolean}
 */
export function isStandalonePf2eSavingThrowMessage(message)
{
    return message.flags?.pf2e?.context?.type === "saving-throw";
}

/**
 * @param {ChatMessage} message
 * @returns {boolean}
 */
export function isToolbeltSpellWithSingleEmbeddedSave(message)
{
    return (
        message.flags?.pf2e?.context?.type === "spell-cast" &&
        pickSingleToolbeltEmbeddedSave(message) != null
    );
}

/**
 * @param {ChatMessage} message
 * @returns {boolean}
 */
export function isCasterSaveEchoEligibleMessage(message)
{
    return (
        isStandalonePf2eSavingThrowMessage(message) || isToolbeltSpellWithSingleEmbeddedSave(message)
    );
}

/**
 * @param {Actor | null | undefined} casterActor
 * @returns {boolean}
 */
export function canUserInvokeCasterSaveEchoReroll(casterActor)
{
    if (!casterActor)
    {
        return false;
    }

    if (game.user?.isGM)
    {
        return true;
    }

    return casterActor.isOwner === true;
}

/**
 * @param {Actor | null | undefined} casterActor
 * @param {string} slug
 * @returns {Item | null}
 */
export function findEchoFragmentOnActor(casterActor, slug)
{
    return findItemOnActorBySlug(casterActor, slug);
}
