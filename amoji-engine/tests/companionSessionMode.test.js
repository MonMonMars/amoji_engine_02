import { describe, expect, it } from "vitest";
import { buildSessionHref } from "../engine/companion/companionVoiceCatalog.js";
import { resolveAppRole } from "../engine/companion/companionUnifiedApp.js";
import {
  loadCompanionLang,
  resolveCompanionLang,
  resolveUtteranceSpeechLang,
  saveCompanionLang,
} from "../engine/companion/companionLocalePrefs.js";
import { buildCharacterFunctionReadout } from "../engine/companion/companionSettingsChrome.js";

describe("companionSessionHref", () => {
  it("builds play URL with lang and character", () => {
    expect(buildSessionHref({ lang: "en", character: "nova" })).toBe(
      "/play?lang=en&pick=1&automic=0&character=nova",
    );
  });

  it("preserves build cache-bust params when rewriting session href", () => {
    globalThis.location = {
      search: "?build=2026-09-20-v396-test&_cb=123&lang=yue",
    };
    expect(
      buildSessionHref({
        basePath: "/n/999/full",
        lang: "yue",
        character: "nova",
      }),
    ).toContain("build=2026-09-20-v396-test");
    expect(
      buildSessionHref({
        basePath: "/n/999/full",
        lang: "yue",
        character: "nova",
      }),
    ).toContain("_cb=123");
    delete globalThis.location;
  });
});

describe("companionLocalePrefs", () => {
  it("stores and resolves language preference", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] ?? null;
      },
      setItem(k, v) {
        this.data[k] = v;
      },
    };
    saveCompanionLang("en", storage);
    expect(loadCompanionLang(storage)).toBe("en");
    expect(resolveCompanionLang(new URLSearchParams(""), storage)).toBe("en");
  });

  it("resolveUtteranceSpeechLang follows script when session is English", () => {
    expect(resolveUtteranceSpeechLang("你好呀，今日點呀？", "en")).toBe("yue");
    expect(resolveUtteranceSpeechLang("Hey, how are you today?", "en")).toBe(
      "en",
    );
    expect(resolveUtteranceSpeechLang("ok", "en")).toBe("en");
  });
});

describe("character-driven role", () => {
  it("derives boyfriend role from rex without menu override", () => {
    const storage = {
      getItem(key) {
        if (key === "amoji.companionSessionModeOverride.v1") return "1";
        if (key === "amoji.companionRole.v1") return "secretary";
        return null;
      },
    };
    expect(
      resolveAppRole(new URLSearchParams("character=rex"), storage, "rex"),
    ).toBe("boyfriend");
  });

  it("describes character function readout", () => {
    expect(
      buildCharacterFunctionReadout(true, {
        companionName: "Nova",
        companionRole: "girlfriend",
      }),
    ).toMatch(/Nova.*Girlfriend.*personality/i);
  });
});
