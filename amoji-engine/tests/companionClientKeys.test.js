import { describe, expect, it } from "vitest";
import {
  hasClientGroqKey,
  inferKeyProvider,
  resolveClientApiKey,
} from "../engine/companion/companionClientKeys.js";
import { saveProviderApiKey } from "../engine/companion/companionLlmProviders.js";

describe("companionClientKeys", () => {
  it("detects groq key prefix", () => {
    expect(inferKeyProvider("gsk_test123")).toBe("groq");
    expect(inferKeyProvider("sk-or-test")).toBe("openrouter-gemma");
    expect(inferKeyProvider("bad")).toBe(null);
  });

  it("reads stored groq key", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] || null;
      },
      setItem(k, v) {
        this.data[k] = v;
      },
      removeItem(k) {
        delete this.data[k];
      },
    };
    saveProviderApiKey("groq", "gsk_saved", storage);
    expect(hasClientGroqKey(storage)).toBe(true);
    expect(resolveClientApiKey("auto", storage)).toBe("gsk_saved");
  });
});
