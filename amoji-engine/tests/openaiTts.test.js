import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  resolveOpenAiVoice,
  synthesizeOpenAiSpeech,
} from "../engine/companion/openaiTts.mjs";
import { buildTtsInstruct } from "../engine/companion/companionTtsProsody.js";

describe("openaiTts", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("maps Cantonese neural voice to OpenAI marin", () => {
    expect(resolveOpenAiVoice("zh-HK-HiuMaanNeural", "zh-HK")).toBe("marin");
  });

  it("builds ChatGPT-style structured instructions", () => {
    const instruct = buildTtsInstruct({
      emotion: "happy",
      nuance: "excited",
      lang: "en",
      text: "Hi! Great to see you!",
    });
    expect(instruct).toContain("Voice Affect:");
    expect(instruct).toContain("Tone:");
    expect(instruct).toContain("Emotion:");
    expect(instruct).toMatch(/warm|cheerful|delight/i);
  });

  it("posts instructions to OpenAI speech API", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    }));
    const result = await synthesizeOpenAiSpeech("Hello there!", {
      emotion: "happy",
      lang: "en",
      fetchImpl,
    });
    expect(result?.voice).toBe("marin");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4o-mini-tts");
    expect(body.instructions).toContain("Voice Affect:");
    expect(body.input).toBe("Hello there!");
  });
});
