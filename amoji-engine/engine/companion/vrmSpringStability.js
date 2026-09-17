/**
 * Tame VRM spring-bone flutter (hair/skirt blowing upward) during procedural motion.
 *
 * @pixiv/three-vrm 3.x stores joints in a Set (`manager.joints`). Using
 * `joints.length` is always undefined, so older tuners skipped every model
 * and left author gravityDir pointing up — which reads as wind from below.
 */

export const VRM_SPRING_STABILITY_SCHEMA = "amoji.vrmSpringStability.v3";

export const MIN_DRAG_FORCE = 0.92;
export const MIN_GRAVITY_POWER = 0.38;
export const MAX_STIFFNESS = 0.55;

/** Soft reset while standing idle — pulls hair/skirt back without re-capture. */
export const IDLE_SPRING_RECENTER_SEC = 5.5;

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
 * @param {object | null | undefined} settings
 */
export function tuneSpringJointSettings(settings) {
  if (!settings) return false;
  if (!(settings.dragForce >= MIN_DRAG_FORCE)) {
    settings.dragForce = MIN_DRAG_FORCE;
  }
  if (!(settings.gravityPower >= MIN_GRAVITY_POWER)) {
    settings.gravityPower = MIN_GRAVITY_POWER;
  }
  if (typeof settings.stiffness === "number" && settings.stiffness > MAX_STIFFNESS) {
    settings.stiffness = MAX_STIFFNESS;
  }
  if (settings.gravityDir) {
    forceGravityDirDown(settings.gravityDir);
  }
  return true;
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
      if (tuneSpringJointSettings(joint?.settings)) tuned += 1;
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
export function tickIdleSpringRecenter(vrm, state, dt, calm) {
  if (!state) return state;
  if (!calm || !vrm?.springBoneManager) {
    state.calmSec = 0;
    return state;
  }

  state.calmSec += Math.max(0, dt);
  if (state.calmSec < IDLE_SPRING_RECENTER_SEC) return state;

  const result = recenterVrmSpringBones(vrm, { captureInit: false });
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
export function configureVrmSpringStability(vrm) {
  const joints = getVrmSpringJoints(vrm);
  if (!joints.length) {
    return { ok: false, reason: "no-spring-bones" };
  }

  let tuned = 0;
  for (const joint of joints) {
    if (tuneSpringJointSettings(joint?.settings)) tuned += 1;
  }

  const recentered = recenterVrmSpringBones(vrm, {
    retune: false,
    captureInit: true,
  });
  return { ok: recentered.ok, tuned, joints: recentered.joints ?? joints.length };
}
