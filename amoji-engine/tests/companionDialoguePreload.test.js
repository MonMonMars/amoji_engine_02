import { describe, expect, it, vi } from "vitest";
import {
  collectIdleDialoguePhrases,
  collectWaitDialoguePhrases,
  dialogueTtsCacheKey,
  getCachedDialogueTts,
  prefetchDialogueTtsPhrases,
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

  it("prefers thinking fillers for loading voice preload", () => {
    const phrases = collectWaitDialoguePhrases(false, 3);
    expect(phrases.some((p) => p.includes("嗯"))).toBe(true);
    expect(phrases.some((p) => p.includes("等我"))).toBe(true);
    expect(phrases.length).toBeGreaterThanOrEqual(12);
  });

  it("prefetchDialogueTtsPhrases stores blobs by speakable text", async () => {
    const audioBlob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" });
    const fetchImpl = async () => ({
      ok: true,
      blob: async () => audioBlob,
    });
    const result = await prefetchDialogueTtsPhrases(["Hi there! [mood:happy]"], {
      cloudTtsUrl: "https://example.test/tts",
      lang: "en-US",
      voiceName: "en-US-JennyNeural",
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(getCachedDialogueTts(dialogueTtsCacheKey("en-US", "Hi there!"))).toBeTruthy();
  });
});
