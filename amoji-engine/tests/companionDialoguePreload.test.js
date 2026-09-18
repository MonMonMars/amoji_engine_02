import { describe, expect, it } from "vitest";
import {
  collectIdleDialoguePhrases,
  collectWaitDialoguePhrases,
  dialogueTtsCacheKey,
} from "../engine/companion/companionDialoguePreload.js";

describe("companionDialoguePreload", () => {
  it("collects wait dialogue phrases across phases", () => {
    const yue = collectWaitDialoguePhrases(false, 2);
    const en = collectWaitDialoguePhrases(true, 2);
    expect(yue.length).toBeGreaterThan(8);
    expect(en.length).toBeGreaterThan(8);
    expect(yue.some((p) => p.includes("嗯"))).toBe(true);
    expect(en.some((p) => /um|amm|hmm/i.test(p))).toBe(true);
    expect(en.some((p) => /let me see|let me search|one sec|hang on/i.test(p))).toBe(
      true,
    );
  });

  it("builds stable cache keys", () => {
    expect(dialogueTtsCacheKey("zh-HK", "等我一下")).toBe("zh-HK::等我一下");
  });

  it("collects dozens of idle showcase dialogue lines", () => {
    const yue = collectIdleDialoguePhrases(false);
    const en = collectIdleDialoguePhrases(true);
    expect(yue.length).toBeGreaterThanOrEqual(25);
    expect(en.length).toBeGreaterThanOrEqual(25);
    expect(yue.some((p) => p.includes("等緊你"))).toBe(true);
    expect(en.some((p) => /hanging out|ready/i.test(p))).toBe(true);
  });

  it("includes idle lines in wait dialogue preload bundle", () => {
    const phrases = collectWaitDialoguePhrases(false, 3);
    expect(phrases.filter((p) => p.includes("等緊你")).length).toBeGreaterThanOrEqual(1);
    expect(phrases.length).toBeGreaterThanOrEqual(30);
  });
});
