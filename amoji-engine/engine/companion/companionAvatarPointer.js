/**
 * Stage pointer routing — quick tap on full body = poke; drag / pinch = camera orbit only.
 */
import * as THREE from "three";

export const COMPANION_AVATAR_POINTER_SCHEMA = "amoji.companionAvatarPointer.v3";

export const AVATAR_TAP_MOVE_PX = 14;
/** Fast tap — longer presses count as drag / orbit, not poke. */
export const AVATAR_TAP_MAX_MS = 320;

/** @deprecated kept for tests — full-body poke no longer uses waist cutoff */
export const POKE_WAIST_HEIGHT_RATIO = 0.58;

/** @deprecated kept for tests — full-body poke no longer uses screen band */
export const POKE_SCREEN_UPPER_BODY_RATIO = 0.52;

const _pokeBoxScratch = new THREE.Box3();
const _pokeSizeScratch = new THREE.Vector3();

/**
 * Waist-line world Y from an avatar bounding box (legacy helpers / tests).
 * @param {import('three').Box3 | null | undefined} fitted
 */
export function computePokeWaistWorldY(fitted) {
  if (!fitted || fitted.isEmpty()) return null;
  const size = fitted.getSize(_pokeSizeScratch);
  return fitted.min.y + size.y * POKE_WAIST_HEIGHT_RATIO;
}

/**
 * @param {import('three').Object3D | null | undefined} root
 */
export function computePokeWaistYFromObject(root) {
  if (!root) return null;
  _pokeBoxScratch.setFromObject(root);
  return computePokeWaistWorldY(_pokeBoxScratch);
}

/**
 * @param {import('three').Intersection | null | undefined} hit
 * @param {number | null | undefined} waistY
 */
export function isPokeHitAboveWaist(hit, waistY) {
  if (!hit?.point) return false;
  if (waistY == null || !Number.isFinite(waistY)) return true;
  return hit.point.y >= waistY - 1e-4;
}

const _bandBox = new THREE.Box3();
const _bandCorner = new THREE.Vector3();

/**
 * Project avatar bounds to screen pixels (legacy / diagnostics).
 * @param {import('three').Object3D | null | undefined} root
 * @param {import('three').Camera} camera
 * @param {DOMRect | null | undefined} rect
 */
export function computeAvatarScreenBand(root, camera, rect) {
  if (!root || !rect?.width || !rect?.height) return null;
  _bandBox.setFromObject(root);
  if (_bandBox.isEmpty()) return null;

  const xs = [_bandBox.min.x, _bandBox.max.x];
  const ys = [_bandBox.min.y, _bandBox.max.y];
  const zs = [_bandBox.min.z, _bandBox.max.z];
  let minSy = Infinity;
  let maxSy = -Infinity;
  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        _bandCorner.set(x, y, z).project(camera);
        const sy = rect.top + ((1 - _bandCorner.y) / 2) * rect.height;
        minSy = Math.min(minSy, sy);
        maxSy = Math.max(maxSy, sy);
      }
    }
  }
  if (!Number.isFinite(minSy) || !Number.isFinite(maxSy)) return null;
  return { top: minSy, bottom: maxSy, height: Math.max(0, maxSy - minSy) };
}

/**
 * @deprecated Full-body poke — band no longer blocks poke (drag still orbits).
 */
export function isClientInCharacterOrbitBand(
  clientY,
  band,
  upperBodyRatio = POKE_SCREEN_UPPER_BODY_RATIO,
) {
  if (!band || band.height <= 0 || !Number.isFinite(clientY)) return false;
  const pokeCutoff = band.top + band.height * upperBodyRatio;
  return clientY >= pokeCutoff - 0.5;
}

/**
 * Meshes that receive poke / hit-test (full body, not props).
 * @param {import('three').Object3D | null | undefined} root
 */
export function collectAvatarPokeMeshes(root) {
  const meshes = [];
  root?.traverse?.((obj) => {
    if (!obj?.isMesh || obj.visible === false) return;
    if (obj.userData?.companionSkipPoke) return;
    meshes.push(obj);
  });
  return meshes;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect | null | undefined} rect
 */
export function clientToNormalizedPointer(clientX, clientY, rect) {
  if (!rect?.width || !rect?.height) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

/**
 * @param {{
 *   surface: HTMLElement,
 *   rectElement?: HTMLElement,
 *   camera: import('three').Camera,
 *   getPokeMeshes: () => import('three').Object3D[],
 *   getPokeWaistY?: () => number | null,
 *   getScreenBand?: () => { top: number, bottom: number, height: number } | null,
 *   controls?: { enabled?: boolean } | null,
 *   onPoke?: (info: { point: import('three').Vector3, object: import('three').Object3D }) => void,
 *   movePx?: number,
 *   tapMaxMs?: number,
 * }} opts
 */
export function bindCompanionAvatarPointer(opts) {
  const surface = opts.surface;
  const rectEl = opts.rectElement || surface;
  const camera = opts.camera;
  const movePx = opts.movePx ?? AVATAR_TAP_MOVE_PX;
  const moveSq = movePx * movePx;
  const tapMaxMs = opts.tapMaxMs ?? AVATAR_TAP_MAX_MS;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let pointerActive = false;
  let downOnCharacter = false;
  let downX = 0;
  let downY = 0;
  let downAt = 0;
  let dragged = false;
  /** @type {Set<number>} */
  const activePointers = new Set();
  let gestureHadMultiTouch = false;

  const rect = () => rectEl.getBoundingClientRect();

  const pokeMeshes = () => {
    const list = opts.getPokeMeshes?.() || [];
    return list.length ? list : [];
  };

  const raycastAt = (clientX, clientY) => {
    const ndc = clientToNormalizedPointer(clientX, clientY, rect());
    if (!ndc) return [];
    pointer.set(ndc.x, ndc.y);
    raycaster.setFromCamera(pointer, camera);
    const meshes = pokeMeshes();
    if (!meshes.length) return [];
    return raycaster.intersectObjects(meshes, false);
  };

  const pickPokeHit = (clientX, clientY) => {
    const hits = raycastAt(clientX, clientY);
    return hits[0] || null;
  };

  const hitCharacter = (clientX, clientY) => pickPokeHit(clientX, clientY);

  const setCursor = (kind) => {
    if (!surface?.style) return;
    surface.style.cursor =
      kind === "pointer" ? "pointer" : kind === "grabbing" ? "grabbing" : "grab";
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    activePointers.add(e.pointerId);
    if (activePointers.size > 1) gestureHadMultiTouch = true;
    pointerActive = true;
    downX = e.clientX;
    downY = e.clientY;
    downAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    dragged = false;
    downOnCharacter = Boolean(hitCharacter(e.clientX, e.clientY));
    setCursor(downOnCharacter ? "pointer" : "grabbing");
  };

  const onPointerMove = (e) => {
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (pointerActive && dx * dx + dy * dy > moveSq) {
      dragged = true;
    }
    if (!pointerActive) return;
    if (dragged) {
      setCursor("grabbing");
      return;
    }
    const hit = hitCharacter(e.clientX, e.clientY);
    setCursor(hit ? "pointer" : "grab");
  };

  const onPointerUp = (e) => {
    activePointers.delete(e.pointerId);
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const elapsed =
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - downAt;
    const wasCharacter = downOnCharacter;
    const hadMulti = gestureHadMultiTouch;
    if (activePointers.size === 0) {
      gestureHadMultiTouch = false;
    }
    pointerActive = activePointers.size > 0;
    downOnCharacter = false;
    setCursor("grab");

    if (hadMulti || activePointers.size > 0) return;
    if (!wasCharacter || dragged || dx * dx + dy * dy > moveSq) return;
    if (elapsed > tapMaxMs) return;
    const hit = hitCharacter(e.clientX, e.clientY);
    if (!hit) return;
    opts.onPoke?.({ point: hit.point, object: hit.object });
  };

  const onPointerCancel = (e) => {
    if (e?.pointerId != null) activePointers.delete(e.pointerId);
    if (activePointers.size === 0) gestureHadMultiTouch = false;
    pointerActive = activePointers.size > 0;
    downOnCharacter = false;
    dragged = false;
    setCursor("grab");
  };

  surface.addEventListener("pointerdown", onPointerDown, { capture: true });
  surface.addEventListener("pointermove", onPointerMove);
  surface.addEventListener("pointerup", onPointerUp);
  surface.addEventListener("pointercancel", onPointerCancel);

  return {
    hitTest(clientX, clientY) {
      return Boolean(hitCharacter(clientX, clientY));
    },
    isPointerActive() {
      return pointerActive;
    },
    isCharacterSession() {
      return downOnCharacter;
    },
    raycastAt,
    destroy() {
      surface.removeEventListener("pointerdown", onPointerDown, { capture: true });
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
    },
  };
}
