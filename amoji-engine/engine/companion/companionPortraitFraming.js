/**
 * Shared default portrait / upper-body camera framing for VRM + GLTF avatars.
 */
import * as THREE from "three";

export const COMPANION_PORTRAIT_FRAMING_SCHEMA = "amoji.companionPortraitFraming.v1";

/** Chest-level orbit target (ratio from feet to head). */
export const UPPER_BODY_ANCHOR_RATIO = 0.5;
/** How much head height influences anchor (lower = more chest framing). */
export const HEAD_ANCHOR_BLEND = 0.16;

/** Default portrait field of view — slightly wide for shoulders in frame. */
export const PORTRAIT_FOV = 36;

/** Camera distance ≈ 2× character height keeps head-to-waist in view. */
export const PORTRAIT_DIST_FACTOR = 1.95;
export const PORTRAIT_DIST_MIN = 1.68;

/**
 * @param {number} fittedHeight
 */
export function portraitDistanceForHeight(fittedHeight) {
  const h = Math.max(fittedHeight, 0.001);
  return Math.max(PORTRAIT_DIST_MIN, h * PORTRAIT_DIST_FACTOR);
}

/**
 * @param {import('three').Box3} fitted
 * @param {import('three').Vector3 | null | undefined} headWorld
 * @param {import('three').Vector3} [out]
 */
export function computeUpperBodyAnchor(fitted, headWorld, out = new THREE.Vector3()) {
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const upperBodyY = fitted.min.y + fittedSize.y * UPPER_BODY_ANCHOR_RATIO;
  if (headWorld) {
    out.copy(headWorld);
    out.y = out.y * HEAD_ANCHOR_BLEND + upperBodyY * (1 - HEAD_ANCHOR_BLEND);
  } else {
    fitted.getCenter(out);
    out.y = upperBodyY;
  }
  return out;
}

/**
 * @param {{
 *   camera: import('three').PerspectiveCamera,
 *   controls: import('three').OrbitControls,
 *   anchor: import('three').Vector3,
 *   fittedHeight: number,
 * }} opts
 */
export function applyUpperBodyPortraitFrame(opts) {
  const portraitDist = portraitDistanceForHeight(opts.fittedHeight);
  opts.controls.target.copy(opts.anchor);
  opts.camera.position.set(
    opts.anchor.x,
    opts.anchor.y + 0.02,
    opts.anchor.z + portraitDist,
  );
  opts.camera.fov = PORTRAIT_FOV;
  opts.camera.updateProjectionMatrix();
  opts.controls.minDistance = portraitDist * 0.78;
  opts.controls.maxDistance = portraitDist * 3.2;
  opts.controls.minPolarAngle = Math.PI * 0.34;
  opts.controls.maxPolarAngle = Math.PI * 0.62;
  opts.controls.update();
  return portraitDist;
}
