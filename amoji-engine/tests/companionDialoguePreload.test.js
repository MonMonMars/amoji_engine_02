import { describe, expect, it } from "vitest";
import {
  collectWaitDialoguePhrases,
  dialogueTtsCacheKey,
} from "../engine/companion/companionDialoguePreload.js";

describe("companionDialoguePreload", () => {
  it("collects wait dialogue phrases across phases", () => {
    const yue = collectWaitDialoguePhrases(false, 2);
    const en = collectWaitDialoguePhrases(true, 2);
    expect(yue.length).toBeGreaterThan(8);
    expect(en.length).toBeGreaterThan(8);
    expect(yue.some((p) => p.includes("載入"))).toBe(true);
    expect(en.some((p) => /loading|waking/i.test(p))).toBe(true);
  });

  it("builds stable cache keys", () => {
    expect(dialogueTtsCacheKey("zh-HK", "等我一下")).toBe("zh-HK::等我一下");
  });
});
