/**
 * Tame VRM spring-bone flutter (hair/skirt blowing upward) during procedural motion.
 */

export const VRM_SPRING_STABILITY_SCHEMA = "amoji.vrmSpringStability.v1";

const MIN_DRAG_FORCE = 0.58;
const MIN_GRAVITY_POWER = 0.04;

/**
 * Spring bones simulate after humanoid pose — stabilize drag/gravity so hair
 * does not look like wind is pushing from below.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 */
export function configureVrmSpringStability(vrm) {
  const manager = vrm?.springBoneManager;
  const joints = manager?.joints;
  if (!joints?.length) return { ok: false, reason: "no-spring-bones" };

  let tuned = 0;
  for (const joint of joints) {
    const settings = joint?.settings;
    if (!settings) continue;
    if (settings.dragForce < MIN_DRAG_FORCE) {
      settings.dragForce = MIN_DRAG_FORCE;
    }
    if (settings.gravityPower < MIN_GRAVITY_POWER) {
      settings.gravityPower = MIN_GRAVITY_POWER;
    }
    settings.gravityDir?.set?.(0, -1, 0);
    tuned += 1;
  }

  manager?.setInitState?.();
  return { ok: true, tuned };
}
