/**
 * Keep the rest face alive without a permanently open jaw or sleepy lids.
 * VRM Happy/Surprised morphs often include teeth/jaw; Relaxed droops eyelids.
 */

export const COMPANION_FACE_REST_SCHEMA = "amoji.companionFaceRest.v1";

export const MOUTH_CLOSE_EPS = 0.035;
/** Closed-mouth hint of a smile at rest. */
export const IDLE_HAPPY_MAX = 0.08;
/** Smile while talking — visemes own the jaw. */
export const TALK_HAPPY_MAX = 0.34;
export const REST_SURPRISED_MAX = 0.16;
export const TALK_SURPRISED_MAX = 0.28;

/**
 * Viseme weight: 0 when idle so Aa/Oh cannot stick open.
 * @param {boolean} talking
 * @param {number} open
 */
export function mouthVisemeWeight(talking, open) {
  const v = Math.max(0, Math.min(1, Number(open) || 0));
  if (!talking || v < MOUTH_CLOSE_EPS) return 0;
  return v;
}

/**
 * Strip sleepy lids and cap mouth-opening emotion morphs.
 * @param {Record<string, number> | null | undefined} blend
 * @param {{ talking?: boolean }} [opts]
 */
export function clampRestFaceBlend(blend, opts = {}) {
  const talking = Boolean(opts.talking);
  /** @type {Record<string, number>} */
  const next = {};
  for (const [key, raw] of Object.entries(blend || {})) {
    const value = Math.max(0, Math.min(1, Number(raw) || 0));
    if (value <= 0) continue;
    if (key === "Relaxed") continue;
    if (key === "Happy") {
      next.Happy = Math.min(value, talking ? TALK_HAPPY_MAX : IDLE_HAPPY_MAX);
      continue;
    }
    if (key === "Surprised") {
      next.Surprised = Math.min(
        value,
        talking ? TALK_SURPRISED_MAX : REST_SURPRISED_MAX,
      );
      continue;
    }
    next[key] = value;
  }
  return next;
}
