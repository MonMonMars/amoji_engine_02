import { describe, expect, it } from "vitest";
import { ROSTER_CHARACTER_IDS } from "../engine/companion/companionCharacterRoster.js";
import {
  ROSTER_KEEP_MODEL_NUMBERS,
  ROSTER_REPLACED_VRM_SOURCES,
} from "../engine/companion/companionRosterModelRefreshV522.mjs";

describe("companionRosterModelRefreshV522", () => {
  it("refreshes every roster slot except keep list (#1–11, #29)", () => {
    const keepIds = new Set(
      ROSTER_CHARACTER_IDS.filter((_, i) =>
        ROSTER_KEEP_MODEL_NUMBERS.includes(i + 1),
      ),
    );
    const replaceIds = ROSTER_CHARACTER_IDS.filter((id) => !keepIds.has(id));
    expect(replaceIds).toHaveLength(16);
    for (const id of replaceIds) {
      expect(ROSTER_REPLACED_VRM_SOURCES[id]?.vrmUrl).toMatch(/^https:\/\//);
    }
    expect(ROSTER_REPLACED_VRM_SOURCES.zane).toBeUndefined();
  });
});
