import { describe, expect, it } from "vitest";
import {
  needsWebSearch,
  searchWeb,
  shouldTryWebSearch,
} from "../engine/companion/companionWebSearch.mjs";

describe("companionWebSearch", () => {
  it("detects search-worthy prompts", () => {
    expect(needsWebSearch("今日香港天氣點呀？")).toBe(true);
    expect(needsWebSearch("你好呀")).toBe(false);
    expect(shouldTryWebSearch("what is AI?", { basicMode: true })).toBe(true);
  });

  it("returns duckduckgo summary when available", async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        AbstractText: "Hong Kong is a city.",
        Answer: "",
        RelatedTopics: [],
      }),
    });
    const result = await searchWeb("Hong Kong", fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.summary).toContain("Hong Kong");
    expect(result.source).toBe("duckduckgo");
  });
});
