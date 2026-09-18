import { describe, expect, it } from "vitest";
import { COMPANION_VRM_MOTION_PLAYER_SCHEMA } from "../engine/companion/companionVrmMotionPlayer.js";
import { ONLINE_CALM_IDLE_ACTION } from "../engine/companion/companionOnlineMotionClips.mjs";
import { DEFAULT_MOTION_CROSSFADE_SEC } from "../engine/companion/vrmMotionTransition.js";

describe("companionVrmMotionPlayer", () => {
  it("uses v3 schema and shares crossfade timing with transition module", () => {
    expect(COMPANION_VRM_MOTION_PLAYER_SCHEMA).toBe(
      "amoji.companionVrmMotionPlayer.v3",
    );
    expect(DEFAULT_MOTION_CROSSFADE_SEC).toBeCloseTo(0.48);
    expect(ONLINE_CALM_IDLE_ACTION).toBe("relax");
  });
});
