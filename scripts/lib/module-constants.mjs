/*
--
SDZ
2026-05-06
Shared module id and localization helper for Desires Echoes of Creation.
--
*/

/** @type {string} */
export const MODULE_ID = "desires-echoes-of-creation";

/**
 * @param {string} key Path under the module namespace in lang/en.json (e.g. "CONTEXT.STEADY_THE_LINE").
 * @returns {string}
 */
export function loc(key)
{
    return game.i18n.localize(`${MODULE_ID}.${key}`);
}
