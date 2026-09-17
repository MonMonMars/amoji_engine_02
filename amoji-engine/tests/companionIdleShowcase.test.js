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

  it("resets camera on talk start once and on empty double-click, not orbit taps", () => {
    expect(html).toContain("createEmptyAreaCameraReset");
    expect(html).toContain("shouldResetCameraOnTalkStart");
    expect(html).toMatch(/talkingCameraLatched/);
    expect(html).toMatch(/emptyAreaCameraReset\.onDblClick/);
    expect(html).not.toMatch(/lastCanvasTapAt < 500/);
    expect(html).not.toMatch(/tryResetCameraFromEmptyHit/);
  });

  it("keeps conversation captions on the top chrome layer", () => {
    expect(html).not.toMatch(/\.chat-shell\s*\{[^}]*z-index:\s*90/);
    expect(html).not.toMatch(/\.chat-shell\s*\{[^}]*isolation:\s*isolate/);
    expect(html).toMatch(/\.chat-column \{[\s\S]*?z-index:\s*10050/);
    expect(html).toMatch(/\.transcript \{[\s\S]*?z-index:\s*10050/);
    expect(html).toMatch(
      /body\.conversation-ui \.transcript \.msg-row \{[\s\S]*?z-index:\s*10051/,
    );
    expect(html).toMatch(
      /createCompanionProgressDock\(\{\s*root:\s*document\.querySelector\("\.stage"\)/,
    );
    expect(html).toMatch(
      /createCompanionTreatDock\(\{[\s\S]*?root:\s*document\.querySelector\("\.stage"\)/,
    );
    expect(html).toMatch(/\.companion-toast \{[\s\S]*?z-index:\s*70/);
    expect(html).toMatch(/\.treat-dock \{[\s\S]*?z-index:\s*40/);
    expect(html).toMatch(/\.companion-progress-dock \{[\s\S]*?z-index:\s*9000/);
    expect(html).toMatch(/\.treat-sheet \{[\s\S]*?z-index:\s*11003/);
    expect(html).toMatch(/const host = document\.querySelector\("\.stage"\) \|\| document\.body/);
    expect(grokCss).not.toMatch(/\.theme-grok-ani \.chat-shell\s*\{[^}]*z-index:\s*90/);
    expect(grokCss).not.toMatch(/\.theme-grok-ani \.chat-shell\s*\{[^}]*isolation:\s*isolate/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.chat-column,[\s\S]*?z-index:\s*10050/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.msg-row\s*\{[\s\S]*?z-index:\s*10051/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.companion-toast \{[\s\S]*?z-index:\s*70/);
  });

  it("drives the chip mini emotion ball from mouth and mic volume", () => {
    expect(html).toContain("createMiniEmotionBall");
    expect(html).toMatch(/createMiniEmotionBall\(statusDot\)/);
    expect(html).toMatch(
      /const syncEmotionBall = \(\) => \{[\s\S]*miniEmotionBall\.sync\(/,
    );
    expect(html).toMatch(
      /onMicLevel: \(\{ level, rms \} = \{\}\) => \{[\s\S]*emotionBallLevel = Math\.max/,
    );
    expect(html).toMatch(
      /onMouth: \(open, shape\) => \{[\s\S]*miniEmotionBall\.sync\(|emotionBallLevel = open/,
    );
    expect(grokCss).toContain("companion-chip__dot-canvas");
    expect(grokCss).not.toMatch(/animation:\s*miniBallGlow/);
    expect(grokCss).not.toMatch(/animation:\s*miniBallIdle/);
  });
});
