import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getLlmStatusPayload,
  isCloudDeploy,
  processChatRequest,
} from "../engine/companion/chatApiHandler.mjs";

describe("chatApiHandler cloud", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.VERCEL = "1";
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("marks hosted when VERCEL=1", () => {
    expect(isCloudDeploy()).toBe(true);
  });

  it("status skips ollama on cloud", async () => {
    const status = await getLlmStatusPayload();
    expect(status.hosted).toBe(true);
    expect(status.ollama.ok).toBe(false);
  });

  it("auto provider selects online mode on cloud when groq key is set", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const result = await processChatRequest({
      message: "__ping__",
      providerId: "auto",
    });
    expect(result.mode).toBe("online");
    expect(result.hosted).toBe(true);
  });

  it("accepts client-supplied groq key in request body", async () => {
    const result = await processChatRequest({
      message: "__ping__",
      providerId: "groq",
      apiKey: "gsk_client_test_key",
    });
    expect(result.mode).toBe("online");
  });
});
