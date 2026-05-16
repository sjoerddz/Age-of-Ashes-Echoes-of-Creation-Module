# Desires Echoes of Creation — roadmap

**Last updated:** 2026-05-16

This document tracks planned and in-progress module work. Implementation details belong in code and, for larger features, in `docs/superpowers/specs/` design notes once requirements are frozen.

---

## Current baseline (implementation)

- **Foundry 13**, **PF2e 7.12+** (see `module.json`).
- **Chat context menus** are wired via an early `ChatLog` prototype patch so PF2e’s `_getEntryContextOptions` stays wrapped (see `scripts/features/register-chat-context.mjs`).
- **Echo Fragment** — context action on eligible chat cards: spends stack quantity, rerolls **checks/attacks** through `game.pf2e.Check.rerollFromMessage`, and **damage** through a custom `DamageRoll` path (`scripts/lib/pf2e-reroll.mjs`).
- **Steady the Line** — separate context entry for Hellknight Banner–style degree bumps (`scripts/features/steady-the-line-context.mjs`).
- **Compendium** — items/effects under `packs/desires-echoes-items` (see `README.md`).

---

## Next feature: Caster reroll — target’s save vs caster’s spell

### Goal

Allow the **spell’s caster** (controlling user) to trigger a **reroll of the saving throw** that a **targeted token** rolled in response to **that caster’s spell**, using table rules analogous to existing Echo Fragment rerolls (inventory spend, chat UX, permissions).

### Why this is non-trivial

- Echo rerolls today assume the **roller** owns the roll message (`isOwnPlayerRollMessage` and fragment lookup on the roller’s actors).
- A **save** on a spell is usually rolled by the **target’s** player (or GM for NPCs), but the **narrative spend** may be owned by the **caster** (Echo Fragment on the wizard, not the goblin).
- PF2e chat cards tie context to **speaker**, **origin**, **target**, **item/spell**, and roll type; we must define **which message** is rerolled and **who** may pay the cost without opening exploits (arbitrary reroll of others’ saves).

### Success criteria (draft)

1. From the **save roll chat card** (or an unambiguous related card), an eligible user sees a module context action (name TBD; may reuse Echo Fragment or a dedicated setting).
2. The reroll **only** applies when the message can be **unambiguously tied** (via PF2e chat flags / speaker metadata) to a specific spell usage and target (see *Binding* below).
3. **Cost** is deducted from the correct actor (caster vs target — product decision).
4. **Permissions**: only the caster’s controlling user (and GM) can invoke; target player cannot burn caster fragments for unrelated spells.
5. Behavior matches PF2e expectations where possible: use `Check.rerollFromMessage` when valid, or a small custom path if PF2e excludes that context (mirror damage-roll lesson).

### Binding (authorization model) — options to decide

| Approach | Idea | Pros | Risks |
|----------|------|------|--------|
| **A. Strict origin match** | Save message `flags.pf2e` must reference origin actor/same `casting` / spell identity the caster owns; menu only for `game.user` that owns caster | Minimal trust surface | Requires verifying PF2e always encodes enough data on save messages |
| **B. Linked message IDs** | Caster’s spell card stores save `messageId`s; save stores reverse link | Very explicit | Fragile if messages deleted; more state |
| **C. GM-only / relax** | Allow GM to reroll any save with cost | Simple | Not the stated “caster” feature |

**Recommendation:** Start with **A**, validated against real chat message JSON from spell → save flow in PF2e 7.12+; add **B** only if A is insufficient.

### UX / rules (open product questions)

Record answers here as the table decides:

- **Cost item:** Same Echo Fragment consumable, a new item, or spell-specific frequency?
- **Who holds the item:** Caster’s inventory (expected) vs target?
- **Keep policy:** Always “keep new” like current Echo check reroll, or choice?
- **Targets:** PC saves only, or NPC saves rolled by GM too?
- **Multi-target spells:** One fragment per save reroll vs once per spell?

### Technical phases

**Phase 0 — Research (read-only)**

- Capture 2–3 real chat message payloads in Foundry: (1) spell attack/cast card, (2) resulting save card.
- Document `flags.pf2e.context.type`, `origin`, `target`, `casting`, `rollActorId` / speaker, and whether `Check.rerollFromMessage` accepts that context.

**Phase 1 — Design note**

- Move frozen requirements into `docs/superpowers/specs/YYYY-MM-DD-caster-save-reroll-design.md` (per brainstorming workflow) with exact predicates and failure notifications.

**Phase 2 — Implementation sketch**

- `actor-helpers.mjs` — helpers: `getSpellCasterFromSaveMessage(message)`, `canUserInvokeCasterSaveReroll(message, user)` (names indicative).
- New feature module (e.g. `caster-save-reroll-context.mjs`) or extend echo module with a **separate menu id** and condition/callback.
- Reroll execution — prefer `tryPf2eCheckRerollKeepNew`-style wrapper; fallback only if PF2e no-ops.
- Settings — slug / enable toggle if not reusing Echo Fragment.
- `lang/en.json` — strings for menu label, warnings, invalid card.

**Phase 3 — QA**

- Two clients: caster + target player; blind roll; GM rolls NPC save; negate/redirect edge cases if any.

### Dependencies / risks

- PF2e internal message shape may change between minors — keep predicates version-commented.
- Must not regress existing Echo Fragment behavior on attack/damage/skill cards.

### After this feature

- (Placeholder) Further Echoes-of-Creation item hooks, aura automation, or publishing — track in sections below as needed.

---

## Completed (reference)

- Echo Fragment check + damage reroll pipeline and chat menu wiring stable for roller-owned cards.
- Steady the Line context action.
- LevelDB pack build pipeline and module packaging documented in `README.md` / `PUBLISHING.md`.
