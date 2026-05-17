/*
--
SDZ
2026-05-17
When a spell-cast chat card has multiple PF2e Toolbelt embedded saves, prompt which target row to Echo-reroll (keep new).
--
*/

import { loc } from "./module-constants.mjs";

/**
 * @typedef {{ variantKey: string, tokenId: string, variant: any, entry: any, label: string }} ToolbeltSavePick
 */

/**
 * @param {ToolbeltSavePick[]} picks
 * @returns {Promise<ToolbeltSavePick | null>}
 */
export function selectToolbeltSavePickWithDialog(picks)
{
    if (!Array.isArray(picks) || picks.length === 0)
    {
        return Promise.resolve(null);
    }

    if (picks.length === 1)
    {
        return Promise.resolve(picks[0]);
    }

    return new Promise((resolve) =>
    {
        let settled = false;

        /**
         * @param {ToolbeltSavePick | null} v
         */
        const finish = (v) =>
        {
            if (settled)
            {
                return;
            }

            settled = true;
            resolve(v);
        };

        /** @type {any} */
        const picksAny = picks;

        const optionsHtml = picksAny
            .map((/** @type {ToolbeltSavePick} */ p, i) =>
            {
                const deg = p.entry?.success != null ? String(p.entry.success) : "?";
                const val = p.entry?.value != null ? String(p.entry.value) : "?";
                const line = `${p.label} — ${deg} (${val})`;
                return `<option value="${i}">${foundry.utils.escapeHTML(line)}</option>`;
            })
            .join("");

        const hint = foundry.utils.escapeHTML(loc("DIALOG.TOOLBELT_PICK_SAVE_HINT"));
        const selectLabel = foundry.utils.escapeHTML(loc("DIALOG.TOOLBELT_PICK_SAVE_SELECT"));

        const content =
            `<form>` +
            `<p class="notes">${hint}</p>` +
            `<div class="form-group">` +
            `<label>${selectLabel}</label>` +
            `<select name="targetIdx" style="width:100%">${optionsHtml}</select>` +
            `</div>` +
            `</form>`;

        new Dialog({
            title: loc("DIALOG.TOOLBELT_PICK_SAVE_TITLE"),
            content,
            buttons: {
                reroll: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: loc("DIALOG.TOOLBELT_PICK_SAVE_CONFIRM"),
                    callback: (html) =>
                    {
                        const raw = html.find('[name="targetIdx"]').val();
                        const idx = Number(raw);

                        finish(Number.isFinite(idx) ? picks[idx] ?? null : null);
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: loc("DIALOG.TOOLBELT_PICK_SAVE_CANCEL"),
                    callback: () =>
                    {
                        finish(null);
                    }
                }
            },
            default: "cancel",
            close: () =>
            {
                finish(null);
            }
        }).render(true);
    });
}
