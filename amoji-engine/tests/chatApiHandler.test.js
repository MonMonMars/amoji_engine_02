import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  CLOUD_CHAT_MAX_TOKENS,
  getLlmStatusPayload,
  isCloudDeploy,
  processChatRequest,
  resolveOpenRouterModel,
} from "../engine/companion/chatApiHandler.mjs";
import { isOllamaLocalModel } from "../engine/companion/companionModelIds.js";

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

  it("auto provider selects online mode on cloud when openrouter key is set", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const result = await processChatRequest({
      message: "__ping__",
      providerId: "auto",
    });
    expect(result.mode).toBe("online");
    expect(result.hosted).toBe(true);
    expect(result.model).toBe("openrouter/auto");
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

  it("detects ollama-only model names", () => {
    expect(isOllamaLocalModel("qwen3:4b")).toBe(true);
    expect(isOllamaLocalModel("openrouter/auto")).toBe(false);
    expect(isOllamaLocalModel("meta-llama/llama-3.2-3b-instruct")).toBe(false);
  });

  it("caps OpenRouter max_tokens so credit-limited keys can complete", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    const bodies = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body || "{}")));
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "今日幾好呀，食咗飯未？" } }],
        }),
      };
    };
    try {
      const result = await processChatRequest({
        message: "今日點呀？",
        providerId: "auto",
      });
      expect(result.mode).toBe("online");
      expect(result.reply).toContain("今日");
      expect(bodies[0].max_tokens).toBe(CLOUD_CHAT_MAX_TOKENS);
      expect(bodies[0].max_tokens).toBeLessThanOrEqual(1024);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("uses hosted OpenRouter even when the client asks for groq", async () => {
    process.env.OPENROUTER_API_KEY = "or-server";
    const urls = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      const body = JSON.parse(String(init?.body || "{}"));
      expect(body.max_tokens).toBeLessThanOrEqual(1024);
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "我喺度呀！" } }],
        }),
      };
    };
    try {
      const result = await processChatRequest({
        message: "hi there",
        providerId: "groq",
        apiKey: "gsk_stale_client",
      });
      expect(result.mode).toBe("online");
      expect(urls.some((u) => u.includes("openrouter.ai"))).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("resolves openrouter model instead of client ollama default", () => {
    process.env.OPENROUTER_MODEL = "openrouter/auto";
    expect(resolveOpenRouterModel("qwen3:4b", null)).toBe("openrouter/auto");
    expect(resolveOpenRouterModel("meta-llama/llama-3.2-3b-instruct", null)).toBe(
      "meta-llama/llama-3.2-3b-instruct",
    );
  });
});
