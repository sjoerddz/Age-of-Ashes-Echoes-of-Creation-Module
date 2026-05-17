/*
--
SDZ
2026-05-06
Registers PF2e chat message context menu entries for this module.
--
*/

import { debugContext, logClientDebugSettingChange } from "../lib/module-debug.mjs";
import { createCasterSaveEchoMenuEntry } from "./caster-save-reroll-context.mjs";
import { createEchoFragmentMenuEntry } from "./echo-fragment-context.mjs";
import { createSteadyTheLineMenuEntry } from "./steady-the-line-context.mjs";

/**
 * @param {unknown[]} menuItems
 */
function ensureDeocChatMenuEntries(menuItems)
{
    if (!Array.isArray(menuItems))
    {
        return;
    }

    const seen = new Set(menuItems.map((e) => e && e._deocId).filter(Boolean));

    if (!seen.has("steady-the-line"))
    {
        menuItems.push(createSteadyTheLineMenuEntry());
    }

    if (!seen.has("echo-fragment"))
    {
        menuItems.push(createEchoFragmentMenuEntry());
    }

    if (!seen.has("caster-save-echo"))
    {
        menuItems.push(createCasterSaveEchoMenuEntry());
    }
}

/**
 * @param {string} hookLabel
 * @param {unknown} application
 * @param {unknown[]} menuItems
 */
function onChatMenuHook(hookLabel, application, menuItems)
{
    if (!Array.isArray(menuItems))
    {
        debugContext(`hook:${hookLabel}:invalid-menu`, {
            menuType: menuItems?.constructor?.name ?? typeof menuItems
        });
        return;
    }

    const nBefore = menuItems.length;
    ensureDeocChatMenuEntries(menuItems);
    debugContext(`hook:${hookLabel}`, {
        appId: application?.id ?? application?.constructor?.name ?? null,
        menuCountBefore: nBefore,
        menuCountAfter: menuItems.length
    });
}

function installChatLogPrototypePatch(/** @type {{ phase: string }} */ opts)
{
    /** @type {any} */
    const Cls = CONFIG.ui.chat;
    /** @type {any} */
    let proto = Cls?.prototype;

    if (!proto || typeof proto._getEntryContextOptions !== "function")
    {
        const chat = ui.chat;
        if (chat && typeof chat === "object")
        {
            proto = Object.getPrototypeOf(chat);
        }
    }

    /** @type {any} */
    const current = proto?._getEntryContextOptions;
    if (typeof current !== "function")
    {
        debugContext("patch:chat-log:skip", {
            phase: opts.phase,
            reason: !Cls ? "no-CONFIG.ui.chat" : "no-_getEntryContextOptions"
        });
        return;
    }

    if (current.__deocPatched)
    {
        debugContext("patch:chat-log:skip", { phase: opts.phase, reason: "already-patched" });
        return;
    }

    const original = current;
    proto._getEntryContextOptions = function deocPatchedGetEntryContextOptions()
    {
        const options = original.call(this);
        ensureDeocChatMenuEntries(options);
        debugContext("patch:_getEntryContextOptions", {
            chatClass: this.constructor?.name,
            optionCount: Array.isArray(options) ? options.length : null
        });
        return options;
    };
    proto._getEntryContextOptions.__deocPatched = true;

    debugContext("patch:chat-log:installed", {
        phase: opts.phase,
        chatClass: Cls?.name ?? proto?.constructor?.name
    });
}

/**
 * Run during {@link Hooks}.once("init") after PF2e sets {@link CONFIG.ui.chat} so
 * {@link foundry.applications.ux.ContextMenu} binds the wrapped {@link ChatLog#_getEntryContextOptions}.
 * Patching only in {@link Hooks}.once("ready") is too late: the sidebar has already captured the original method.
 */
export function installChatLogContextPrototypePatchEarly()
{
    installChatLogPrototypePatch({ phase: "init" });
}

export function registerDesiresEchoesChatContext()
{
    Hooks.on("clientSettingChanged", (key, value) =>
    {
        logClientDebugSettingChange(key, value);
    });

    Hooks.on("getChatMessageContextOptions", (application, menuItems) =>
    {
        onChatMenuHook("getChatMessageContextOptions", application, menuItems);
    });

    /** @see Foundry v11–12 chat log sidebar (some forks / compatibility paths still emit this). */
    Hooks.on("getChatLogEntryContext", (html, data) =>
    {
        const menuItems = Array.isArray(data) ? data : null;
        if (!menuItems)
        {
            debugContext("hook:getChatLogEntryContext:skip", {
                htmlType: html?.constructor?.name ?? typeof html,
                dataIsArray: Array.isArray(data)
            });
            return;
        }

        onChatMenuHook("getChatLogEntryContext", html, menuItems);
    });

    /**
     * Fallback when {@link CONFIG.ui.chat} was not ready during init (nonstandard load order).
     */
    installChatLogPrototypePatch({ phase: "ready" });
}