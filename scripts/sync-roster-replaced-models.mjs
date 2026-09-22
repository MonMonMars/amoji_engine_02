#!/usr/bin/env node
/**
 * Force-download VRM + card PNG for roster slots replaced in v522 (not #1–11, not #29).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROSTER_REPLACED_VRM_SOURCES } from "../amoji-engine/engine/companion/companionRosterModelRefreshV522.mjs";
import { rosterVrmBasename } from "../amoji-engine/engine/companion/rosterVrmAssets.mjs";

const assets = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../prototypes/assets",
);

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  for (const [id, meta] of Object.entries(ROSTER_REPLACED_VRM_SOURCES)) {
    const vrmName = rosterVrmBasename(id);
    const vrmBuf = await fetchBuf(meta.vrmUrl);
    if (vrmBuf.length < 80_000) {
      throw new Error(`${id}: VRM too small (${vrmBuf.length} bytes)`);
    }
    await fs.writeFile(path.join(assets, vrmName), vrmBuf);
    console.log("vrm", id, vrmName, `${Math.round(vrmBuf.length / 1024)}KB`, meta.sourceName);

    if (meta.thumbUrl) {
      const pngName = `companion-char-${id}.png`;
      const pngBuf = await fetchBuf(meta.thumbUrl);
      await fs.writeFile(path.join(assets, pngName), pngBuf);
      console.log("png", pngName, `${Math.round(pngBuf.length / 1024)}KB`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
