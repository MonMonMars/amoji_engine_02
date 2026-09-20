import { describe, expect, it } from "vitest";
import {
  assertRosterDownloadCoverage,
  rosterModelUrl,
  rosterVrmBasename,
  ROSTER_VRM_DOWNLOADS,
} from "../engine/companion/rosterVrmAssets.mjs";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";

describe("rosterVrmAssets", () => {
  it("covers every roster id with a download/copy entry", () => {
    expect(() => assertRosterDownloadCoverage(CHARACTER_IDS)).not.toThrow();
    expect(ROSTER_VRM_DOWNLOADS.length).toBe(CHARACTER_IDS.length);
  });

  it("uses companion-<id>.vrm paths", () => {
    expect(rosterVrmBasename("sakura")).toBe("companion-sakura.vrm");
    expect(rosterModelUrl("kizuna")).toBe("/prototypes/assets/companion-kizuna.vrm");
  });
});
