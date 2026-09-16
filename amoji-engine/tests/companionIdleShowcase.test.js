import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/amoji-companion.html"),
  "utf8",
);

describe("idle showcase wiring", () => {
  it("starts idle wait without TTS so speaking cannot freeze motion", () => {
    expect(html).toContain("canStartIdleShowcase");
    expect(html).toMatch(
      /waitAct\?\.start\(\{\s*kind:\s*"idle",\s*phase:\s*"idle",\s*speak:\s*false,/,
    );
    expect(html).not.toMatch(
      /kind:\s*"idle",\s*phase:\s*"idle",\s*speak:\s*true/,
    );
  });

  it("does not wait for voice.speaking to drop before starting idle motion", () => {
    expect(html).toMatch(
      /const canStartIdleShowcase = \(\) => canIdleShowcase\(\);/,
    );
  });

  it("plays a wave after avatar load instead of stopping all motion", () => {
    expect(html).toMatch(/playAction\?\.\("wave"/);
    expect(html).not.toMatch(
      /\.finally\(\(\) => \{\s*hideAvatarLoadPill\(\);\s*avatar\?\.stopAction/,
    );
  });
});
