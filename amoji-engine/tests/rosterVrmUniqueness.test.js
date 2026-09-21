import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";
import { rosterVrmBasename } from "../engine/companion/rosterVrmAssets.mjs";

const assetsDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../prototypes/assets",
);

/** Pairs that intentionally share the same mesh bytes (legacy alias slots). */
const ALLOWED_DUPLICATE_GROUPS = [];

function md5File(path) {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

describe("roster VRM files on disk", () => {
  it("every roster id has a companion-<id>.vrm asset", () => {
    const missing = [];
    for (const id of CHARACTER_IDS) {
      const base = rosterVrmBasename(id);
      const path = join(assetsDir, base);
      if (!existsSync(path)) missing.push(id);
    }
    expect(missing, `missing VRM: ${missing.join(", ")}`).toEqual([]);
  });

  it("duplicate mesh hashes only occur in documented alias groups", () => {
    /** @type {Map<string, string[]>} */
    const byHash = new Map();
    for (const id of CHARACTER_IDS) {
      const path = join(assetsDir, rosterVrmBasename(id));
      if (!existsSync(path)) continue;
      const hash = md5File(path);
      const list = byHash.get(hash) || [];
      list.push(id);
      byHash.set(hash, list);
    }

    const allowedSets = ALLOWED_DUPLICATE_GROUPS.map((g) => [...g].sort().join("|"));

    for (const ids of byHash.values()) {
      if (ids.length <= 1) continue;
      const key = [...ids].sort().join("|");
      expect(
        allowedSets.includes(key),
        `unexpected duplicate VRM hash for ids: ${ids.join(", ")}`,
      ).toBe(true);
    }
  });
});
