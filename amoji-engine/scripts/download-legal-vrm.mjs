#!/usr/bin/env node
/**
 * Refresh roster VRM files — one `companion-<id>.vrm` per picker character.
 * Sources: VTubeMe CC-BY, VRoid samples, ToxSam CC0 (see rosterVrmAssets.mjs).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RETIRED_VRM_BASENAMES } from "../engine/companion/companionCharacterMigration.mjs";
import {
  ROSTER_VRM_DOWNLOADS,
  rosterVrmBasename,
  assertRosterDownloadCoverage,
} from "../engine/companion/rosterVrmAssets.mjs";
import { ROSTER_CHARACTER_IDS } from "../engine/companion/companionCharacterRoster.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../../prototypes/assets");
const FORCE = process.env.REFRESH_ROSTER_VRM === "1" || process.env.CI === "true";

assertRosterDownloadCoverage(ROSTER_CHARACTER_IDS);

/**
 * @param {string} destName
 * @param {Buffer} buf
 */
async function writeVrm(destName, buf) {
  const dest = path.join(ASSETS, destName);
  await fs.writeFile(dest, buf);
  console.log("saved", destName, `${Math.round(buf.length / 1024)}KB`);
}

/**
 * @param {{ id: string, url?: string, copyFrom?: string, minBytes?: number }} entry
 */
async function syncRosterEntry(entry) {
  const outName = rosterVrmBasename(entry.id);
  const dest = path.join(ASSETS, outName);
  const minBytes = entry.minBytes ?? 80_000;

  if (!FORCE) {
    try {
      const stat = await fs.stat(dest);
      if (stat.size >= minBytes) {
        console.log("skip (exists)", outName, `${Math.round(stat.size / 1024)}KB`);
        return { id: entry.id, skipped: true };
      }
    } catch {
      /* fetch or copy */
    }
  }

  if (entry.url) {
    console.log("fetch", outName, entry.url);
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`${outName}: HTTP ${res.status} ${entry.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < minBytes) {
      throw new Error(`${outName}: downloaded ${buf.length} bytes (< ${minBytes})`);
    }
    await writeVrm(outName, buf);
    return { id: entry.id, bytes: buf.length };
  }

  if (entry.copyFrom) {
    const src = path.join(ASSETS, entry.copyFrom);
    const buf = await fs.readFile(src);
    if (buf.length < minBytes) {
      throw new Error(`${entry.copyFrom}: only ${buf.length} bytes`);
    }
    await writeVrm(outName, buf);
    console.log("copied", entry.copyFrom, "→", outName);
    return { id: entry.id, copied: entry.copyFrom, bytes: buf.length };
  }

  throw new Error(`roster entry ${entry.id} needs url or copyFrom`);
}

async function pruneRetiredModels() {
  for (const file of RETIRED_VRM_BASENAMES) {
    const dest = path.join(ASSETS, file);
    try {
      await fs.unlink(dest);
      console.log("removed retired", file);
    } catch {
      /* already gone */
    }
    try {
      await fs.unlink(dest.replace(/\.vrm$/, ".README.txt"));
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  await fs.mkdir(ASSETS, { recursive: true });
  await pruneRetiredModels();
  const results = [];
  for (const entry of ROSTER_VRM_DOWNLOADS) {
    results.push(await syncRosterEntry(entry));
  }
  console.log("roster vrm sync done", results.length, "characters");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
