import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeOpenAiVoiceKey,
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

  it("maps openai-coral profile directly", () => {
    expect(resolveOpenAiVoice("openai-coral", "en")).toBe("coral");
    expect(resolveOpenAiVoice("openai-shimmer", "en")).toBe("shimmer");
  });

  it("maps male English and persona-suffixed voices correctly", () => {
    expect(resolveOpenAiVoice("en-HK-SamNeural", "en-HK")).toBe("ash");
    expect(normalizeOpenAiVoiceKey("zh-HK-WanLungNeural-calm")).toBe(
      "zh-hk-wanlungneural",
    );
    expect(resolveOpenAiVoice("zh-HK-WanLungNeural-bold", "zh-HK")).toBe("ash");
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
    expect(instruct).toMatch(/warm|cheerful|delight|friend/i);
    expect(instruct).toMatch(/Speak at /);
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
    expect(body.instructions).toMatch(/Speak at /);
    expect(body.speed).toBeLessThan(0.55);
    expect(body.instructions).toMatch(/unhurried|Never rush/i);
    expect(body.input).toBe("Hello there!");
  });
});
