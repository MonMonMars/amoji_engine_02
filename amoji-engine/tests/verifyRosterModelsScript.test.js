import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";

const script = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../scripts/verify-roster-models.mjs"),
  "utf8",
);

describe("verify-roster-models.mjs", () => {
  it("samples only current roster character ids", () => {
    const match = script.match(/const ids = (\[[^\]]+\]);/);
    expect(match).toBeTruthy();
    const ids = /** @type {string[]} */ (JSON.parse(match[1].replace(/'/g, '"')));
    for (const id of ids) {
      expect(CHARACTER_IDS).toContain(id);
    }
    expect(ids).not.toContain("rex");
    expect(ids).not.toContain("nana");
  });
});
