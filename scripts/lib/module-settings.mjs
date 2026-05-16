/*
--
SDZ
2026-05-06
Registers world settings for item slugs used by Desires Echoes of Creation.
--
*/

import { MODULE_ID, loc } from "./module-constants.mjs";

/** @type {string} */
export const SETTING_BANNER_SLUG = "hellknightBannerSlug";

/** @type {string} */
export const SETTING_ECHO_SLUG = "echoFragmentSlug";

/** Client-only: log chat context menu diagnostics to the browser console. */
export const SETTING_DEBUG_CONTEXT = "debugChatContext";

export function registerModuleSettings()
{
    game.settings.register(MODULE_ID, SETTING_BANNER_SLUG,
    {
        name: loc("SETTINGS.HELLKNIGHT_BANNER_SLUG.NAME"),
        hint: loc("SETTINGS.HELLKNIGHT_BANNER_SLUG.HINT"),
        scope: "world",
        config: true,
        type: String,
        default: "hellknight-banner"
    });

    game.settings.register(MODULE_ID, SETTING_ECHO_SLUG,
    {
        name: loc("SETTINGS.ECHO_FRAGMENT_SLUG.NAME"),
        hint: loc("SETTINGS.ECHO_FRAGMENT_SLUG.HINT"),
        scope: "world",
        config: true,
        type: String,
        default: "echo-fragment"
    });

    game.settings.register(MODULE_ID, SETTING_DEBUG_CONTEXT,
    {
        name: loc("SETTINGS.DEBUG_CHAT_CONTEXT.NAME"),
        hint: loc("SETTINGS.DEBUG_CHAT_CONTEXT.HINT"),
        scope: "client",
        config: true,
        type: Boolean,
        default: false
    });
}

/**
 * @returns {string}
 */
export function getHellknightBannerSlug()
{
    return String(game.settings.get(MODULE_ID, SETTING_BANNER_SLUG));
}

/**
 * @returns {string}
 */
export function getEchoFragmentSlug()
{
    return String(game.settings.get(MODULE_ID, SETTING_ECHO_SLUG));
}
