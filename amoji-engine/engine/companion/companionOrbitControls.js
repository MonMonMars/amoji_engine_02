/**
 * Shared OrbitControls setup so drag/pinch can rotate the companion camera.
 */
import * as THREE from "three";
import { applyUserOrbitLimits } from "./companionPortraitFraming.js";

export const COMPANION_ORBIT_CONTROLS_SCHEMA = "amoji.companionOrbitControls.v1";

/**
 * @param {{
 *   canvas?: HTMLElement | null,
 *   controlsElement?: HTMLElement | null,
 * }} [opts]
 * @returns {HTMLElement | null | undefined}
 */
export function resolveOrbitDomElement(opts = {}) {
  const el = opts.controlsElement || opts.canvas || null;
  if (el?.style) {
    el.style.touchAction = "none";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.webkitTouchCallout = "none";
    if (!el.style.cursor) el.style.cursor = "grab";
  }
  return el;
}

/**
 * @param {import('three').OrbitControls} controls
 */
export function configureCompanionOrbitControls(controls) {
  if (!controls) return controls;
  applyUserOrbitLimits(controls);
  controls.enabled = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 1.45;
  controls.zoomSpeed = 1.2;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  return controls;
}

/**
 * Keep iOS from treating companion drags as page scroll.
 * @param {HTMLElement | null | undefined} el
 */
export function bindOrbitTouchGuard(el) {
  if (!el?.addEventListener) return () => {};
  const onTouchMove = (event) => {
    if (event.cancelable) event.preventDefault();
  };
  el.addEventListener("touchmove", onTouchMove, { passive: false });
  return () => {
    el.removeEventListener("touchmove", onTouchMove);
  };
}

/**
 * Pause auto-camera for as long as OrbitControls actually owns the gesture.
 * @param {{ addEventListener?: Function, removeEventListener?: Function } | null | undefined} controls
 * @param {() => void} [onStart]
 * @param {() => void} [onEnd]
 */
export function bindOrbitControlSession(controls, onStart, onEnd) {
  if (!controls?.addEventListener) return () => {};
  const start = () => onStart?.();
  const end = () => onEnd?.();
  controls.addEventListener("start", start);
  controls.addEventListener("end", end);
  return () => {
    controls.removeEventListener?.("start", start);
    controls.removeEventListener?.("end", end);
  };
}
