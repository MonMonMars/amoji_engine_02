import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_PROACTIVE_LINES,
  createProactiveTalkController,
  pickProactiveLine,
  PROACTIVE_SPEAK_COOLDOWN_MS,
  PROACTIVE_TALK_SCHEMA,
} from "../engine/companion/companionProactiveTalk.mjs";

describe("companionProactiveTalk", () => {
  it("exports schema and character lines", () => {
    expect(PROACTIVE_TALK_SCHEMA).toMatch(/proactiveTalk/i);
    expect(CHARACTER_PROACTIVE_LINES.nova.en.length).toBeGreaterThan(6);
    expect(CHARACTER_PROACTIVE_LINES.default.yue.length).toBeGreaterThan(2);
  });

  it("picks character-specific proactive lines", () => {
    const line = pickProactiveLine("kizuna", true);
    expect(line.length).toBeGreaterThan(3);
    const yue = pickProactiveLine("amoji", false);
    expect(yue).toMatch(/[\u4e00-\u9fff]/);
  });

  it("speaks greeting follow-up after delay", async () => {
    vi.useFakeTimers();
    const spoke = [];
    const ctrl = createProactiveTalkController({
      getCharacterId: () => "nova",
      getIsEnglish: () => true,
      canSpeak: () => true,
      onSpeak: (line) => {
        spoke.push(line);
      },
      now: () => Date.now(),
    });

    ctrl.notifyGreetingDone();
    await vi.advanceTimersByTimeAsync(11000);
    expect(spoke.length).toBe(1);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it("cancels pending nudge on user activity", async () => {
    vi.useFakeTimers();
    const spoke = [];
    const ctrl = createProactiveTalkController({
      canSpeak: () => true,
      onSpeak: (line) => spoke.push(line),
    });

    ctrl.notifyGreetingDone();
    ctrl.notifyUserActivity();
    await vi.advanceTimersByTimeAsync(15000);
    expect(spoke.length).toBe(0);

    ctrl.destroy();
    vi.useRealTimers();
  });

  it("respects speak cooldown", async () => {
    let t = 0;
    const spoke = [];
    const ctrl = createProactiveTalkController({
      canSpeak: () => true,
      onSpeak: (line) => {
        spoke.push(line);
      },
      now: () => t,
    });

    await ctrl._trySpeak("idle");
    t += PROACTIVE_SPEAK_COOLDOWN_MS - 1000;
    await ctrl._trySpeak("idle");
    expect(spoke.length).toBe(1);

    t += 2000;
    await ctrl._trySpeak("idle");
    expect(spoke.length).toBe(2);

    ctrl.destroy();
  });
});
