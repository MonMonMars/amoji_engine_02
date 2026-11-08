/**
 * Plant VRM feet on the floor. Idle hip-roll currently pivots the whole
 * skeleton around the pelvis, so soles lift and the body looks like it is
 * swinging. The supporting foot is the pivot: ankles counter-flex so the
 * sole stays floor-parallel, hips stay nearly level, and root Y is nudged
 * so the lowest foot/toe stays on y = 0.
 */

export const COMPANION_FOOT_LOCK_SCHEMA = "amoji.companionFootLock.v1";

/** Idle pelvis tilt is capped — large hipZ is what lifts a foot off the floor. */
export const IDLE_HIP_TILT_SCALE = 0.22;
export const IDLE_HIP_TILT_MAX = 0.02;

/** World-Y plant clamp (meters) so a bad sample cannot yank the avatar. */
export const FOOT_PLANT_Y_MAX = 0.12;

/**
 * @param {number} hipZ
 * @param {number} [intensity]
 */
export function lockedIdleHipTilt(hipZ, intensity = 1) {
  const k = Math.max(0, Math.min(1, intensity));
  const raw = (Number(hipZ) || 0) * IDLE_HIP_TILT_SCALE * k;
  return Math.max(-IDLE_HIP_TILT_MAX, Math.min(IDLE_HIP_TILT_MAX, raw));
}

/**
 * Ankle pitch that keeps the sole parallel to the floor given thigh+shin flex.
 * VRM normalized X: extra knee/thigh flex would otherwise point the toes.
 * @param {number} upperFlex
 * @param {number} lowerFlex
 * @param {number} [restFootX]
 */
export function lockedFootPitch(upperFlex, lowerFlex, restFootX = 0) {
  const chain = (Number(upperFlex) || 0) + (Number(lowerFlex) || 0);
  return restFootX - chain;
}

/**
 * Supporting foot = the straighter (more weighted) leg.
 * @param {{ upperLegL?: number, upperLegR?: number, lowerLegL?: number, lowerLegR?: number }} pose
 * @returns {"left" | "right"}
 */
export function plantedSideFromPose(pose = {}) {
  const leftBend =
    (Number(pose.upperLegL) || 0) + (Number(pose.lowerLegL) || 0);
  const rightBend =
    (Number(pose.upperLegR) || 0) + (Number(pose.lowerLegR) || 0);
  return leftBend <= rightBend ? "left" : "right";
}

/**
 * @param {{ updateWorldMatrix?: Function, getWorldPosition?: Function } | null | undefined} bone
 * @returns {number | null}
 */
export function measureBoneWorldY(bone) {
  if (!bone?.getWorldPosition) return null;
  try {
    bone.updateWorldMatrix?.(true, false);
    const target = { x: 0, y: 0, z: 0 };
    const out = bone.getWorldPosition(target);
    const y = out?.y ?? target.y;
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

/**
 * Root Y delta that puts the lowest foot/toe on the floor plane.
 * @param {(name: string) => { getWorldPosition?: Function } | null} getBone
 * @param {number} [floorY]
 */
export function footPlantRootDelta(getBone, floorY = 0) {
  if (typeof getBone !== "function") return 0;
  const yL =
    measureBoneWorldY(getBone("leftToes")) ??
    measureBoneWorldY(getBone("leftFoot"));
  const yR =
    measureBoneWorldY(getBone("rightToes")) ??
    measureBoneWorldY(getBone("rightFoot"));
  if (yL == null && yR == null) return 0;
  const minY = Math.min(yL ?? Infinity, yR ?? Infinity);
  if (!Number.isFinite(minY)) return 0;
  const dy = floorY - minY;
  return Math.max(-FOOT_PLANT_Y_MAX, Math.min(FOOT_PLANT_Y_MAX, dy));
}

/**
 * @param {(name: string, rot: { x?: number, y?: number, z?: number }) => void} applyBoneRotation
 * @param {{
 *   leftFoot: { x: number, y: number, z: number },
 *   rightFoot: { x: number, y: number, z: number },
 * }} restFeet
 * @param {{
 *   leftUpper: number,
 *   rightUpper: number,
 *   leftLower: number,
 *   rightLower: number,
 *   hipZ?: number,
 * }} chain
 */
export function applyLockedFootRotations(applyBoneRotation, restFeet, chain) {
  if (typeof applyBoneRotation !== "function" || !restFeet) return;
  const hipZ = Number(chain?.hipZ) || 0;
  const leftX = lockedFootPitch(
    chain?.leftUpper,
    chain?.leftLower,
    restFeet.leftFoot?.x ?? 0,
  );
  const rightX = lockedFootPitch(
    chain?.rightUpper,
    chain?.rightLower,
    restFeet.rightFoot?.x ?? 0,
  );
  applyBoneRotation("leftFoot", {
    x: leftX,
    y: restFeet.leftFoot?.y ?? 0,
    z: (restFeet.leftFoot?.z ?? 0) - hipZ * 0.12,
  });
  applyBoneRotation("rightFoot", {
    x: rightX,
    y: restFeet.rightFoot?.y ?? 0,
    z: (restFeet.rightFoot?.z ?? 0) + hipZ * 0.12,
  });
  applyBoneRotation("leftToes", { x: 0, y: 0, z: 0 });
  applyBoneRotation("rightToes", { x: 0, y: 0, z: 0 });
}
