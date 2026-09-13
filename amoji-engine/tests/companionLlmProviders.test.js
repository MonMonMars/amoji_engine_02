import { describe, expect, it } from "vitest";
import {
  formatLlmModeLabel,
  getLlmProvider,
  resolveProviderConfig,
} from "../engine/companion/companionLlmProviders.js";

describe("companionLlmProviders", () => {
  it("resolves ollama provider", () => {
    const cfg = resolveProviderConfig("ollama");
    expect(cfg.url).toContain("11434");
    expect(cfg.model).toBe("llama3.2");
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
});
