import { describe, expect, it } from "vitest";
import {
  EMOTION_DEMO_LINES,
  EMOTION_DEMO_VOICES,
} from "../engine/companion/companionVoiceEmotionDemo.js";
import { rankedEnglishVoicesForEmotion } from "../engine/companion/companionVoiceProfiles.js";

describe("companionVoiceEmotionDemo", () => {
  it("defines four moods per language", () => {
    expect(Object.keys(EMOTION_DEMO_LINES.en)).toEqual([
      "happy",
      "sad",
      "surprised",
      "thinking",
    ]);
    expect(EMOTION_DEMO_LINES.yue.happy.emotion).toBe("happy");
  });

  it("ranks OpenAI voices first when available", () => {
    const ranked = rankedEnglishVoicesForEmotion(true);
    expect(ranked[0].id).toBe("openai-coral");
    expect(EMOTION_DEMO_VOICES.en).toContain("openai-coral");
  });
});
