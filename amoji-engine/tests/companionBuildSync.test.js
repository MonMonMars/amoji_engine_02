import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const companionHtml = readFileSync(
  join(root, "prototypes/amoji-companion.html"),
  "utf8",
);

describe("companion build sync", () => {
  it("companion HTML window.__amojiBuild matches buildVersion.mjs", () => {
    expect(companionHtml).toContain(`window.__amojiBuild = "${AMOJI_BUILD}"`);
  });

  it("companion HTML cache-bust ?v= tags match AMOJI_BUILD", () => {
    const tags = companionHtml.match(/\?v=([^"'\s&<>]+)/g) || [];
    expect(tags.length).toBeGreaterThan(10);
    for (const tag of tags) {
      expect(tag).toBe(`?v=${AMOJI_BUILD}`);
    }
  });
});
