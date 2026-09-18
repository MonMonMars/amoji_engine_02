import { describe, expect, it } from "vitest";
import {
  EMOTION_DEMO_LINES,
  EMOTION_DEMO_VOICES,
} from "../engine/companion/companionVoiceEmotionDemo.js";
import { rankedEnglishVoicesForEmotion } from "../engine/companion/companionVoiceProfiles.js";

describe("companionVoiceEmotionDemo", () => {
  it("defines mood + vocalization demos per language", () => {
    expect(Object.keys(EMOTION_DEMO_LINES.en)).toEqual([
      "happy",
      "sad",
      "surprised",
      "thinking",
      "giggle",
      "laugh",
      "smile",
      "um",
    ]);
    expect(EMOTION_DEMO_LINES.yue.happy.emotion).toBe("happy");
  });

  it("ranks OpenAI voices first when available", () => {
    const ranked = rankedEnglishVoicesForEmotion(true);
    expect(ranked[0].id).toBe("openai-coral");
    expect(EMOTION_DEMO_VOICES.en).toContain("openai-coral");
  });
});
