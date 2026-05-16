/*
--
SDZ
2026-05-16
PF2e chat reroll helpers: {@link game.pf2e.Check.rerollFromMessage} for checks (keep new, no hero point);
 * custom damage-roll reroll (PF2e Check path intentionally ignores damage messages); legacy fallbacks.
--
*/

import { loc } from "./module-constants.mjs";
import { debugContext, debugContextEnabled } from "./module-debug.mjs";

/**
 * Matches PF2e {@code isCheckContextFlag}: {@link game.pf2e.Check.rerollFromMessage} no-ops otherwise.
 *
 * @param {ChatMessage} message
 * @returns {boolean}
 */
function isPf2eCheckRerollContext(message)
{
    /** @type {any} */
    const ctx = message.flags?.pf2e?.context;
    if (!ctx)
    {
        return false;
    }

    const t = ctx.type;
    return t !== "damage-roll" && t !== "spell-cast";
}

/**
 * @returns {constructor | null}
 */
function getDamageRollConstructor()
{
    /** @type {any[]} */
    const list = CONFIG.Dice?.rolls ?? [];

    return /** @type {constructor | null} */ (list.find((r) => r?.name === "DamageRoll") ?? null);
}

/**
 * PF2e does not support damage via {@link game.pf2e.Check.rerollFromMessage}. Mirror strike damage output:
 * clone primary {@link DamageRoll}, re-evaluate, rebuild splash instances, replace the chat message.
 *
 * @param {ChatMessage} message
 * @returns {Promise<boolean>}
 */
export async function tryPf2eDamageRollKeepNew(message)
{
    if (!(message.isAuthor || game.user.isGM))
    {
        ui.notifications.error(game.i18n.localize("PF2E.RerollMenu.ErrorCantDelete"));
        return false;
    }

    const DamageRoll = getDamageRollConstructor();
    /** @type {any} */
    const ChatMessagePF2e = CONFIG.ChatMessage?.documentClass;

    if (!DamageRoll || typeof ChatMessagePF2e?.create !== "function")
    {
        return false;
    }

    if (message.flags?.pf2e?.context?.type !== "damage-roll")
    {
        return false;
    }

    /** @type {any[]} */
    const rolls = message.rolls ?? [];
    /** @type {any} */
    const oldRoll = rolls.find((r) => r instanceof DamageRoll && !r.options?.splashOnly);

    if (!oldRoll)
    {
        return false;
    }

    const systemFlags = foundry.utils.deepClone(message.flags.pf2e);
    /** @type {any} */
    const context = systemFlags.context;
    context.skipDialog = true;
    context.isReroll = true;
    context.options = [...new Set([...(context.options ?? []), "damage:reroll", "deoc:echo-fragment"])].sort();
    const allowInteractive = context.rollMode !== "blindroll";

    /** @type {any} */
    let unevaluated = typeof oldRoll.clone === "function" ? oldRoll.clone() : DamageRoll.fromData(oldRoll.toJSON());
    unevaluated.options = foundry.utils.mergeObject(unevaluated.options ?? {}, { isReroll: true });

    /** @type {any} */
    let newRoll;

    try
    {
        newRoll = await unevaluated.evaluate({ allowInteractive });
    }
    catch (err)
    {
        console.warn("[desires-echoes-of-creation] tryPf2eDamageRollKeepNew evaluate", err);
        return false;
    }

    /** @type {object[]} */
    const splashJSONs = [];

    for (const instance of newRoll.instances ?? [])
    {
        let splashTotal = 0;

        try
        {
            splashTotal = instance.componentTotal("splash");
        }
        catch (_e)
        {
            continue;
        }

        if (!(splashTotal > 0))
        {
            continue;
        }

        try
        {
            /** @type {any} */
            const splash = await new DamageRoll(`(${splashTotal}[splash])[${instance.type}]`).evaluate({ allowInteractive });
            splash.options.splashOnly = true;
            splashJSONs.push(splash.toJSON());
        }
        catch (err)
        {
            console.warn("[desires-echoes-of-creation] tryPf2eDamageRollKeepNew splash", err);
        }
    }

    const rerollIcon = document.createElement("i");
    rerollIcon.className = "fas fa-dice-d20 reroll-indicator";
    rerollIcon.dataset.tooltip = loc("CONTEXT.ECHO_FRAGMENT_REROLL");
    const newFlavor = `${rerollIcon.outerHTML}${message.flavor ?? ""}`;
    const mergedFlags = foundry.utils.deepClone(message.flags ?? {});
    mergedFlags.pf2e = systemFlags;

    /** @type {any} */
    let messageData;

    try
    {
        messageData = await newRoll.toMessage({
            speaker: message.speaker,
            flavor: newFlavor,
            flags: mergedFlags
        }, { create: false });
    }
    catch (err)
    {
        console.warn("[desires-echoes-of-creation] tryPf2eDamageRollKeepNew toMessage", err);
        return false;
    }

    if (!Array.isArray(messageData.rolls))
    {
        messageData.rolls = [newRoll.toJSON()];
    }

    messageData.rolls.push(...splashJSONs);

    try
    {
        await message.delete({ render: false });
        await ChatMessagePF2e.create(messageData, { rollMode: context.rollMode });
    }
    catch (err)
    {
        console.warn("[desires-echoes-of-creation] tryPf2eDamageRollKeepNew create", err);
        return false;
    }

    Hooks.callAll("pf2e.damageRoll", newRoll);
    return true;
}

/**
 * PF2e core path: same static API as the Hero Point / keep-new context actions
 * ({@code CheckPF2e.rerollFromMessage}), but without spending a hero point.
 *
 * @param {ChatMessage} message
 * @returns {Promise<boolean>} True if PF2e handled the reroll (or a legacy fallback succeeded).
 */
export async function tryPf2eCheckRerollKeepNew(message)
{
    if (!isPf2eCheckRerollContext(message))
    {
        return false;
    }

    /** @type {any} */
    const Check = game.pf2e?.Check;

    if (typeof Check?.rerollFromMessage === "function")
    {
        try
        {
            await Check.rerollFromMessage(message, { heroPoint: false, keep: "new" });
            return true;
        }
        catch (err)
        {
            console.warn("[desires-echoes-of-creation] game.pf2e.Check.rerollFromMessage", err);
        }
    }

    return tryPf2eHeroPointStyleReroll(message);
}

/**
 * Legacy / compatibility path when {@link tryPf2eCheckRerollKeepNew} cannot use {@link game.pf2e.Check}.
 *
 * @param {ChatMessage} message
 * @returns {Promise<boolean>} True if a handler ran without throwing.
 */
export async function tryPf2eHeroPointStyleReroll(message)
{
    /** @type {any} */
    const m = message;

    const instanceNames = [
        "rerollFromHeroPoint",
        "rerollWithHeroPoint",
        "rerollWithHeroPoints",
        "onHeroPointReroll",
        "applyHeroPointReroll"
    ];

    for (const name of instanceNames)
    {
        const fn = m[name];
        if (typeof fn !== "function")
        {
            continue;
        }

        try
        {
            const result = fn.call(m, {});
            if (result instanceof Promise)
            {
                await result;
            }

            return true;
        }
        catch (err)
        {
            console.warn(`[desires-echoes-of-creation] ${name}()`, err);
        }
    }

    /** @type {any} */
    const cls = CONFIG.ChatMessage?.documentClass;
    const staticNames = ["rerollFromHeroPoint", "rerollWithHeroPoint", "rerollWithHeroPoints"];

    for (const name of staticNames)
    {
        const fn = cls?.[name];
        if (typeof fn !== "function")
        {
            continue;
        }

        try
        {
            const result = fn.call(cls, message, {});
            if (result instanceof Promise)
            {
                await result;
            }

            return true;
        }
        catch (err)
        {
            console.warn(`[desires-echoes-of-creation] ${name} static`, err);
        }
    }

    return false;
}

/**
 * @param {ChatMessage} message
 * @returns {string | null}
 */
export function readPf2eOutcome(message)
{
    /** @type {any} */
    const flags = message.flags?.pf2e;
    const direct = flags?.context?.outcome ?? flags?.context?.degreeOfSuccess;
    if (typeof direct === "string")
    {
        return direct;
    }

    return null;
}

/**
 * PF2e check cards bake degree text into {@link ChatMessage#flavor} and {@link foundry.dice.Roll#options.degreeOfSuccess}.
 * Updating flags alone does not refresh the visible result.
 *
 * @param {ChatMessage} message
 * @param {string} oldSlug
 * @param {string} newSlug
 * @param {string} adjustmentTooltip
 * @returns {string}
 */
function patchPf2eCheckFlavorDegreeOneStep(message, oldSlug, newSlug, adjustmentTooltip)
{
    const flavorRaw = message.flavor;
    if (typeof flavorRaw !== "string" || !flavorRaw.includes("target-dc-result"))
    {
        return typeof flavorRaw === "string" ? flavorRaw : "";
    }

    /** @type {any} */
    const dc = message.flags?.pf2e?.context?.dc;
    const scopeRaw = dc?.scope ?? "Check";
    const scopeKey = typeof game.pf2e?.system?.sluggify === "function"
        ? game.pf2e.system.sluggify(String(scopeRaw), { camel: "bactrian" })
        : String(scopeRaw);

    /** @param {string} s */
    const degLoc = (s) => game.i18n.localize(`PF2E.Check.Result.Degree.${scopeKey}.${s}`);

    /** @type {any} */
    const roll0 = message.rolls?.[0];
    const rollTotal = Number(roll0?.total);
    const dcVal = Number(dc?.value);
    const offsetFormatted = Number.isFinite(rollTotal) && Number.isFinite(dcVal)
        ? new Intl.NumberFormat(game.i18n.lang, {
            maximumFractionDigits: 0,
            signDisplay: "always",
            useGrouping: false
        }).format(rollTotal - dcVal)
        : "0";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = flavorRaw;
    const resultEl = wrapper.querySelector(".target-dc-result .result.degree-of-success");
    if (!resultEl)
    {
        return flavorRaw;
    }

    const innerRoot = document.createElement("div");
    innerRoot.innerHTML = game.i18n.format("PF2E.Check.Result.AdjustedLabel", {
        unadjusted: degLoc(oldSlug),
        adjusted: degLoc(newSlug),
        offset: offsetFormatted
    });

    /** @type {any} */
    const TextEditorPF2e = game.pf2e?.TextEditor;
    const vis = game.pf2e?.settings?.metagame?.results !== false;

    if (typeof TextEditorPF2e?.convertXMLNode === "function")
    {
        TextEditorPF2e.convertXMLNode(innerRoot, "unadjusted", { visible: vis, classes: ["unadjusted", oldSlug] });
        TextEditorPF2e.convertXMLNode(innerRoot, "adjusted", {
            visible: vis,
            classes: [newSlug, "adjusted"],
            tooltip: adjustmentTooltip
        });
        TextEditorPF2e.convertXMLNode(innerRoot, "offset", { visible: vis, whose: "opposer" });
        resultEl.innerHTML = innerRoot.innerHTML;
    }
    else
    {
        const esc = foundry.utils.escapeHTML;
        resultEl.innerHTML =
            `Result: <span class="unadjusted ${oldSlug}">${esc(degLoc(oldSlug))}</span> ` +
            `<span class="${newSlug} adjusted" data-tooltip-class="pf2e" data-tooltip="${esc(adjustmentTooltip)}">${esc(degLoc(newSlug))}</span> ` +
            `<span class="offset">by ${esc(offsetFormatted)}</span>`;
    }

    return wrapper.innerHTML;
}

/** @type {Record<string, number>} */
const DEGREE_SLUG_TO_PF2E = {
    criticalFailure: 0,
    failure: 1,
    success: 2,
    criticalSuccess: 3
};

/**
 * @param {string} slug
 * @returns {number | null}
 */
function degreeSlugToPf2eNumber(slug)
{
    const n = DEGREE_SLUG_TO_PF2E[String(slug)];
    return typeof n === "number" ? n : null;
}

/**
 * @param {ChatMessage} message
 * @returns {Promise<boolean>}
 */
export async function tryImproveDegreeOneStep(message)
{
    const full = foundry.utils.duplicate(message.flags ?? {});
    if (!full.pf2e?.context)
    {
        if (debugContextEnabled())
        {
            debugContext("tryImproveDegreeOneStep:no-context", { messageId: message.id });
        }

        return false;
    }

    const oc = full.pf2e.context.outcome;
    /** @type {"success" | "failure" | null} */
    let newSlug = null;
    /** @type {"failure" | "criticalFailure"} */
    let oldSlugForFlavor = "failure";

    if (oc === "failure")
    {
        full.pf2e.context.unadjustedOutcome ??= "failure";
        full.pf2e.context.outcome = "success";
        newSlug = "success";
        oldSlugForFlavor = "failure";
    }
    else if (oc === "criticalFailure")
    {
        full.pf2e.context.unadjustedOutcome ??= "criticalFailure";
        full.pf2e.context.outcome = "failure";
        newSlug = "failure";
        oldSlugForFlavor = "criticalFailure";
    }
    else
    {
        if (debugContextEnabled())
        {
            debugContext("tryImproveDegreeOneStep:skip-outcome", { messageId: message.id, outcome: oc });
        }

        return false;
    }

    const newDeg = degreeSlugToPf2eNumber(newSlug);
    if (newDeg === null)
    {
        return false;
    }

    /** @type {any[]} */
    const rollJsonList = (message.rolls ?? []).map((r) => (typeof r?.toJSON === "function" ? r.toJSON() : r));
    if (rollJsonList[0])
    {
        rollJsonList[0].options = foundry.utils.mergeObject(rollJsonList[0].options ?? {}, {
            degreeOfSuccess: newDeg
        });
    }

    const tooltip = loc("CONTEXT.STEADY_THE_LINE");
    const newFlavor = patchPf2eCheckFlavorDegreeOneStep(message, oldSlugForFlavor, newSlug, tooltip);

    try
    {
        await message.update({
            flags: full,
            flavor: newFlavor || message.flavor,
            rolls: rollJsonList
        });
    }
    catch (errFirst)
    {
        console.warn("[desires-echoes-of-creation] tryImproveDegreeOneStep (with rolls)", errFirst);
        try
        {
            await message.update({
                flags: full,
                flavor: newFlavor || message.flavor
            });
        }
        catch (err)
        {
            console.warn("[desires-echoes-of-creation] tryImproveDegreeOneStep", err);
            if (debugContextEnabled())
            {
                debugContext("tryImproveDegreeOneStep:update-failed", {
                    messageId: message.id,
                    err: String(err)
                });
            }

            return false;
        }
    }

    if (debugContextEnabled())
    {
        debugContext("tryImproveDegreeOneStep:ok", {
            messageId: message.id,
            from: oldSlugForFlavor,
            to: newSlug
        });
    }

    return true;
}
