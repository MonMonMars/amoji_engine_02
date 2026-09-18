import { describe, expect, it } from "vitest";
import {
  collectIdlePreloadMotionIds,
  collectWaitPreloadExpressionProfiles,
  collectWaitPreloadMotionIds,
  pickWaitEmotion,
  pickWaitExpressionProfile,
  pickWaitPose,
  WAIT_POSES_BY_PHASE,
} from "../engine/companion/companionWaitAssets.js";
import { IDLE_LIFE_CLIP_POOL } from "../engine/companion/companionActionChoreography.js";

describe("companionWaitAssets", () => {
  it("collects bundled and idle showcase motions for preload", () => {
    const ids = collectWaitPreloadMotionIds();
    expect(ids).toContain("wave");
    expect(ids).toContain("dab");
    expect(ids).toContain("stretch");
    expect(ids.length).toBeGreaterThan(35);
    expect(ids).toContain("dance");
    expect(ids).toContain("breakdance");
  });

  it("rotates wait poses, emotions, and expression profiles", () => {
    expect(WAIT_POSES_BY_PHASE.idle).toContain("thinking");
    expect(WAIT_POSES_BY_PHASE.idle).toContain("shrug");
    expect(WAIT_POSES_BY_PHASE.idle).toContain("sleep");
    expect(WAIT_POSES_BY_PHASE.idle).toContain("nod");
    expect(WAIT_POSES_BY_PHASE.idle).toContain("shy");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("walk");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("jump");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("stretch");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("wave");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("celebrate");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("spin");
    expect(WAIT_POSES_BY_PHASE.idle).not.toContain("kungfu");
    expect(pickWaitPose("idle", 0)).toBeTruthy();
    expect(pickWaitEmotion("idle", 0, "idle")).toBe("neutral");
    expect(pickWaitEmotion("idle", 3, "idle")).toBe("neutral");
    expect(pickWaitEmotion("avatar-load", 1, "avatar-load")).toBeTruthy();
    const profile = pickWaitExpressionProfile("avatar-load", 0, "avatar-load");
    expect(profile.emotion).toBe("happy");
    expect(profile.nuance).toBe("none");
    expect(profile.blend).toBeTruthy();
    expect(pickWaitPose("avatar-load", 0)).toBe("wave");
  });

  it("preloads the calm idle life pool rather than the kungfu showcase", () => {
    expect(collectIdlePreloadMotionIds()).toEqual([...IDLE_LIFE_CLIP_POOL]);
  });

  it("collects expression profiles for boot warm-up", () => {
    const profiles = collectWaitPreloadExpressionProfiles();
    expect(profiles.length).toBeGreaterThan(24);
    expect(profiles.some((p) => p.nuance === "excited")).toBe(true);
  });
});
