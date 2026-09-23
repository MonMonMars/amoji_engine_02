import { describe, expect, it } from "vitest";
import {
  formatPickerFootBuildLine,
  formatSettingsAboutCopy,
  resolveAppBuildId,
} from "../engine/companion/companionAppAbout.mjs";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";

describe("companionAppAbout", () => {
  it("resolveAppBuildId uses repo build when window unset", () => {
    expect(resolveAppBuildId()).toBe(AMOJI_BUILD);
  });

  it("formatSettingsAboutCopy includes roster count and revision", () => {
    const en = formatSettingsAboutCopy(true);
    expect(en.sectionTitle).toBe("About");
    expect(en.buildLine).toContain(AMOJI_BUILD);
    expect(en.featuresLine).toContain(String(CHARACTER_IDS.length));
    expect(en.freshPlayUrl).toContain("/play");
    expect(en.creditsLine).toMatch(/Shino|篠/);
    expect(en.creditsLine).toMatch(/CC0/i);
  });

  it("formatPickerFootBuildLine is bilingual", () => {
    expect(formatPickerFootBuildLine(true)).toMatch(/Build/);
    expect(formatPickerFootBuildLine(false)).toMatch(/版本/);
  });
});
