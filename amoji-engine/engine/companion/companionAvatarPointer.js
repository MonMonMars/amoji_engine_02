/**
 * Stage pointer routing — tap character to poke, drag empty space to orbit.
 */
import * as THREE from "three";

export const COMPANION_AVATAR_POINTER_SCHEMA = "amoji.companionAvatarPointer.v1";

export const AVATAR_TAP_MOVE_PX = 16;

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
 *   controls?: { enabled?: boolean } | null,
 *   onPoke?: (info: { point: import('three').Vector3, object: import('three').Object3D }) => void,
 *   movePx?: number,
 * }} opts
 */
export function bindCompanionAvatarPointer(opts) {
  const surface = opts.surface;
  const rectEl = opts.rectElement || surface;
  const camera = opts.camera;
  const movePx = opts.movePx ?? AVATAR_TAP_MOVE_PX;
  const moveSq = movePx * movePx;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  /** @type {"none" | "character" | "empty"} */
  let session = "none";
  let pointerActive = false;
  let downX = 0;
  let downY = 0;
  let dragged = false;

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

  const hitCharacter = (clientX, clientY) => raycastAt(clientX, clientY)[0] || null;

  const setControlsEnabled = (on) => {
    if (opts.controls) opts.controls.enabled = Boolean(on);
  };

  const setCursor = (kind) => {
    if (!surface?.style) return;
    surface.style.cursor =
      kind === "pointer" ? "pointer" : kind === "grabbing" ? "grabbing" : "grab";
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerActive = true;
    downX = e.clientX;
    downY = e.clientY;
    dragged = false;
    const hit = hitCharacter(e.clientX, e.clientY);
    if (hit) {
      session = "character";
      setControlsEnabled(false);
      setCursor("pointer");
    } else {
      session = "empty";
      setControlsEnabled(true);
      setCursor("grabbing");
    }
  };

  const onPointerMove = (e) => {
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (session !== "none" && dx * dx + dy * dy > moveSq) {
      dragged = true;
    }
    if (session === "character") {
      setCursor("pointer");
      return;
    }
    const hit = hitCharacter(e.clientX, e.clientY);
    setCursor(hit ? "pointer" : session === "empty" && dragged ? "grabbing" : "grab");
  };

  const onPointerUp = (e) => {
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    const wasCharacter = session === "character";
    session = "none";
    pointerActive = false;
    setControlsEnabled(true);
    setCursor("grab");
    if (!wasCharacter || dragged || dx * dx + dy * dy > moveSq) return;
    const hit = hitCharacter(e.clientX, e.clientY);
    if (!hit) return;
    opts.onPoke?.({ point: hit.point, object: hit.object });
  };

  const onPointerCancel = () => {
    session = "none";
    pointerActive = false;
    dragged = false;
    setControlsEnabled(true);
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
      return session === "character";
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
