import { describe, expect, it } from "vitest";
import {
  formatLlmModeLabel,
  getLlmProvider,
  getVisibleLlmProviders,
  resolveProviderConfig,
} from "../engine/companion/companionLlmProviders.js";

describe("companionLlmProviders", () => {
  it("resolves qwen4 ollama provider", () => {
    const cfg = resolveProviderConfig("ollama-qwen4");
    expect(cfg.url).toContain("11434");
    expect(cfg.model).toBe("qwen3:4b");
    expect(cfg.apiKey).toBe("ollama");
    expect(cfg.forceLocal).toBe(false);
  });

  it("resolves basic offline provider", () => {
    const cfg = resolveProviderConfig("basic");
    expect(cfg.forceLocal).toBe(true);
    expect(cfg.url).toBeNull();
  });

  it("formats mode labels", () => {
    expect(formatLlmModeLabel("ollama", "llama3.2")).toContain("ollama");
    expect(formatLlmModeLabel("local")).toBe("basic brain");
  });

  it("falls back to auto provider", () => {
    expect(getLlmProvider("missing").id).toBe("auto");
  });

  it("hides local ollama presets when hosted", () => {
    const hosted = getVisibleLlmProviders(true);
    expect(hosted.some((p) => p.id.startsWith("ollama"))).toBe(false);
    expect(hosted.some((p) => p.id === "groq")).toBe(true);
  });
});
