import { describe, expect, it, vi } from "vitest";
import {
  buildSessionHref,
  formatActiveModeSummary,
  loadSessionModeOverride,
  persistUserSessionMode,
  setSessionModeOverride,
} from "../engine/companion/companionSessionMode.js";
import { resolveAppRole } from "../engine/companion/companionUnifiedApp.js";
import {
  loadCompanionLang,
  resolveCompanionLang,
  saveCompanionLang,
} from "../engine/companion/companionLocalePrefs.js";

describe("companionSessionMode", () => {
  it("persists user mode without remapping default character storage", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] ?? null;
      },
      setItem(k, v) {
        this.data[k] = v;
      },
    };
    storage.data["amoji.mobile.lastCharacterId"] = "ember";
    persistUserSessionMode("secretary", storage);
    expect(storage.data["amoji.companionRole.v1"]).toBe("secretary");
    expect(storage.data["amoji.mobile.lastCharacterId"]).toBe("ember");
    expect(loadSessionModeOverride(storage)).toBe(true);
  });

  it("honors session mode override over character role", () => {
    const storage = {
      getItem(key) {
        if (key === "amoji.companionSessionModeOverride.v1") return "1";
        if (key === "amoji.companionRole.v1") return "secretary";
        return null;
      },
    };
    expect(
      resolveAppRole(new URLSearchParams("character=rex"), storage, "rex"),
    ).toBe("secretary");
  });

  it("builds unified session href with lang and role", () => {
    expect(buildSessionHref({ lang: "en", role: "pet", character: "mimi" })).toBe(
      "/play?lang=en&pick=1&automic=0&role=pet&character=mimi",
    );
  });

  it("formats active mode summary", () => {
    expect(formatActiveModeSummary("boyfriend", true)).toMatch(/Boyfriend/);
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
    expect(resolveCompanionLang(new URLSearchParams("lang=yue"), storage)).toBe(
      "yue",
    );
  });
});
