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

  it("settles into planted rest after avatar load instead of a VRMA wave", () => {
    expect(html).toMatch(/avatar\?\.stopAction\?/);
    expect(html).toMatch(/bootIdleMotionIds/);
    expect(html).not.toMatch(
      /playAction\?\.\("wave",\s*\{\s*emotion:\s*currentEmotion \|\| "happy"/,
    );
    expect(html).not.toMatch(
      /playActionSequence\(idleIds,\s*\{\s*emotion:[\s\S]*loopSequence:\s*true/,
    );
    expect(html).not.toMatch(
      /\.finally\(\(\) => \{\s*hideAvatarLoadPill\(\);\s*avatar\?\.stopAction/,
    );
  });

  it("streams full sentences as single utterances and keeps the last talking face", () => {
    expect(html).toMatch(/singleUtterance:\s*true/);
    expect(html).not.toMatch(/expressiveClauses:\s*true/);
    expect(html).not.toMatch(
      /if \(!avatar\.currentAction\) \{\s*avatar\.setEmotion\("neutral"\)/,
    );
  });
});
