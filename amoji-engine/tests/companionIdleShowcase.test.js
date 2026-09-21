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

  it("uses expressive clause TTS and keeps the last talking face", () => {
    expect(html).not.toMatch(/singleUtterance:\s*true/);
    expect(html).not.toMatch(/settings-btn-voice/);
    expect(html).toContain("settings-voice-note");
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
    expect(html).toMatch(/\.chat-shell \{[\s\S]*?z-index:\s*10050/);
    expect(html).toMatch(/\.chat-column \{[\s\S]*?z-index:\s*1/);
    expect(html).toMatch(/\.transcript \{[\s\S]*?z-index:\s*2/);
    expect(html).toMatch(
      /body\.conversation-ui \.transcript \.msg-row \{[\s\S]*?z-index:\s*1/,
    );
    expect(html).toMatch(
      /createCompanionProgressDock\(\{\s*root:\s*document\.body/,
    );
    expect(html).toMatch(
      /createCompanionTreatDock\(\{[\s\S]*?root:\s*careRoot/,
    );
    expect(html).toMatch(/\.companion-toast \{[\s\S]*?z-index:\s*70/);
    expect(html).toMatch(/\.treat-dock \{[\s\S]*?z-index:\s*40/);
    expect(html).toMatch(/\.companion-progress-dock \{[\s\S]*?z-index:\s*9000/);
    expect(html).toMatch(/\.treat-sheet \{[\s\S]*?z-index:\s*11025/);
    expect(html).toMatch(/\.care-tools-stack \{[\s\S]*?z-index:\s*11020/);
    expect(html).toMatch(/const host = document\.querySelector\("\.stage"\) \|\| document\.body/);
    expect(grokCss).not.toMatch(/\.theme-grok-ani \.chat-shell\s*\{[^}]*z-index:\s*90/);
    expect(grokCss).not.toMatch(/\.theme-grok-ani \.chat-shell\s*\{[^}]*isolation:\s*isolate/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.chat-shell \{[\s\S]*?z-index:\s*10050/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.transcript \{[\s\S]*?z-index:\s*2/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.msg-row\s*\{[\s\S]*?z-index:\s*10051/);
    expect(grokCss).toMatch(/\.theme-grok-ani \.companion-toast \{[\s\S]*?z-index:\s*70/);
  });

  it("drives the mic-orb from mouth and mic volume", () => {
    expect(html).toContain("createMiniEmotionBall");
    expect(html).toMatch(/createMiniEmotionBall\(btnMic/);
    expect(html).toMatch(/keepHostRole:\s*true/);
    expect(html).toMatch(/companion-chip__dot--legacy/);
    expect(html).toMatch(
      /const syncEmotionBall = \(\) => \{[\s\S]*miniEmotionBall\.sync\(/,
    );
    expect(html).toMatch(
      /onTalking: \(on\) => \{[\s\S]*emotionBallLevel = 0/,
    );
    expect(html).toMatch(
      /onMicLevel: \(\{ level, rms \} = \{\}\) => \{[\s\S]*applyMicMeterVisual\(level\)/,
    );
    expect(html).toMatch(/stopAllSpeakingFromMic/);
    expect(html).toMatch(/dblclick/);
    expect(html).toMatch(
      /onMouth: \(open, shape\) => \{[\s\S]*lastMouthBallLevel[\s\S]*emotionBall\.setLevel/,
    );
    expect(html).toMatch(/markReplyEmotionHold/);
    expect(html).toMatch(/REPLY_EMOTION_HOLD_MS/);
    expect(grokCss).toContain("companion-chip__dot-canvas");
    expect(grokCss).toMatch(/\.companion-chip__dot:has\(canvas\) \{[\s\S]*transform:\s*none/);
    expect(grokCss).toMatch(/\.companion-chip__dot-canvas \{[\s\S]*inset:\s*0/);
    expect(grokCss).toMatch(/\.companion-chip__dot \{[\s\S]*?overflow:\s*hidden/);
    expect(html).toContain('id="btn-mic"');
    expect(html).toMatch(/\.mic-btn\.mini-emotion-ball/);
    expect(html).toMatch(/keepHostRole:\s*true/);
    expect(html).toContain("resolveMiniEmotionBallState");
    expect(html).toMatch(/onTalking: \(on\) => \{[\s\S]*syncCompanionStatusUi\(\)/);
    expect(grokCss).not.toMatch(/animation:\s*miniBallGlow/);
    expect(grokCss).not.toMatch(/animation:\s*miniBallIdle/);
  });
});
