import { describe, expect, it } from "vitest";
import {
  collectWaitPreloadMotionIds,
  pickWaitEmotion,
  pickWaitPose,
  WAIT_POSES_BY_PHASE,
} from "../engine/companion/companionWaitAssets.js";

describe("companionWaitAssets", () => {
  it("collects bundled and idle showcase motions for preload", () => {
    const ids = collectWaitPreloadMotionIds();
    expect(ids).toContain("wave");
    expect(ids).toContain("dab");
    expect(ids).toContain("stretch");
    expect(ids.length).toBeGreaterThan(12);
  });

  it("rotates wait poses and emotions", () => {
    expect(WAIT_POSES_BY_PHASE.idle).toContain("peace");
    expect(pickWaitPose("idle", 0)).toBeTruthy();
    expect(pickWaitEmotion("idle", 0, "idle")).toBe("happy");
    expect(pickWaitEmotion("avatar-load", 1, "avatar-load")).toBeTruthy();
  });
});
