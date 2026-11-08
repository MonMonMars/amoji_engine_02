/**
 * Tame VRM spring-bone flutter (hair/skirt blowing upward) during procedural motion.
 *
 * @pixiv/three-vrm 3.x stores joints in a Set (`manager.joints`). Using
 * `joints.length` is always undefined, so older tuners skipped every model
 * and left author gravityDir pointing up — which reads as wind from below.
 */

export const VRM_SPRING_STABILITY_SCHEMA = "amoji.vrmSpringStability.v2";

export const MIN_DRAG_FORCE = 0.88;
export const MIN_GRAVITY_POWER = 0.28;
export const MAX_STIFFNESS = 0.7;

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
 * Spring bones simulate after humanoid pose — stabilize drag/gravity so hair
 * does not look like wind is pushing from below.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
export function configureVrmSpringStability(vrm) {
  const manager = vrm?.springBoneManager;
  if (!manager) return { ok: false, reason: "no-spring-bones" };

  const joints = collectSpringJoints(
    manager.joints || manager.springBones || manager._joints,
  );
  if (!joints.length) return { ok: false, reason: "no-spring-bones" };

  let tuned = 0;
  for (const joint of joints) {
    const settings = joint?.settings;
    if (!tuneSpringJointSettings(settings)) continue;
    tuned += 1;
  }

  manager.setInitState?.();
  manager.reset?.();
  return { ok: true, tuned };
}
