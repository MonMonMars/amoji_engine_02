import { describe, expect, it } from "vitest";
import { ROSTER_CHARACTER_IDS } from "../engine/companion/companionCharacterRoster.js";
import {
  ROSTER_KEEP_MODEL_NUMBERS,
  ROSTER_REPLACED_VRM_SOURCES,
} from "../engine/companion/companionRosterModelRefreshV522.mjs";
import { rosterDownloadEntry } from "../engine/companion/rosterVrmAssets.mjs";

describe("companionRosterModelRefreshV522", () => {
  it("refreshes every roster slot except keep list (#1–11, #29)", () => {
    const keepIds = new Set(
      ROSTER_CHARACTER_IDS.filter((_, i) =>
        ROSTER_KEEP_MODEL_NUMBERS.includes(i + 1),
      ),
    );
    const replaceIds = ROSTER_CHARACTER_IDS.filter((id) => !keepIds.has(id));
    expect(replaceIds).toHaveLength(19);
    for (const id of replaceIds) {
      const refreshUrl = ROSTER_REPLACED_VRM_SOURCES[id]?.vrmUrl;
      if (refreshUrl) {
        expect(refreshUrl).toMatch(/^https:\/\//);
      } else {
        expect(rosterDownloadEntry(id)?.url).toMatch(/^https:\/\//);
      }
    }
    expect(ROSTER_REPLACED_VRM_SOURCES.zane).toBeUndefined();
  });
});
