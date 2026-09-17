import { describe, expect, it } from "vitest";
import {
  collectSpringJoints,
  configureVrmSpringStability,
  forceGravityDirDown,
  MIN_DRAG_FORCE,
  MIN_GRAVITY_POWER,
} from "../engine/companion/vrmSpringStability.js";

describe("vrmSpringStability", () => {
  it("collects joints from a Set (three-vrm 3.x API)", () => {
    const a = { settings: {} };
    const b = { settings: {} };
    expect(collectSpringJoints(new Set([a, b]))).toEqual([a, b]);
    expect(collectSpringJoints([a])).toEqual([a]);
  });

  it("flips upward gravityDir to world down", () => {
    const dir = { x: 0, y: 1, z: 0, set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    } };
    forceGravityDirDown(dir);
    expect(dir.y).toBe(-1);
    expect(dir.x).toBe(0);
  });

  it("tunes spring bone drag and gravity on Set-backed managers", () => {
    const joint = {
      settings: {
        dragForce: 0.2,
        gravityPower: 0,
        stiffness: 1.4,
        gravityDir: {
          set(x, y, z) {
            joint.settings.gravityDir.x = x;
            joint.settings.gravityDir.y = y;
            joint.settings.gravityDir.z = z;
          },
          x: 0,
          y: 1,
          z: 0,
        },
      },
    };
    let reset = 0;
    const result = configureVrmSpringStability({
      springBoneManager: {
        joints: new Set([joint]),
        setInitState: () => {},
        reset: () => {
          reset += 1;
        },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.tuned).toBe(1);
    expect(joint.settings.dragForce).toBeGreaterThanOrEqual(MIN_DRAG_FORCE);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(MIN_GRAVITY_POWER);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(joint.settings.stiffness).toBeLessThanOrEqual(0.7);
    expect(reset).toBe(1);
  });

  it("does not treat a Set as empty just because it has no length", () => {
    const joint = {
      settings: {
        dragForce: 0.1,
        gravityPower: 0,
        gravityDir: {
          x: 0,
          y: 1,
          z: 0,
          set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
      },
    };
    const result = configureVrmSpringStability({
      springBoneManager: {
        joints: new Set([joint]),
        setInitState: () => {},
      },
    });
    expect(result.ok).toBe(true);
    expect(result.reason).not.toBe("no-spring-bones");
    expect(joint.settings.gravityDir.y).toBe(-1);
  });

  it("fails open without spring bones", () => {
    expect(configureVrmSpringStability(null).ok).toBe(false);
    expect(
      configureVrmSpringStability({ springBoneManager: { joints: new Set() } }).ok,
    ).toBe(false);
  });
});
