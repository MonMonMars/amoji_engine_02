import { describe, expect, it, beforeEach } from "vitest";
import {
  collectSpringJoints,
  auditVrmSpringGravity,
  configureVrmSpringStability,
  createIdleSpringRecenterState,
  forceGravityDirDown,
  getVrmSpringJoints,
  IDLE_SPRING_RECENTER_SEC,
  MIN_DRAG_FORCE,
  MIN_GRAVITY_POWER,
  MAX_STIFFNESS,
  OUTDOOR_DRAG_FORCE,
  OUTDOOR_GRAVITY_POWER,
  setVrmSceneWindMode,
  getVrmSceneWindMode,
  tickOutdoorSceneWind,
  applyOutdoorSpringWindToGravityDir,
  OUTDOOR_WIND_SIDE_AMP,
  recenterVrmSpringBones,
  resolveSpringJointSettings,
  tuneSpringJoint,
  stabilizeVrmSpringBones,
  tickIdleSpringRecenter,
  installVrmSpringBoneGuard,
  installVrmSpringUpdateWrapper,
  dampUpwardSpringTailDrift,
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
  beforeEach(() => {
    setVrmSceneWindMode("indoor");
  });

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

  it("flips author +Y gravity (wind from below)", () => {
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

  it("resolves settings from joint root when settings bag is missing", () => {
    const joint = {
      dragForce: 0.1,
      gravityPower: 0,
      gravityDir: { x: 0, y: 1, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    };
    expect(resolveSpringJointSettings(joint)).toBe(joint);
    tuneSpringJoint(joint);
    expect(joint.gravityDir.y).toBe(-1);
    expect(joint.gravityPower).toBeGreaterThanOrEqual(MIN_GRAVITY_POWER);
  });

  it("stabilizeVrmSpringBones enforces downward gravity every frame", () => {
    const joint = makeJoint();
    joint.settings.gravityDir.y = 1;
    joint.settings.gravityPower = 0;
    const vrm = { springBoneManager: { joints: new Set([joint]) } };
    const result = stabilizeVrmSpringBones(vrm);
    expect(result.ok).toBe(true);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(MIN_GRAVITY_POWER);
    expect(joint.settings.dragForce).toBeGreaterThanOrEqual(MIN_DRAG_FORCE);
  });

  it("getVrmSpringJoints reads Set-backed managers", () => {
    const joint = makeJoint();
    expect(
      getVrmSpringJoints({ springBoneManager: { joints: new Set([joint]) } }),
    ).toEqual([joint]);
  });

  it("switches indoor vs outdoor spring tuning", () => {
    const joint = makeJoint();
    setVrmSceneWindMode("indoor");
    tuneSpringJoint(joint);
    expect(joint.settings.dragForce).toBeGreaterThanOrEqual(MIN_DRAG_FORCE);
    expect(joint.settings.gravityDir.y).toBe(-1);

    setVrmSceneWindMode("outdoor");
    tuneSpringJoint(joint);
    expect(joint.settings.dragForce).toBe(OUTDOOR_DRAG_FORCE);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(
      OUTDOOR_GRAVITY_POWER,
    );
    expect(joint.settings.gravityDir.y).toBeLessThan(0);
    expect(getVrmSceneWindMode()).toBe("outdoor");
  });

  it("tickOutdoorSceneWind only animates gravity outdoors", () => {
    const joint = makeJoint();
    const vrm = { springBoneManager: { joints: new Set([joint]) } };
    setVrmSceneWindMode("indoor");
    expect(tickOutdoorSceneWind(vrm, 1.2).active).toBe(false);

    setVrmSceneWindMode("outdoor");
    const result = tickOutdoorSceneWind(vrm, 1.2);
    expect(result.active).toBe(true);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(joint.settings.gravityDir.z).toBe(0);
    expect(joint.settings.gravityDir.x).toBe(0);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(OUTDOOR_GRAVITY_POWER);
  });

  it("outdoor wind helper never leaves +Y gravity", () => {
    const dir = {
      x: 0,
      y: 1,
      z: 0.2,
      set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    };
    applyOutdoorSpringWindToGravityDir(dir, 2.5, 3);
    expect(dir.y).toBe(-1);
    expect(dir.z).toBe(0);
    expect(dir.x).toBe(0);
  });

  it("fails open without spring bones", () => {
    expect(configureVrmSpringStability(null).ok).toBe(false);
    expect(
      configureVrmSpringStability({ springBoneManager: { joints: new Set() } }).ok,
    ).toBe(false);
  });

  it("auditVrmSpringGravity passes when model has no spring joints", () => {
    expect(auditVrmSpringGravity(null).ok).toBe(true);
    expect(auditVrmSpringGravity(null).reason).toBe("no-spring-bones");
    expect(
      auditVrmSpringGravity({ springBoneManager: { joints: new Set() } }, { tune: false })
        .ok,
    ).toBe(true);
  });

  it("auditVrmSpringGravity requires downward gravity when joints exist", () => {
    const joint = makeJoint();
    joint.settings.gravityDir.y = 1;
    const vrm = { springBoneManager: { joints: new Set([joint]) } };
    const bad = auditVrmSpringGravity(vrm, { tune: false });
    expect(bad.ok).toBe(false);
    const good = auditVrmSpringGravity(vrm, { tune: true });
    expect(good.ok).toBe(true);
    expect(good.maxY).toBeLessThan(-0.5);
  });

  it("falls back to _sortedJoints when Set is empty", () => {
    const joint = makeJoint();
    const vrm = {
      springBoneManager: {
        joints: new Set(),
        _sortedJoints: [joint],
      },
    };
    expect(getVrmSpringJoints(vrm)).toEqual([joint]);
  });

  it("installVrmSpringUpdateWrapper tunes gravity before vrm.update", () => {
    const joint = makeJoint();
    joint.settings.gravityDir.y = 1;
    let springCalls = 0;
    const vrm = {
      springBoneManager: { joints: new Set([joint]) },
      update(delta) {
        expect(delta).toBe(1 / 60);
        springCalls += 1;
      },
    };
    configureVrmSpringStability(vrm);
    expect(vrm.__amojiSpringUpdateWrapped).toBe(true);
    vrm.update(1 / 60);
    expect(springCalls).toBe(1);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(installVrmSpringUpdateWrapper(vrm).reason).toBe("already-wrapped");
  });

  it("installVrmSpringBoneGuard wraps manager.update once", () => {
    const joint = makeJoint();
    let nativeCalls = 0;
    const manager = {
      joints: new Set([joint]),
      update(delta) {
        nativeCalls += 1;
        expect(delta).toBe(1 / 60);
      },
      setInitState: () => {},
      reset: () => {},
    };
    const vrm = { springBoneManager: manager };
    configureVrmSpringStability(vrm);
    manager.update(1 / 60);
    expect(nativeCalls).toBe(1);
    expect(joint.settings.gravityDir.y).toBe(-1);
    expect(installVrmSpringBoneGuard(vrm).ok).toBe(true);
    expect(installVrmSpringBoneGuard(vrm).reason).toBe("already-installed");
  });

  it("dampUpwardSpringTailDrift clamps rising tail velocity", () => {
    const centerToWorld = {
      elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    };
    const makeTail = (y) => ({
      x: 0,
      y,
      z: 0,
      copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
      },
      applyMatrix4() {
        return this;
      },
    });
    const joint = {
      _currentTail: makeTail(0.2),
      _prevTail: makeTail(0),
      _getMatrixCenterToWorld: () => centerToWorld,
      _getMatrixWorldToCenter: () => centerToWorld,
    };
    const result = dampUpwardSpringTailDrift([joint], 1 / 60, { maxUpVel: 0.01 });
    expect(result.clamped).toBe(1);
    expect(joint._currentTail.y).toBeLessThan(0.2);
  });
});
