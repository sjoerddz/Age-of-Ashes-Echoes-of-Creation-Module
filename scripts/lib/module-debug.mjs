///SDZ
///2026-05-16
///Opt-in client logging for chat context menu diagnostics (Echo Fragment / Steady the Line).

import { MODULE_ID } from "./module-constants.mjs";
import { SETTING_DEBUG_CONTEXT } from "./module-settings.mjs";

/** @type {string} */
const PREFIX = "[desires-echoes-of-creation][context]";

/**
 * @returns {boolean}
 */
export function debugContextEnabled()
{
    try
    {
        return game.settings?.get(MODULE_ID, SETTING_DEBUG_CONTEXT) === true;
    }
    catch
    {
        return false;
    }
}

/**
 * @param {string} label
 * @param {Record<string, unknown>} data
 */
export function debugContext(label, data)
{
    if (!debugContextEnabled())
    {
        return;
    }

    console.log(PREFIX, label, data);
}

/**
 * Call from {@link Hooks}.once("ready") after registering chat hooks so you can confirm
 * the client setting is read (toggle debug, reload, then check console for this line).
 */
export function logDebugContextArmedIfEnabled()
{
    try
    {
        if (game.settings.get(MODULE_ID, SETTING_DEBUG_CONTEXT) !== true)
        {
            return;
        }

        console.warn(
            `${PREFIX} Debug is ON. Right-click a chat line — you should see hook:* logs. ` +
                "If nothing appears, use Foundry → **Help** → **Toggle Developer Tools** (Electron) or your browser F12. " +
                `Also ensure module is ${MODULE_ID} and PF2e is the active system.`
        );
    }
    catch (err)
    {
        console.warn(`${PREFIX} Could not read debug setting`, err);
    }
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function logClientDebugSettingChange(key, value)
{
    if (typeof key !== "string")
    {
        return;
    }

    if (!key.includes(SETTING_DEBUG_CONTEXT))
    {
        return;
    }

    console.warn(`${PREFIX} Setting changed`, { key, value });
}
