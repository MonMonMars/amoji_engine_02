import { describe, expect, it } from "vitest";
import {
  collectSpringJoints,
  configureVrmSpringStability,
  createIdleSpringRecenterState,
  forceGravityDirDown,
  getVrmSpringJoints,
  IDLE_SPRING_RECENTER_SEC,
  MIN_DRAG_FORCE,
  MIN_GRAVITY_POWER,
  MAX_STIFFNESS,
  recenterVrmSpringBones,
  tickIdleSpringRecenter,
} from "../engine/companion/vrmSpringStability.js";

function makeJoint(overrides = {}) {
  return {
    settings: {
      dragForce: 0.2,
      gravityPower: 0,
      stiffness: 1.4,
      gravityDir: {
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
        x: 0,
        y: 1,
        z: 0,
        ...overrides.gravityDir,
      },
      ...overrides.settings,
    },
  };
}

function makeManager(joints, hooks = {}) {
  let reset = 0;
  let init = 0;
  return {
    manager: {
      joints: new Set(joints),
      setInitState: () => {
        init += 1;
        hooks.setInitState?.();
      },
      reset: () => {
        reset += 1;
        hooks.reset?.();
      },
    },
    resetCount: () => reset,
    initCount: () => init,
  };
}

describe("vrmSpringStability", () => {
  it("collects joints from a Set (three-vrm 3.x API)", () => {
    const a = { settings: {} };
    const b = { settings: {} };
    expect(collectSpringJoints(new Set([a, b]))).toEqual([a, b]);
    expect(collectSpringJoints([a])).toEqual([a]);
  });

  it("flips upward gravityDir to world down", () => {
    const dir = {
      x: 0,
      y: 1,
      z: 0,
      set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
    forceGravityDirDown(dir);
    expect(dir.y).toBe(-1);
    expect(dir.x).toBe(0);
  });

  it("tunes spring bone drag and gravity on Set-backed managers", () => {
    const joint = makeJoint();
    const { manager, resetCount } = makeManager([joint]);
    const result = configureVrmSpringStability({
      springBoneManager: manager,
    });
    expect(result.ok).toBe(true);
    expect(result.tuned).toBe(1);
    expect(joint.settings.dragForce).toBeGreaterThanOrEqual(MIN_DRAG_FORCE);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(MIN_GRAVITY_POWER);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(joint.settings.stiffness).toBeLessThanOrEqual(MAX_STIFFNESS);
    expect(resetCount()).toBe(1);
  });

  it("does not treat a Set as empty just because it has no length", () => {
    const joint = makeJoint();
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

  it("recenter can reset without re-capturing init state", () => {
    const joint = makeJoint();
    const { manager, resetCount, initCount } = makeManager([joint]);
    const vrm = { springBoneManager: manager };
    const result = recenterVrmSpringBones(vrm, { captureInit: false });
    expect(result.ok).toBe(true);
    expect(result.joints).toBe(1);
    expect(resetCount()).toBe(1);
    expect(initCount()).toBe(0);
  });

  it("tickIdleSpringRecenter resets after calm idle threshold", () => {
    const joint = makeJoint();
    const { manager, resetCount } = makeManager([joint]);
    const vrm = { springBoneManager: manager };
    const state = createIdleSpringRecenterState();
    tickIdleSpringRecenter(vrm, state, 1, false);
    expect(resetCount()).toBe(0);
    expect(state.calmSec).toBe(0);

    tickIdleSpringRecenter(vrm, state, IDLE_SPRING_RECENTER_SEC, true);
    expect(resetCount()).toBe(1);
    expect(state.calmSec).toBe(0);
    expect(state.lastResetMs).toBeGreaterThan(0);
  });

  it("getVrmSpringJoints reads Set-backed managers", () => {
    const joint = makeJoint();
    expect(
      getVrmSpringJoints({ springBoneManager: { joints: new Set([joint]) } }),
    ).toEqual([joint]);
  });

  it("fails open without spring bones", () => {
    expect(configureVrmSpringStability(null).ok).toBe(false);
    expect(
      configureVrmSpringStability({ springBoneManager: { joints: new Set() } }).ok,
    ).toBe(false);
  });
});
