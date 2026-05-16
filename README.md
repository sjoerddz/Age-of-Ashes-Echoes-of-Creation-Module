# Echoes-of-Creation (Foundry module)

Foundry **Pathfinder 2e** module **Desires Echoes of Creation** (`id`: `desires-echoes-of-creation`).

- **Repository:** [github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module](https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module)

## Install in Foundry (Manifest URL)

After `main` is pushed and release **`v0.1.7`** exists (GitHub Actions or manual upload of `desires-echoes-of-creation.zip`), use **Install Module → Manifest URL**:

`https://raw.githubusercontent.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module/main/module.json`

See [PUBLISHING.md](PUBLISHING.md) for tagging, releases, and updating `manifest` / `download`.

## Develop

Requires **Foundry 13** and **PF2e 7.12+** (see `module.json` `compatibility` / `relationships`).

Local zip (same layout as CI): from the repo root run `tools/package-module.ps1` → `dist/desires-echoes-of-creation.zip`. The archive is **Foundry-only**: it omits the entire **`tools/`** tree (CLI, build scripts, `node_modules`) and **`packs/desires-echoes-items-src/`** (JSON sources); it **includes** the compiled LevelDB pack **`packs/desires-echoes-items/`** plus `scripts/`, `lang/`, `assets/`, and `module.json`.

## Compendium and slugs

The module ships **`packs/desires-echoes-items`** (label **Echoes of Creation Items**) with:

- Hellknight Banner — art: `assets/hellknight-banner/conquest.jpg`; **30 ft visual aura**: allies gain **+1 status to saves vs fear** while the bearer carries it openly (PF2e `Aura` + linked effect). **Steady the Line** remains the module chat context action (see in-game item text).
- Echo Fragment — stackable `quantity` for reroll spends (module code decrements `system.quantity`)
- Sovereign Amber (level 4) and **Sovereign Amber, Awakened** (level 8) — art under `assets/sovereign-amber/`
- Effect items for dormant/awakened auras and **Temporal Infusion (Amplified Healing)**

World settings expect these **slugs** by default: `hellknight-banner`, `echo-fragment`. Amber pieces use PF2e-derived slugs `sovereign-amber` and `sovereign-amber-awakened` (from the item names above). Adjust names or use a slug field on the item sheet if your table needs different slugs.

**Authoring:** edit JSON in `packs/desires-echoes-items-src/`, then from the repo root run `npm install --omit=dev` in `tools/fvtt-cli/package` and `node tools/build-eoc-compendium.mjs` to refresh the LevelDB pack in `packs/desires-echoes-items/`.
