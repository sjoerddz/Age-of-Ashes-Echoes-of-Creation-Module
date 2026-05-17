# Desires Echoes of Creation — roadmap

**Last updated:** 2026-05-17

This document tracks planned and in-progress module work. Implementation details belong in code and, for larger features, in `docs/superpowers/specs/` design notes once requirements are frozen.

---

## Current baseline (implementation)

- **Foundry 13**, **PF2e 7.12+** (see `module.json`).
- **Chat context menus** are wired via an early `ChatLog` prototype patch so PF2e’s `_getEntryContextOptions` stays wrapped (see `scripts/features/register-chat-context.mjs`).
- **Echo Fragment (roller-owned)** — context action on eligible chat cards: spends stack quantity, rerolls **checks/attacks** through `game.pf2e.Check.rerollFromMessage`, and **damage** through a custom `DamageRoll` path (`scripts/lib/pf2e-reroll.mjs`).
- **Echo Fragment (caster-paid saves)** — separate context entry (`scripts/features/caster-save-reroll-context.mjs`): spell **caster** pays; **standalone** saving-throw cards get in-place reroll (`tryPf2eStandaloneSavingThrowRerollKeepNewManual`); **PF2e Toolbelt** spell cards use embedded `saveVariants` (multi-target **dialog** to pick a row). **Module socket** (`scripts/lib/caster-save-gm-socket.mjs`) lets the **active GM** apply chat updates when the player lacks permission.
- **Steady the Line** — separate context entry for Hellknight Banner–style degree bumps (`scripts/features/steady-the-line-context.mjs`).
- **Compendium** — items/effects under `packs/desires-echoes-items` (see `README.md`).

---

## Next ideas (not committed)

- Further Echoes-of-Creation item hooks, aura automation, or UX polish — track here as needed.

---

## Completed (reference)

- Caster-paid save rerolls (Toolbelt + standalone), GM socket bridge, multi-target picker; see **0.2.0** / `module.json`.
- Echo Fragment check + damage reroll pipeline and chat menu wiring stable for roller-owned cards.
- Steady the Line context action.
- LevelDB pack build pipeline and module packaging documented in `README.md` / `PUBLISHING.md`.
