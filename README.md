# Desires Echoes of Creation

Pathfinder **2e** helpers for Foundry **v13**, built for the **Echoes of Creation** campaign.

## At a glance

- **Module id:** `desires-echoes-of-creation`
- **Repository:** [sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module](https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module)
- **Verified stack:** Foundry **13.351** / PF2e **7.12.2** (broader ranges and future bumps live in [`module.json`](module.json) under `compatibility` and `relationships`.)

## What it does

- **Steady the Line** — Chat context action for Hellknight Banner–style degree bumps (see compendium item text in-game).
- **Echo Fragment** — Chat context rerolls that spend stack **quantity** on eligible messages.
- **Echoes of Creation Items** — Built-in **Item** compendium: Banner, Echo Fragment, Sovereign Amber (dormant and awakened), aura / **Temporal Infusion** effect items, and art under [`assets/`](assets/).

World defaults expect item **slugs** `hellknight-banner` and `echo-fragment`; amber pieces use `sovereign-amber` and `sovereign-amber-awakened`. Change names or slugs on the sheet if your table uses different conventions.

## Install (manifest URL)

Use **Install Module → Manifest URL** with:

**[Manifest (raw `module.json` on `main`)](https://raw.githubusercontent.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module/main/module.json)**

```
https://raw.githubusercontent.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module/main/module.json
```

**Before install works,** GitHub must host a **release** whose tag matches `module.json`: tag **`v` + `version`** (example: version `0.1.9` → tag `v0.1.9`) and release asset **`desires-echoes-of-creation.zip`**. Push tag `v*` to run the [release workflow](.github/workflows/release.yml), or upload the zip manually. Full procedure: [PUBLISHING.md](PUBLISHING.md).

### If install fails

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| **Not Found** on the zip URL | No release for that version, or wrong repo in an old manifest | Open the `download` URL from [module.json](module.json) in a browser; create/fix the GitHub Release until it downloads. |
| Wrong/old `github.com/.../Echoes-of-Creation/...` in the error | Stale manifest or old install | Remove the module in Foundry, install again with the **manifest URL** above. |
| Version stuck after an update | Foundry cached an older manifest | Bump `version` in `module.json`, publish a matching release, reinstall from manifest. |

## Compendium notes

**Hellknight Banner** — Art: `assets/hellknight-banner/conquest.jpg`. **30 ft** visual aura: allies **+1 status to saves vs. fear** while the bearer carries the banner openly (PF2e **Aura** + linked effect). **Steady the Line** remains the module chat action.

**Echo Fragment** — Stackable `quantity`; module code decrements `system.quantity` when you spend a reroll.

**Sovereign Amber** (level 4) and **Sovereign Amber, Awakened** (level 8) — Art: `assets/sovereign-amber/`. Linked effect items cover dormant/awakened auras and **Temporal Infusion (Amplified Healing)**.

## Development

- **Packaging (Windows):** From repo root, `tools/package-module.ps1` → `dist/desires-echoes-of-creation.zip` (same layout as CI). The zip omits **`tools/`** and **`packs/desires-echoes-items-src/`**; it ships **`packs/desires-echoes-items/`** (compiled pack), `scripts/`, `lang/`, `assets/`, and `module.json`.
- **Rebuild the compendium:** Edit JSON in `packs/desires-echoes-items-src/`, then `npm install --omit=dev` in `tools/fvtt-cli/package` and `node tools/build-eoc-compendium.mjs` from repo root.

Planning and deeper implementation notes: [ROADMAP.md](ROADMAP.md).

## References

- [Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/) · [Module development](https://foundryvtt.com/article/module-development/) · [Versioning](https://foundryvtt.com/article/versioning/)
- This repo: [PUBLISHING.md](PUBLISHING.md) (tags, `manifest`, `download`, CI).
- **License:** [MIT](LICENSE) for module source and original assets in this package. *Pathfinder* and related marks are trademarks of **Paizo Inc.**; this module is not published by or affiliated with Paizo. Use Paizo/community programs (e.g. Community Use Policy) where applicable for any Paizo-derived content you distribute.
