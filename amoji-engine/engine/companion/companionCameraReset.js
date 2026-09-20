/**
 * Explicit camera reset — empty-area double-click/tap, or talk start.
 * Orbit drags and single taps must not snap the view back.
 */
export const COMPANION_CAMERA_RESET_SCHEMA = "amoji.companionCameraReset.v2";

export const EMPTY_AREA_DOUBLE_TAP_MS = 420;
export const EMPTY_AREA_TAP_MOVE_PX = 14;

/**
 * @param {boolean} talking
 * @param {boolean} latched
 */
export function shouldResetCameraOnTalkStart(talking, latched) {
  return Boolean(talking) && !latched;
}

/**
 * @param {{
 *   hitTest?: (x: number, y: number) => boolean,
 *   reset?: () => void,
 *   now?: () => number,
 *   windowMs?: number,
 *   movePx?: number,
 * }} [opts]
 */
export function createEmptyAreaCameraReset(opts = {}) {
  const windowMs = opts.windowMs ?? EMPTY_AREA_DOUBLE_TAP_MS;
  const movePx = opts.movePx ?? EMPTY_AREA_TAP_MOVE_PX;
  const moveSq = movePx * movePx;
  let downX = 0;
  let downY = 0;
  let dragged = false;
  let lastEmptyTapAt = 0;
  let lastEmptyTapX = 0;
  let lastEmptyTapY = 0;
  let lastResetAt = 0;

  const nowMs = () => (opts.now ? opts.now() : Date.now());
  const isEmpty = (x, y) => !opts.hitTest?.(x, y);

  const fireReset = () => {
    const now = nowMs();
    if (lastResetAt && now - lastResetAt < 400) {
      lastEmptyTapAt = 0;
      return true;
    }
    lastResetAt = now;
    lastEmptyTapAt = 0;
    opts.reset?.();
    return true;
  };

  return {
    onPointerDown(ev) {
      downX = ev.clientX;
      downY = ev.clientY;
      dragged = false;
    },
    onPointerMove(ev) {
      const dx = ev.clientX - downX;
      const dy = ev.clientY - downY;
      if (dx * dx + dy * dy > moveSq) dragged = true;
    },
    onPointerUp(ev) {
      const dx = ev.clientX - downX;
      const dy = ev.clientY - downY;
      if (dragged || dx * dx + dy * dy > moveSq) {
        lastEmptyTapAt = 0;
        return false;
      }
      if (!isEmpty(ev.clientX, ev.clientY)) {
        lastEmptyTapAt = 0;
        return false;
      }
      const now = nowMs();
      const dt = now - lastEmptyTapAt;
      const tapDx = ev.clientX - lastEmptyTapX;
      const tapDy = ev.clientY - lastEmptyTapY;
      const nearPrev = tapDx * tapDx + tapDy * tapDy <= moveSq * 9;
      if (lastEmptyTapAt && dt >= 40 && dt < windowMs && nearPrev) {
        return fireReset();
      }
      lastEmptyTapAt = now;
      lastEmptyTapX = ev.clientX;
      lastEmptyTapY = ev.clientY;
      return false;
    },
    onDblClick(ev) {
      if (dragged) return false;
      if (!isEmpty(ev.clientX, ev.clientY)) return false;
      return fireReset();
    },
    onClick(ev) {
      const detail = Number(ev?.detail) || 0;
      if (detail < 2) return false;
      if (dragged) return false;
      if (!isEmpty(ev.clientX, ev.clientY)) return false;
      return fireReset();
    },
  };
}
