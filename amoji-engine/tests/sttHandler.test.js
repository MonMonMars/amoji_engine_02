import { afterEach, describe, expect, it } from "vitest";
import {
  processSttRequest,
  resolveSttProvider,
  sttLanguageCode,
} from "../engine/companion/sttHandler.mjs";

describe("sttHandler", () => {
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("maps language codes for Whisper", () => {
    expect(sttLanguageCode("en-US")).toBe("en");
    expect(sttLanguageCode("zh-HK")).toBe("zh");
    expect(sttLanguageCode("yue")).toBe("zh");
  });

  it("prefers Groq when GROQ_API_KEY is set", () => {
    process.env.GROQ_API_KEY = "gsk_test";
    const provider = resolveSttProvider();
    expect(provider?.url).toContain("groq.com");
    expect(provider?.model).toBeTruthy();
  });

  it("returns 503 when no STT provider configured", async () => {
    const result = await processSttRequest({
      method: "POST",
      body: { audio: Buffer.from("test").toString("base64") },
    });
    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);
  });

  it("rejects empty audio payload", async () => {
    process.env.GROQ_API_KEY = "gsk_test";
    const result = await processSttRequest({ method: "POST", body: {} });
    expect(result.status).toBe(400);
  });
});
