# Publishing “Desires Echoes of Creation” for Foundry

Foundry can install a module in two main ways:

1. **Manifest URL** (bottom of the Install Module window) — Foundry fetches your `module.json` from a **public HTTPS URL**, then downloads the archive from the `download` field in that manifest. You do **not** have to be in the public package list for this.
2. **Package directory** (the searchable list) — requires submitting your package to Foundry’s official directory so it appears for everyone browsing. See the **Publisher Handbook** below.

Official references:

- [Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/) — distribution, listings, and expectations for packages.
- [Introduction to Module Development](https://foundryvtt.com/article/module-development/) — `module.json`, `manifest`, `download`, `url`.
- [Versioning and Releases](https://foundryvtt.com/article/versioning/) — version numbers and release discipline.
- Community guide: [Publishing a Module](https://foundryvtt.wiki/en/development/guides/local-to-repo) — GitHub + zip layout.

## GitHub (Manifest URL installs) — automated zip + release

This repo includes:

- **`.github/workflows/release.yml`** — on every **`v*`** tag push (tag must match the release you are cutting, e.g. `v0.2.0` for `module.json` **`version`** `0.2.0`), GitHub Actions builds **`desires-echoes-of-creation.zip`** whose root folder matches the module `id`, uploads it to a **GitHub Release** for that tag, and prints manifest URL lines in the job log. The staging step **excludes** **`tools/`** and **`packs/desires-echoes-items-src/`** so the zip matches what players need in Foundry.
- **`tools/package-module.ps1`** — same zip layout locally → **`dist/desires-echoes-of-creation.zip`** without using Actions.

### One-time (this repo)

**GitHub remote:** [sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module](https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module) — clone URL `https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module.git`.

`module.json` is already wired with:

- **`socket`:** `true` — GM clients handle permission-sensitive chat updates for caster-paid save rerolls (players request; active GM applies).
- **`url`:** `https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module`
- **`manifest`:** `https://raw.githubusercontent.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module/main/module.json` (tip of `main`; bump **`version`** here on every release so Foundry’s update check knows there is a new build)
- **`download`:** `https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module/releases/latest/download/desires-echoes-of-creation.zip` — GitHub resolves this to the **latest** published release’s asset named **`desires-echoes-of-creation.zip`** ([linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)). Keep that zip name stable in the workflow.

**Discipline:** merge and push the **`version`** bump on `main` **before** (or when) you publish the GitHub Release, so the manifest never advertises a version newer than the zip `releases/latest` actually serves.

From this project folder on your PC (first push):

```bash
git init
git remote add origin https://github.com/sjoerddz/Age-of-Ashes-Echoes-of-Creation-Module.git
git add -A
git commit -m "Initial module"
git branch -M main
git push -u origin main
```

Then push a **version tag** (e.g. **`v0.2.0`**) so Foundry can download the zip (see **Each release** below). Until a matching release exists, **Manifest URL** install will load the manifest from `main` but can fail on the **`download`** zip — either run Actions for that tag or attach `dist/desires-echoes-of-creation.zip` from `tools/package-module.ps1` to a manual GitHub Release for the same tag.

### Each release

1. Bump **`version`** in `module.json` (must match the tag you are about to use, e.g. `0.2.0` ↔ tag `v0.2.0`).
2. Commit and push `main`, then:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Open the **Actions** run for that tag → expand **“Print Foundry manifest URLs”** if you need the tag-pinned **`manifest`** / per-tag **`download`** URLs for notes; day-to-day **`download`** in this repo uses **`releases/latest`** so you usually only commit the **`version`** bump on `main`.

4. In Foundry: **Install Module** → **Manifest URL** → paste the **`manifest`** URL → **Install**.

**Critical rule (unchanged):** the zip must unpack to a folder named exactly **`desires-echoes-of-creation/`** — the workflow and PowerShell script enforce that so you do not have to hand-fix GitHub’s default `main` zip layout.

## Official package list (searchable “Install Module” browser)

To appear in the big list (like the modules in your screenshot), you submit the package through Foundry’s publisher / package administration workflow. Requirements and process are described in the **[Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/)** (account, manifest stability, hosting, etc.).

## After publishing

- Bump **`version`** on `main` for each release so Foundry’s update check sees a new build; **`download`** can stay on **`releases/latest/download/desires-echoes-of-creation.zip`** (no per-tag URL edits).
- Re-test **`compatibility`** / **`relationships.systems`** when Foundry or PF2e bumps major versions.
