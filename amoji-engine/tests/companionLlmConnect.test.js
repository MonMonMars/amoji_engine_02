import { describe, expect, it } from "vitest";
import {
  pickBestProviderId,
  probeProviderAvailability,
  rankAvailableProviders,
} from "../engine/companion/companionLlmConnect.js";

describe("companionLlmConnect", () => {
  it("ranks qwen4 first when installed", () => {
    const ranked = rankAvailableProviders(
      { ollama: { ok: true, models: ["qwen3:8b", "qwen3:4b"] } },
      null,
    );
    expect(ranked[0].id).toBe("ollama-qwen4");
    expect(pickBestProviderId(ranked).id).toBe("ollama-qwen4");
  });

  it("marks cloud chips unavailable without server keys", () => {
    const avail = probeProviderAvailability(
      { ollama: { ok: true, models: ["qwen3:4b"] }, groq: { ok: false } },
      null,
    );
    expect(avail["ollama-qwen4"]).toBe(true);
    expect(avail.groq).toBe(false);
    expect(avail.basic).toBe(true);
  });
});
