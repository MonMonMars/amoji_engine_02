import { describe, expect, it, vi } from "vitest";
import {
  primeBodyMotionPoses,
  startPerformancePreload,
  warmAvatarExpressionProfiles,
} from "../engine/companion/companionPerformancePreload.js";
import {
  collectWaitPreloadExpressionProfiles,
  collectWaitPreloadMotionIds,
} from "../engine/companion/companionWaitAssets.js";

describe("companionPerformancePreload", () => {
  it("warms many body motion pose samples", () => {
    const ids = collectWaitPreloadMotionIds();
    const result = primeBodyMotionPoses(ids);
    expect(result.ok).toBe(true);
    expect(result.warmed).toBeGreaterThan(30);
  });

  it("warms avatar expression profiles", async () => {
    const applyExpressionProfile = vi.fn();
    const setEmotion = vi.fn();
    const warmExpressionPresets = vi.fn();
    const result = await warmAvatarExpressionProfiles(
      {
        applyExpressionProfile,
        setEmotion,
        warmExpressionPresets,
      },
      { maxProfiles: 4 },
    );
    expect(result.ok).toBe(true);
    expect(warmExpressionPresets).toHaveBeenCalled();
    expect(applyExpressionProfile).toHaveBeenCalled();
    expect(setEmotion).toHaveBeenCalledWith("neutral");
  });

  it("starts motion and expression preload in parallel", async () => {
    const ensureWaitMotions = vi.fn(async () => ({ ok: true }));
    const ensureFullMotionLibrary = vi.fn(async () => ({ ok: true }));
    const applyExpressionProfile = vi.fn();
    const result = await startPerformancePreload({
      avatar: { applyExpressionProfile, setEmotion: vi.fn() },
      motionClient: { ensureWaitMotions, ensureFullMotionLibrary },
      maxExpressionProfiles: 3,
    });
    expect(result.poses.warmed).toBeGreaterThan(20);
    expect(result.idleTalkPoses.warmed).toBeGreaterThanOrEqual(60);
    expect(result.speechFace.warmed).toBeGreaterThan(20);
    expect(ensureWaitMotions).toHaveBeenCalled();
    expect(ensureFullMotionLibrary).toHaveBeenCalled();
    expect(result.expressions.ok).toBe(true);
  });

  it("collects many expression profiles for preload", () => {
    const profiles = collectWaitPreloadExpressionProfiles();
    expect(profiles.length).toBeGreaterThan(20);
    expect(profiles[0].blend).toBeTruthy();
  });
});
