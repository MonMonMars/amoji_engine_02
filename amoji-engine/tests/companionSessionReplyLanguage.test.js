import { describe, expect, it } from "vitest";
import {
  buildSessionReplyLanguageRule,
  normalizeReplyLangCode,
  replyLangFromChatBody,
} from "../engine/companion/companionSessionReplyLanguage.mjs";
import { buildUnifiedSessionPrompt } from "../engine/companion/companionUnifiedApp.js";

describe("companionSessionReplyLanguage", () => {
  it("normalizes reply lang codes", () => {
    expect(normalizeReplyLangCode("en")).toBe("en");
    expect(normalizeReplyLangCode("en-US")).toBe("en");
    expect(normalizeReplyLangCode("yue")).toBe("yue");
    expect(normalizeReplyLangCode("zh-HK")).toBe("yue");
  });

  it("reads reply lang from chat API body", () => {
    expect(replyLangFromChatBody({ replyLang: "en" })).toBe("en");
    expect(replyLangFromChatBody({ langCode: "yue" })).toBe("yue");
  });

  it("locks English session replies regardless of user input language", () => {
    const rule = buildSessionReplyLanguageRule(true);
    expect(rule).toMatch(/English only/i);
    expect(rule).toMatch(/Cantonese, Mandarin/i);
  });

  it("includes session language rule in unified session prompt", () => {
    const prompt = buildUnifiedSessionPrompt({
      characterPrompt: "You are Nova.",
      role: "girlfriend",
      isEnglish: true,
      langCode: "en",
    });
    expect(prompt).toMatch(/SESSION REPLY LANGUAGE: English only/i);
  });
});
