import { describe, expect, it, vi } from "vitest";
import {
  IDLE_TALK_SPEECH_FACE_SAMPLES,
  collectIdleTalkExpressionProfiles,
  primeIdleTalkSpeechFaceCache,
  warmAvatarIdleTalkExpressions,
} from "../engine/companion/companionExpressionPreload.js";
import { collectWaitPreloadExpressionProfiles } from "../engine/companion/companionWaitAssets.js";

describe("companionExpressionPreload", () => {
  it("collects idle/talk expression profiles from wait registry", () => {
    const profiles = collectIdleTalkExpressionProfiles();
    expect(profiles.length).toBe(collectWaitPreloadExpressionProfiles().length);
    expect(profiles.some((p) => p.nuance === "love")).toBe(true);
  });

  it("prebuilds speech-face timelines for common idle/talk phrases", () => {
    const result = primeIdleTalkSpeechFaceCache();
    expect(result.ok).toBe(true);
    expect(result.warmed).toBeGreaterThan(IDLE_TALK_SPEECH_FACE_SAMPLES.length);
  });

  it("warms avatar idle/talk expression blends", async () => {
    const applyExpressionProfile = vi.fn();
    const setEmotion = vi.fn();
    const warmExpressionPresets = vi.fn();
    const result = await warmAvatarIdleTalkExpressions(
      {
        applyExpressionProfile,
        setEmotion,
        warmExpressionPresets,
      },
      { maxProfiles: 6 },
    );
    expect(result.ok).toBe(true);
    expect(warmExpressionPresets).toHaveBeenCalled();
    expect(applyExpressionProfile.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(setEmotion).toHaveBeenCalledWith("neutral");
  });
});
