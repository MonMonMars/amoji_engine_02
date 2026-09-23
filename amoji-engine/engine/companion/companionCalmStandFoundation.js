/**
 * Ground-zero calm stand — rebuild idle from VRM bind rest, then warm physics.
 */
import { detectVrmIdleRestRotations } from "./companionArmRestCalibration.js";
import {
  syncHumanoidSkinnedRawFromNormalized,
} from "./companionPlantedLimbLock.js";
import { stabilizeVrmSpringBones } from "./vrmSpringStability.js";

export const COMPANION_CALM_STAND_FOUNDATION_SCHEMA =
  "amoji.companionCalmStandFoundation.v1-ground-zero";

/**
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {{
 *   update?: (dt: number, opts?: { now?: number }) => void,
 *   finishPlantedLimbLockPostUpdate?: (opts?: { hands?: boolean }) => void,
 * }} bodyMotion
 * @param {{ frames?: number, fps?: number }} [opts]
 */
export function warmCalmStandPhysics(vrm, bodyMotion, opts = {}) {
  if (!vrm || !bodyMotion?.update) return 0;
  const frames = Math.max(0, Math.min(120, Number(opts.frames) || 48));
  const fps = Math.max(24, Number(opts.fps) || 60);
  const dt = 1 / fps;
  for (let i = 0; i < frames; i += 1) {
    bodyMotion.update(dt, { now: performance.now() });
    syncHumanoidSkinnedRawFromNormalized(vrm.humanoid);
    vrm.humanoid?.update?.();
    stabilizeVrmSpringBones(vrm);
    vrm.update?.(dt);
    bodyMotion.finishPlantedLimbLockPostUpdate?.({ hands: true });
  }
  return frames;
}

/**
 * Reset humanoid → calibrated rest → planted lock → optional warm loop.
 * @param {import('@pixiv/three-vrm').VRM | null | undefined} vrm
 * @param {{
 *   setArmRestRotations?: (r: unknown) => void,
 *   setLegRestRotations?: (r: unknown) => void,
 *   setArmBind?: (b: string) => void,
 *   snapToRestPose?: () => void,
 *   enforcePlantedLimbs?: (opts?: object) => void,
 *   resetIdleLife?: (now?: number) => void,
 *   resetMotionClock?: (now?: number) => void,
 *   update?: (dt: number, opts?: { now?: number }) => void,
 *   finishPlantedLimbLockPostUpdate?: (opts?: { hands?: boolean }) => void,
 * }} bodyMotion
 * @param {{
 *   resetIdleLife?: boolean,
 *   warmFrames?: number,
 *   now?: number,
 * }} [opts]
 */
export function establishCalmStandFromBind(vrm, bodyMotion, opts = {}) {
  if (!vrm?.humanoid || !bodyMotion) {
    return { ok: false, reason: "missing-vrm-or-body" };
  }
  const now = opts.now ?? performance.now();
  vrm.humanoid.resetNormalizedPose?.();
  const rest = detectVrmIdleRestRotations(vrm, {
    characterId: opts.characterId,
    armBindHint: opts.armBindHint,
  });
  bodyMotion.setArmRestRotations?.(rest.arms);
  bodyMotion.setLegRestRotations?.(rest.legs);
  bodyMotion.setArmBind?.(rest.bind);
  bodyMotion.snapToRestPose?.();
  bodyMotion.enforcePlantedLimbs?.({
    lockUpperArms: true,
    lockForearms: true,
    hands: true,
  });
  syncHumanoidSkinnedRawFromNormalized(vrm.humanoid);
  vrm.humanoid.update?.();
  if (opts.resetIdleLife !== false) {
    bodyMotion.resetIdleLife?.(now);
  } else {
    bodyMotion.resetMotionClock?.(now);
  }
  const warmFrames = Number(opts.warmFrames);
  if (Number.isFinite(warmFrames) && warmFrames > 0) {
    warmCalmStandPhysics(vrm, bodyMotion, { frames: warmFrames });
  }
  return { ok: true, bind: rest.bind, warmFrames: warmFrames || 0 };
}
