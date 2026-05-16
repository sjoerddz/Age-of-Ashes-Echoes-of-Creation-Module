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

- **`.github/workflows/release.yml`** — on every **`v*`** tag push (e.g. `v0.1.0`), GitHub Actions builds **`desires-echoes-of-creation.zip`** whose root folder matches the module `id`, uploads it to a **GitHub Release** for that tag, and prints the exact **`url` / `manifest` / `download`** lines in the job log (copy into `module.json` for that version).
- **`tools/package-module.ps1`** — same zip layout locally → **`dist/desires-echoes-of-creation.zip`** without using Actions.

### One-time (this repo)

**GitHub remote:** [sjoerddz/Echoes-of-Creation](https://github.com/sjoerddz/Echoes-of-Creation) — clone URL `https://github.com/sjoerddz/Echoes-of-Creation.git`.

`module.json` is already wired with:

- **`url`:** `https://github.com/sjoerddz/Echoes-of-Creation`
- **`manifest`:** `https://raw.githubusercontent.com/sjoerddz/Echoes-of-Creation/main/module.json` (tracks `main`; after each release you can switch to tag-pinned raw URLs if you prefer)
- **`download`:** `https://github.com/sjoerddz/Echoes-of-Creation/releases/download/v0.1.0/desires-echoes-of-creation.zip` (exists **after** you push tag `v0.1.0` and the release workflow finishes)

From this project folder on your PC (first push):

```bash
git init
git remote add origin https://github.com/sjoerddz/Echoes-of-Creation.git
git add -A
git commit -m "Initial module"
git branch -M main
git push -u origin main
```

Then push **`v0.1.0`** so Foundry can download the zip (see **Each release** below). Until that release exists, **Manifest URL** install will load the manifest from `main` but fail on the missing zip — either run Actions once or attach `dist/desires-echoes-of-creation.zip` from `tools/package-module.ps1` to a manual `v0.1.0` release.

### Each release

1. Bump **`version`** in `module.json` (must match the tag you are about to use, e.g. `0.1.0` ↔ tag `v0.1.0`).
2. Commit and push `main`, then:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. Open the **Actions** run for that tag → expand **“Print Foundry manifest URLs”** → copy the three URLs into `module.json`, commit, push (optional follow-up commit), or keep them only in the release notes for testers.

4. In Foundry: **Install Module** → **Manifest URL** → paste the **`manifest`** URL → **Install**.

**Critical rule (unchanged):** the zip must unpack to a folder named exactly **`desires-echoes-of-creation/`** — the workflow and PowerShell script enforce that so you do not have to hand-fix GitHub’s default `main` zip layout.

## Official package list (searchable “Install Module” browser)

To appear in the big list (like the modules in your screenshot), you submit the package through Foundry’s publisher / package administration workflow. Requirements and process are described in the **[Publisher Handbook](https://foundryvtt.com/article/publisher-handbook/)** (account, manifest stability, hosting, etc.).

## After publishing

- Keep **`version`**, **`manifest`**, and **`download`** in sync for every release.
- Re-test **`compatibility`** / **`relationships.systems`** when Foundry or PF2e bumps major versions.
