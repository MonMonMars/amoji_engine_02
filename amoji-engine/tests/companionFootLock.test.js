import { describe, expect, it } from "vitest";
import {
  applyLockedFootRotations,
  footPlantRootDelta,
  lockedFootPitch,
  lockedIdleHipTilt,
  plantedSideFromPose,
} from "../engine/companion/companionFootLock.js";

describe("companionFootLock", () => {
  it("caps idle hip tilt so the pelvis cannot lift a foot", () => {
    expect(Math.abs(lockedIdleHipTilt(0.2))).toBeLessThanOrEqual(0.02);
    expect(Math.abs(lockedIdleHipTilt(-0.2))).toBeLessThanOrEqual(0.02);
    expect(lockedIdleHipTilt(0.04)).toBeGreaterThan(0);
  });

  it("counters thigh+shin flex so the sole stays floor-parallel", () => {
    expect(lockedFootPitch(0.12, 0.22, { x: 0.04 }, "x")).toBeCloseTo(0.04 - 0.34);
    expect(lockedFootPitch(0, 0, { x: 0.1 }, "x")).toBeCloseTo(0.1);
    expect(lockedFootPitch(0.08, 0.12, { z: 0.2 }, "z")).toBeCloseTo(0.2 - 0.2);
  });

  it("plants the straighter (weighted) leg", () => {
    expect(
      plantedSideFromPose({
        upperLegL: 0.02,
        lowerLegL: 0.05,
        upperLegR: 0.08,
        lowerLegR: 0.14,
      }),
    ).toBe("left");
    expect(
      plantedSideFromPose({
        upperLegL: 0.2,
        lowerLegL: 0.2,
        upperLegR: 0.02,
        lowerLegR: 0.04,
      }),
    ).toBe("right");
  });

  it("writes locked ankle pitch onto both feet", () => {
    /** @type {Record<string, { x: number, y: number, z: number }>} */
    const bones = {};
    applyLockedFootRotations(
      (name, rot) => {
        bones[name] = rot;
      },
      {
        leftFoot: { x: 0.04, y: 0.02, z: 0 },
        rightFoot: { x: 0.1, y: -0.03, z: 0.02 },
      },
      {
        leftUpper: 0.06,
        leftLower: 0.15,
        rightUpper: 0.2,
        rightLower: 0.34,
        hipZ: 0.05,
      },
    );
    expect(bones.leftFoot.x).toBeCloseTo(0.04 - 0.21);
    expect(bones.rightFoot.x).toBeCloseTo(0.1 - 0.54);
    expect(bones.leftToes).toEqual({ x: 0, y: 0, z: 0 });
    expect(bones.rightToes).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("returns a root Y delta that drops a floating foot onto the floor", () => {
    const bones = {
      leftFoot: {
        getWorldPosition(v) {
          v.y = 0.05;
          return v;
        },
      },
      rightFoot: {
        getWorldPosition(v) {
          v.y = 0.01;
          return v;
        },
      },
    };
    const dy = footPlantRootDelta((name) => bones[name] || null, 0);
    expect(dy).toBeCloseTo(-0.01);
  });

  it("skips plant without world positions", () => {
    expect(footPlantRootDelta(() => ({ rotation: { x: 0 } }), 0)).toBe(0);
  });
});
