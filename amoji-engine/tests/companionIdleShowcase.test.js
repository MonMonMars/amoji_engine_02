import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const grokCss = readFileSync(join(root, "prototypes/companion-grok-ani.css"), "utf8");

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

  it("resets camera on talk start once and on empty double-tap or dblclick", () => {
    expect(html).toMatch(/talkingCameraLatched/);
    expect(html).toMatch(/lastCanvasTapAt < 500/);
    expect(html).toMatch(/if \(on && !talkingCameraLatched\)/);
    expect(html).toMatch(/addEventListener\("dblclick"/);
    expect(html).toMatch(/tryResetCameraFromEmptyHit/);
  });

  it("keeps conversation captions above toasts", () => {
    expect(html).toMatch(/\.chat-shell \{[\s\S]*z-index:\s*90/);
    expect(html).toMatch(/\.companion-toast \{[\s\S]*z-index:\s*70/);
    expect(html).toMatch(/z-index:\s*95;/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.chat-shell \{[\s\S]*z-index:\s*90/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.companion-toast \{[\s\S]*z-index:\s*70/);
  });

  it("drives the chip mini emotion ball from mouth and mic volume", () => {
    expect(html).toMatch(/syncMiniEmotionBall\(statusDot/);
    expect(html).toMatch(
      /const syncEmotionBall = \(\) => \{[\s\S]*syncMiniEmotionBall\(statusDot/,
    );
    expect(html).toMatch(
      /onMicLevel: \(\{ level, rms \} = \{\}\) => \{[\s\S]*emotionBallLevel = Math\.max/,
    );
  });
});
