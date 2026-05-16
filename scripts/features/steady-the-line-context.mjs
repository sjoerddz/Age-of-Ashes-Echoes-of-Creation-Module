/*
--
SDZ
2026-05-06
Chat context: Steady the Line (Hellknight Banner) — eligibility and degree upgrade.
--
*/

import { findBannerBearer, getActorsForCurrentUserContextMenu, getMessageActor } from "../lib/actor-helpers.mjs";
import { getChatMessageFromContextTarget, resolveContextMenuTarget } from "../lib/chat-from-li.mjs";
import { loc, MODULE_ID } from "../lib/module-constants.mjs";
import { getHellknightBannerSlug, SETTING_BANNER_SLUG } from "../lib/module-settings.mjs";
import { readPf2eOutcome, tryImproveDegreeOneStep } from "../lib/pf2e-reroll.mjs";

/**
 * @returns {object}
 */
export function createSteadyTheLineMenuEntry()
{
    const label = loc("CONTEXT.STEADY_THE_LINE");

    return {
        _deocId: "steady-the-line",
        name: label,
        label,
        icon: '<i class="fas fa-flag"></i>',
        condition: (first, second) => steadyCondition(first, second),
        visible: (first, second) => steadyCondition(first, second),
        callback: (first, second) =>
        {
            void steadyCallback(first, second);
        },
        onClick: (first, second) =>
        {
            void steadyCallback(first, second);
        }
    };
}

/**
 * Steady the Line appears only if this Foundry user controls at least one actor who openly carries
 * the banner ({@link findBannerBearer} over {@link getActorsForCurrentUserContextMenu}).
 * Players who do not own a banner-bearing actor will not see the action on someone else&apos;s failure.
 * GMs who own all actors still see it when any owned actor carries the banner (typical Foundry GM setup).
 *
 * @param {unknown} first
 * @param {unknown} second
 * @returns {boolean}
 */
function steadyCondition(first, second)
{
    const el = resolveContextMenuTarget(first, second);
    const message = getChatMessageFromContextTarget(el);
    if (!message || game.system?.id !== "pf2e")
    {
        return false;
    }

    const outcome = readPf2eOutcome(message);
    if (outcome === "criticalFailure")
    {
        return false;
    }

    if (outcome !== "failure")
    {
        return false;
    }

    const beneficiary = getMessageActor(message);
    if (!beneficiary)
    {
        return false;
    }

    const slug = String(game.settings.get(MODULE_ID, SETTING_BANNER_SLUG) ?? "").trim().toLowerCase();
    if (!slug)
    {
        return false;
    }

    const immune = beneficiary.getFlag(MODULE_ID, "steadyLineImmune");
    if (immune?.bannerSlug === slug)
    {
        return false;
    }

    const bearer = findBannerBearer(getActorsForCurrentUserContextMenu(), slug);
    return bearer !== null;
}

/**
 * @param {unknown} first
 * @param {unknown} second
 * @returns {Promise<void>}
 */
async function steadyCallback(first, second)
{
    const el = resolveContextMenuTarget(first, second);
    const message = getChatMessageFromContextTarget(el);
    if (!message)
    {
        return;
    }

    const slug = getHellknightBannerSlug();

    const beneficiary = getMessageActor(message);
    if (!beneficiary)
    {
        return;
    }

    const immune = beneficiary.getFlag(MODULE_ID, "steadyLineImmune");
    if (immune?.bannerSlug === slug)
    {
        ui.notifications.warn(loc("WARN.STEADY_IMMUNE"));
        return;
    }

    const bearer = findBannerBearer(getActorsForCurrentUserContextMenu(), slug);
    if (!bearer)
    {
        ui.notifications.warn(loc("WARN.STEADY_NO_BEARER"));
        return;
    }

    const ok = await tryImproveDegreeOneStep(message);
    if (!ok)
    {
        ui.notifications.warn(loc("WARN.STEADY_PF2E_API"));
        return;
    }

    await beneficiary.setFlag(MODULE_ID, "steadyLineImmune", { bannerSlug: slug });
}
