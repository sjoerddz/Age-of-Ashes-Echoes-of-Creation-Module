/*
--
SDZ
2026-05-06
Bootstrap entry for the Desires Echoes of Creation Foundry module (PF2e, Foundry v13+).
--
*/

import { installChatLogContextPrototypePatchEarly, registerDesiresEchoesChatContext } from "./features/register-chat-context.mjs";
import { loc } from "./lib/module-constants.mjs";
import { registerCasterSaveGmSocket } from "./lib/caster-save-gm-socket.mjs";
import { logDebugContextArmedIfEnabled } from "./lib/module-debug.mjs";
import { registerModuleSettings } from "./lib/module-settings.mjs";

Hooks.once("init", () =>
{
    if (game.system?.id !== "pf2e")
    {
        return;
    }

    registerModuleSettings();
    installChatLogContextPrototypePatchEarly();
});

Hooks.once("ready", () =>
{
    if (game.system?.id !== "pf2e")
    {
        ui.notifications?.warn(loc("WARN.PF2E_ONLY"));
        return;
    }

    registerDesiresEchoesChatContext();
    registerCasterSaveGmSocket();
    logDebugContextArmedIfEnabled();
});
