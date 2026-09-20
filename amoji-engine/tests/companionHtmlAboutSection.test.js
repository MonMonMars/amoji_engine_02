import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/amoji-companion.html"),
  "utf8",
);

describe("companion HTML about section", () => {
  it("includes About settings card and app about module", () => {
    expect(html).toContain('id="settings-about-build"');
    expect(html).toContain("companionAppAbout.mjs");
    expect(html).toContain('id="settings-fresh-play-link"');
  });
});
