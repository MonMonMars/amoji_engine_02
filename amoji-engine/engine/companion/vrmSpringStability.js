/**
 * Tame VRM spring-bone flutter (hair/skirt blowing upward) during procedural motion.
 *
 * @pixiv/three-vrm 3.x stores joints in a Set (`manager.joints`). Using
 * `joints.length` is always undefined, so older tuners skipped every model
 * and left author gravityDir pointing up — which reads as wind from below.
 */
import * as THREE from "three";

export const VRM_SPRING_STABILITY_SCHEMA = "amoji.vrmSpringStability.v7";

/** High drag — stops hair/skirt tails from fluttering upward indoors. */
export const MIN_DRAG_FORCE = 0.993;
/** Strong downward pull — counters VRM files that author gravityDir (0, 1, 0). */
export const MIN_GRAVITY_POWER = 1.35;
export const MAX_STIFFNESS = 0.1;

/** Outdoor breeze — lighter drag so hair/cloth can move with wind. */
export const OUTDOOR_DRAG_FORCE = 0.78;
/** Strong enough downward pull so hair never reads as “wind from below”. */
export const OUTDOOR_GRAVITY_POWER = 0.92;
export const OUTDOOR_MAX_STIFFNESS = 0.22;

/** Side breeze only (world ±X) — no ±Z “from behind” gusts that flicker on camera. */
export const OUTDOOR_WIND_SIDE_AMP = 0.1;

/** Outdoors, avoid periodic spring resets — they read as hair “shaking”. */
export const OUTDOOR_IDLE_SPRING_RECENTER_SEC = 8;

/** @type {"indoor" | "outdoor"} */
let activeSceneWindMode = "indoor";

/** Updated each frame before spring sim — used by the spring-bone guard. */
let outdoorWindTimeSec = 0;

/** Soft reset while standing idle — pulls hair/skirt back without re-capture. */
export const IDLE_SPRING_RECENTER_SEC = 0.42;

/** Head/thinking motion still excites hair/skirt springs — reset a bit sooner. */
export const TALK_SPRING_RECENTER_SEC = 0.55;

/** LLM wait pose — procedural head tilt without TTS mouth drive. */
export const THINK_SPRING_RECENTER_SEC = 0.65;

/** World-space upward tail velocity (units/s) above which we clamp drift. */
export const MAX_UPWARD_TAIL_VEL = 0.045;

const _tailWorld = new THREE.Vector3();
const _prevTailWorld = new THREE.Vector3();

/**
 * @param {unknown} raw
 * @returns {object[]}
 */
export function collectSpringJoints(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw[Symbol.iterator] === "function") {
    try {
      return [...raw].filter(Boolean);
    } catch {
      return [];
    }
  }
  if (typeof raw.length === "number") {
    return Array.from(raw).filter(Boolean);
  }
  return [];
}

/**
 * Force world-space gravity down. Many VRM files store gravityDir as (0, 1, 0).
 * @param {{ x?: number, y?: number, z?: number, set?: Function }} dir
 */
export function forceGravityDirDown(dir) {
  if (!dir) return dir;
  dir.set?.(0, -1, 0);
  dir.x = 0;
  dir.y = -1;
  dir.z = 0;
  return dir;
}

/**
 * @param {object | null | undefined} joint
 * @returns {object | null}
 */
export function resolveSpringJointSettings(joint) {
  if (!joint || typeof joint !== "object") return null;
  if (joint.settings && typeof joint.settings === "object") return joint.settings;
  if ("gravityPower" in joint || "gravityDir" in joint || "dragForce" in joint) {
    return joint;
  }
  return null;
}

/**
 * @returns {"indoor" | "outdoor"}
 */
export function getVrmSceneWindMode() {
  return activeSceneWindMode;
}

/**
 * @param {"indoor" | "outdoor" | string | null | undefined} mode
 */
export function setVrmSceneWindMode(mode) {
  activeSceneWindMode = mode === "outdoor" ? "outdoor" : "indoor";
  return activeSceneWindMode;
}

/**
 * @param {object | null | undefined} settings
 * @param {"indoor" | "outdoor"} [mode]
 */
export function tuneSpringJointSettings(settings, mode = activeSceneWindMode) {
  if (!settings) return false;
  if (mode === "outdoor") {
    settings.dragForce = OUTDOOR_DRAG_FORCE;
    settings.gravityPower = OUTDOOR_GRAVITY_POWER;
    if (typeof settings.stiffness === "number") {
      settings.stiffness = Math.min(settings.stiffness, OUTDOOR_MAX_STIFFNESS);
    }
  } else {
    settings.dragForce = MIN_DRAG_FORCE;
    settings.gravityPower = MIN_GRAVITY_POWER;
    if (typeof settings.stiffness === "number") {
      settings.stiffness = Math.min(settings.stiffness, MAX_STIFFNESS);
    }
  }
  if (settings.gravityDir) {
    forceGravityDirDown(settings.gravityDir);
  }
  return true;
}

/**
 * @param {number} timeSec
 */
export function setOutdoorWindTimeSec(timeSec) {
  outdoorWindTimeSec = Number.isFinite(timeSec) ? timeSec : 0;
}

/**
 * Gentle side breeze — gravity stays dominantly downward (never +Y).
 * @param {{ x?: number, y?: number, z?: number, set?: Function }} dir
 * @param {number} timeSec
 * @param {number} [jointIndex]
 */
export function applyOutdoorSpringWindToGravityDir(dir, timeSec, jointIndex = 0) {
  if (!dir) return dir;
  const t = timeSec + jointIndex * 0.17;
  const side =
    Math.sin(t * 0.32) * OUTDOOR_WIND_SIDE_AMP +
    Math.sin(t * 0.17 + 0.9) * OUTDOOR_WIND_SIDE_AMP * 0.35;
  const y = -1;
  const len = Math.hypot(side, y) || 1;
  const x = side / len;
  const yn = y / len;
  if (typeof dir.set === "function") {
    dir.set(x, yn, 0);
  } else {
    dir.x = x;
    dir.y = yn;
    dir.z = 0;
  }
  return dir;
}

/**
 * @param {object | null | undefined} joint
 */
export function tuneSpringJoint(joint) {
  return tuneSpringJointSettings(resolveSpringJointSettings(joint));
}

/**
 * Keep hair/skirt gravity pointing down every frame — some VRMs author
 * gravityDir as (0, 1, 0) which reads as wind from below.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
export function stabilizeVrmSpringBones(vrm) {
  const joints = getVrmSpringJoints(vrm);
  if (!joints.length) {
    return { ok: false, reason: "no-spring-bones", joints: 0, tuned: 0 };
  }
  let tuned = 0;
  for (const joint of joints) {
    const settings = resolveSpringJointSettings(joint);
    if (tuneSpringJointSettings(settings, activeSceneWindMode)) tuned += 1;
  }
  return { ok: true, joints: joints.length, tuned, mode: activeSceneWindMode };
}

/**
 * Gentle outdoor breeze on spring gravity — only when scene is outdoor.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {number} timeSec
 */
export function tickOutdoorSceneWind(vrm, timeSec) {
  setOutdoorWindTimeSec(timeSec);
  if (activeSceneWindMode !== "outdoor") return { active: false };
  const joints = getVrmSpringJoints(vrm);
  if (!joints.length) return { active: false, joints: 0 };
  let tuned = 0;
  joints.forEach((joint, index) => {
    const settings = resolveSpringJointSettings(joint);
    if (!settings?.gravityDir) return;
    forceGravityDirDown(settings.gravityDir);
    applyOutdoorSpringWindToGravityDir(settings.gravityDir, timeSec, index);
    tuned += 1;
  });
  return { active: true, joints: tuned };
}

/**
 * After the spring sim step, clamp world-space upward tail velocity so hair
 * cannot keep drifting up under procedural head/body motion.
 * @param {object[]} joints
 * @param {number} dt
 * @param {{ maxUpVel?: number }} [opts]
 */
export function dampUpwardSpringTailDrift(joints, dt, opts = {}) {
  if (!joints?.length || dt <= 0) return { clamped: 0 };
  const maxUpVel = opts.maxUpVel ?? MAX_UPWARD_TAIL_VEL;
  let clamped = 0;

  for (const joint of joints) {
    const cur = joint?._currentTail;
    const prev = joint?._prevTail;
    const centerToWorld = joint?._getMatrixCenterToWorld?.();
    const worldToCenter = joint?._getMatrixWorldToCenter?.();
    if (!cur || !prev || !centerToWorld || !worldToCenter) continue;

    _tailWorld.copy(cur).applyMatrix4(centerToWorld);
    _prevTailWorld.copy(prev).applyMatrix4(centerToWorld);
    const upVel = (_tailWorld.y - _prevTailWorld.y) / dt;
    if (upVel <= maxUpVel) continue;

    const allowedY = _prevTailWorld.y + maxUpVel * dt * 0.15;
    _tailWorld.y = Math.min(_tailWorld.y, allowedY);
    cur.copy(_tailWorld);
    cur.applyMatrix4(worldToCenter);
    prev.copy(_prevTailWorld);
    prev.applyMatrix4(worldToCenter);
    clamped += 1;
  }

  return { clamped };
}

/**
 * Wrap springBoneManager.update so tuning + upward drift clamp always run,
 * including bootstrap vrm.update calls that bypass the avatar frame loop.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
export function installVrmSpringBoneGuard(vrm) {
  const manager = vrm?.springBoneManager;
  if (!manager || manager.__amojiSpringGuardInstalled) {
    return { ok: false, reason: manager ? "already-installed" : "no-spring-bones" };
  }
  if (typeof manager.update !== "function") {
    return { ok: false, reason: "no-update" };
  }

  const nativeUpdate = manager.update.bind(manager);
  manager.update = (delta) => {
    if (delta <= 0) return;
    const joints = getVrmSpringJoints(vrm);
    joints.forEach((joint, index) => {
      const settings = resolveSpringJointSettings(joint);
      tuneSpringJointSettings(settings, activeSceneWindMode);
      if (activeSceneWindMode === "outdoor" && settings?.gravityDir) {
        applyOutdoorSpringWindToGravityDir(
          settings.gravityDir,
          outdoorWindTimeSec,
          index,
        );
      }
    });
    nativeUpdate(delta);
    dampUpwardSpringTailDrift(joints, delta, {
      maxUpVel:
        activeSceneWindMode === "outdoor" ? MAX_UPWARD_TAIL_VEL * 1.15 : MAX_UPWARD_TAIL_VEL,
    });
  };
  manager.__amojiSpringGuardInstalled = true;
  return { ok: true };
}

/**
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @returns {object[]}
 */
export function getVrmSpringJoints(vrm) {
  const manager = vrm?.springBoneManager;
  if (!manager) return [];
  return collectSpringJoints(
    manager.joints || manager.springBones || manager._joints,
  );
}

/**
 * Snap spring bones to their baseline after the humanoid pose is settled.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {{ retune?: boolean, captureInit?: boolean }} [opts]
 */
export function recenterVrmSpringBones(vrm, opts = {}) {
  const manager = vrm?.springBoneManager;
  if (!manager) return { ok: false, reason: "no-spring-bones" };

  const joints = getVrmSpringJoints(vrm);
  if (!joints.length) return { ok: false, reason: "no-spring-bones" };

  let tuned = 0;
  if (opts.retune) {
    for (const joint of joints) {
      if (tuneSpringJoint(joint)) tuned += 1;
    }
  }

  if (opts.captureInit !== false) {
    manager.setInitState?.();
  }
  manager.reset?.();
  return { ok: true, joints: joints.length, tuned };
}

/**
 * @returns {{ calmSec: number, lastResetMs: number }}
 */
export function createIdleSpringRecenterState() {
  return { calmSec: 0, lastResetMs: 0 };
}

/**
 * Periodically reset spring tails while the avatar is in calm idle — stops
 * hair/skirt from slowly winding upward under procedural sway.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {{ calmSec: number, lastResetMs: number } | null | undefined} state
 * @param {number} dt
 * @param {boolean} calm
 */
export function tickIdleSpringRecenter(
  vrm,
  state,
  dt,
  calm,
  intervalSec = IDLE_SPRING_RECENTER_SEC,
) {
  if (!state) return state;
  if (!calm || !vrm?.springBoneManager) {
    state.calmSec = 0;
    return state;
  }

  state.calmSec += Math.max(0, dt);
  const effectiveInterval =
    activeSceneWindMode === "outdoor"
      ? Math.max(intervalSec, OUTDOOR_IDLE_SPRING_RECENTER_SEC)
      : intervalSec;
  if (state.calmSec < effectiveInterval) return state;

  const result = recenterVrmSpringBones(vrm, {
    captureInit: false,
    retune: true,
  });
  if (result.ok) {
    state.calmSec = 0;
    state.lastResetMs =
      typeof performance !== "undefined" ? performance.now() : Date.now();
  }
  return state;
}

/**
 * Spring bones simulate after humanoid pose — stabilize drag/gravity so hair
 * does not look like wind is pushing from below.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
export function configureVrmSpringStability(vrm, mode = activeSceneWindMode) {
  setVrmSceneWindMode(mode);
  const joints = getVrmSpringJoints(vrm);
  if (!joints.length) {
    return { ok: false, reason: "no-spring-bones" };
  }

  let tuned = 0;
  for (const joint of joints) {
    const settings = resolveSpringJointSettings(joint);
    if (tuneSpringJointSettings(settings, mode)) tuned += 1;
  }

  installVrmSpringBoneGuard(vrm);

  const recentered = recenterVrmSpringBones(vrm, {
    retune: false,
    captureInit: true,
  });
  return {
    ok: recentered.ok,
    tuned,
    joints: recentered.joints ?? joints.length,
    mode,
  };
}
