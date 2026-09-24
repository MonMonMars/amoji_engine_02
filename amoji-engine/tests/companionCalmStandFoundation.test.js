import { describe, expect, it } from "vitest";
import {
  COMPANION_CALM_STAND_FOUNDATION_SCHEMA,
  applyIdlePresentation,
  establishCalmStandFromBind,
} from "../engine/companion/companionCalmStandFoundation.js";
import { PLANTED_CALM_IDLE_BEAT_POOL } from "../engine/companion/companionIdleGender.js";
import { samplePlantedAliveIdle } from "../engine/companion/companionIdleMotion.js";

describe("companionCalmStandFoundation", () => {
  it("exports ground-zero schema", () => {
    expect(COMPANION_CALM_STAND_FOUNDATION_SCHEMA).toContain("ground-zero");
  });

  it("establishCalmStandFromBind requires vrm humanoid and body motion", () => {
    expect(establishCalmStandFromBind(null, null).ok).toBe(false);
  });

  it("applyIdlePresentation requires vrm humanoid and body motion", () => {
    expect(applyIdlePresentation(null, null).ok).toBe(false);
  });
});

describe("planted calm idle", () => {
  it("uses breath-only body without leg drift channels", () => {
    const idle = samplePlantedAliveIdle(1.2, { gender: "female" });
    expect(idle.upperLegL).toBe(0);
    expect(idle.upperLegR).toBe(0);
    expect(idle.lowerLegL).toBe(0);
    expect(idle.lowerLegR).toBe(0);
    expect(Math.abs(idle.spineX)).toBeGreaterThan(0.01);
  });

  it("planted beat pool excludes arm-lift gestures", () => {
    expect(PLANTED_CALM_IDLE_BEAT_POOL).not.toContain("comb");
    expect(PLANTED_CALM_IDLE_BEAT_POOL).not.toContain("hair");
    expect(PLANTED_CALM_IDLE_BEAT_POOL).not.toContain("cross");
  });
});
