import { describe, expect, it } from "vitest";
import {
  CANTONESE_FEMALE_VOICE,
  ENGLISH_FEMALE_VOICE,
  processTtsRequest,
  synthesizeSpeech,
} from "../engine/companion/ttsHandler.mjs";

describe("ttsHandler", () => {
  it("rejects empty text", async () => {
    await expect(synthesizeSpeech("   ")).rejects.toThrow(/empty/i);
  });

  it("returns OPTIONS 204", async () => {
    const result = await processTtsRequest({ method: "OPTIONS" });
    expect(result.status).toBe(204);
  });

  it(
    "synthesizes Cantonese female audio",
    async () => {
      const { audio, voice } = await synthesizeSpeech("你好", {
        emotion: "happy",
      });
      expect(voice).toBe(CANTONESE_FEMALE_VOICE);
      expect(audio.byteLength).toBeGreaterThan(1000);
    },
    15000,
  );

  it(
    "synthesizes English female audio",
    async () => {
      const { audio, voice } = await synthesizeSpeech("Hello", {
        emotion: "happy",
        lang: "en",
      });
      expect(voice).toBe(ENGLISH_FEMALE_VOICE);
      expect(audio.byteLength).toBeGreaterThan(1000);
    },
    15000,
  );

  it(
    "exposes engine and emotion headers",
    async () => {
      const result = await processTtsRequest({
        method: "POST",
        body: { text: "你好呀！", emotion: "neutral", lang: "yue" },
      });
      expect(result.status).toBe(200);
      expect(result.headers["X-Tts-Engine"]).toMatch(/openai|edge/);
      expect(result.headers["X-Tts-Emotion"]).toBe("happy");
      expect(Buffer.isBuffer(result.body) ? result.body.byteLength : 0).toBeGreaterThan(
        1000,
      );
    },
    15000,
  );
});
