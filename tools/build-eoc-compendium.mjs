/*
--
SDZ
2026-05-16
Compile JSON sources under packs/desires-echoes-items-src into a LevelDB compendium at packs/desires-echoes-items using the official Foundry CLI library (classic-level).
Run from repo root: node tools/build-eoc-compendium.mjs
Prerequisite: npm install --omit=dev in tools/fvtt-cli/package
--
*/

import path from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "./fvtt-cli/package/lib/package.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const srcDir = path.join(repoRoot, "packs", "desires-echoes-items-src");
const packDir = path.join(repoRoot, "packs", "desires-echoes-items");

await compilePack(srcDir, packDir, { log: true, recursive: true });
console.log(`Packed compendium -> ${packDir}`);
