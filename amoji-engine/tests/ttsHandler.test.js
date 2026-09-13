import { describe, expect, it } from "vitest";
import {
  CANTONESE_FEMALE_VOICE,
  processTtsRequest,
  synthesizeCantoneseSpeech,
} from "../engine/companion/ttsHandler.mjs";

describe("ttsHandler", () => {
  it("rejects empty text", async () => {
    await expect(synthesizeCantoneseSpeech("   ")).rejects.toThrow(/empty/i);
  });

  it("returns OPTIONS 204", async () => {
    const result = await processTtsRequest({ method: "OPTIONS" });
    expect(result.status).toBe(204);
  });

  it(
    "synthesizes Cantonese female audio",
    async () => {
      const { audio, voice } = await synthesizeCantoneseSpeech("你好", {
        emotion: "happy",
      });
      expect(voice).toBe(CANTONESE_FEMALE_VOICE);
      expect(audio.byteLength).toBeGreaterThan(1000);
    },
    15000,
  );
});
