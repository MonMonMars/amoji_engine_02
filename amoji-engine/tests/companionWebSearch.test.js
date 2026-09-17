import { describe, expect, it } from "vitest";
import { inferActionFromCatalogText } from "../engine/companion/companionActionCatalog.js";
import { localCompanionReply } from "../engine/companion/companionLocalReply.mjs";
import {
  extractSearchQuery,
  fetchWebContextForChat,
  needsWebSearch,
  parseDuckDuckGoHtml,
  searchWeb,
  shouldTryWebSearch,
  weatherLocation,
} from "../engine/companion/companionWebSearch.mjs";

describe("companionWebSearch", () => {
  it("detects search-worthy prompts", () => {
    expect(needsWebSearch("今日香港天氣點呀？")).toBe(true);
    expect(needsWebSearch("你好呀")).toBe(false);
    expect(shouldTryWebSearch("what is AI?", { basicMode: true })).toBe(true);
    expect(shouldTryWebSearch("香港人口幾多", { basicMode: true })).toBe(true);
    expect(shouldTryWebSearch("hello", { basicMode: true })).toBe(false);
  });

  it("extracts a weather location from Cantonese and English", () => {
    expect(weatherLocation("今日香港天氣點呀？")).toBe("Hong Kong");
    expect(weatherLocation("weather in Tokyo today")).toBe("Tokyo");
    expect(extractSearchQuery("please look up Hong Kong weather?")).toContain(
      "Hong Kong weather",
    );
  });

  it("does not treat weather questions as an eat action", () => {
    expect(inferActionFromCatalogText("What is the weather in Hong Kong today?")).not.toBe(
      "eat",
    );
    expect(inferActionFromCatalogText("eat cake")).toBe("eat");
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

  it("parses DuckDuckGo HTML snippets", () => {
    const html = `
      <a class="result__a">Hong Kong weather</a>
      <a class="result__snippet">Sunny, 27C at the observatory.</a>
    `;
    expect(parseDuckDuckGoHtml(html)).toContain("Sunny, 27C");
    expect(
      parseDuckDuckGoHtml(
        `<a class="result__a">Today&#x27;s Weather</a><a class="result__snippet">It&#x27;s raining.</a>`,
      ),
    ).toContain("Today's Weather");
  });

  it("uses wttr for weather queries", async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes("wttr.in")) {
        return {
          ok: true,
          json: async () => ({
            current_condition: [
              {
                temp_C: "27",
                FeelsLikeC: "29",
                humidity: "79",
                weatherDesc: [{ value: "Patchy rain nearby" }],
              },
            ],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    };
    const result = await searchWeb("What is the weather in Hong Kong today?", fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.source).toBe("wttr");
    expect(result.summary).toContain("27°C");
    expect(result.summary).toContain("Patchy rain nearby");
  });

  it("uses Wikipedia opensearch when DuckDuckGo is empty", async () => {
    const fetchImpl = async (url) => {
      const href = String(url);
      if (href.includes("opensearch")) {
        return {
          ok: true,
          json: async () => ["q", ["Ada Lovelace"], [""], ["https://en.wikipedia.org/wiki/Ada_Lovelace"]],
        };
      }
      if (href.includes("page/summary")) {
        return {
          ok: true,
          json: async () => ({
            extract: "Ada Lovelace was a mathematician.",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ AbstractText: "", RelatedTopics: [] }),
        text: async () => "",
      };
    };
    const result = await searchWeb("who is Ada Lovelace", fetchImpl);
    expect(result.ok).toBe(true);
    expect(result.source).toBe("wikipedia-en");
    expect(result.summary).toContain("Ada Lovelace");
  });

  it("can load a snapshot through /api/search", async () => {
    const fetchImpl = async (url, init) => {
      expect(url).toBe("/api/search");
      expect(init.method).toBe("POST");
      return {
        ok: true,
        json: async () => ({
          ok: true,
          summary: "Live rain in Kowloon.",
          source: "wttr",
        }),
      };
    };
    const web = await fetchWebContextForChat(
      "今日香港天氣？",
      fetchImpl,
      { viaApi: true },
    );
    expect(web.searched).toBe(true);
    expect(web.source).toBe("wttr");
    expect(web.context).toContain("Live rain in Kowloon.");
  });

  it("quotes web facts in the local fallback reply", () => {
    const reply = localCompanionReply(
      "What is the weather in Hong Kong today?",
      [],
      "Web search snapshot (may be incomplete — cite uncertainty if unsure):\nHong Kong: Patchy rain nearby, 27°C",
    );
    expect(reply).toContain("27°C");
    expect(reply).not.toContain("[action:eat]");
  });
});
