import { describe, expect, it, vi } from "vitest";
import {
  isIosLike,
  shouldPauseMicDuringTts,
} from "../engine/companion/companionPlatform.js";

describe("companionPlatform", () => {
  it("detects iPhone user agents", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIosLike()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("pauses mic during TTS on iOS", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(shouldPauseMicDuringTts()).toBe(true);
    vi.unstubAllGlobals();
  });
});
