/**
 * Idle / waiting life — weight shifts, breathing, micro-gestures, soft expressions.
 */
import {
  easeInOutSine,
  idleBeatEnvelope,
} from "./companionPoseSmoothing.js";

export const COMPANION_IDLE_MOTION_SCHEMA = "amoji.companionIdleMotion.v1";

/**
 * Continuous idle body sway (not talking, not in scripted action).
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function sampleIdleBodyMotion(elapsedSec, opts = {}) {
  const t = elapsedSec;
  const listening = Boolean(opts.listening);
  const breath = Math.sin(t * 0.92);
  const sway = Math.sin(t * 0.48 + 0.6);
  const weight = Math.sin(t * 0.34 + 1.4);
  const energy = listening ? 1.08 : 1;
  const amp = 0.88;

  return {
    headX: (breath * 0.022 + Math.sin(t * 0.41) * 0.014) * energy * amp,
    headZ: (sway * 0.03 + weight * 0.026) * energy * amp,
    leanY: (weight * 0.048 + Math.sin(t * 0.72) * 0.018) * energy * amp,
    spineX: 0.012 + breath * 0.018 * energy * amp,
    chestX: -0.01 + breath * 0.011 * energy * amp,
    hipZ: weight * 0.038 * energy * amp,
    armLiftL: 0.05 + Math.sin(t * 0.62 + 0.4) * 0.062 * energy * amp,
    armLiftR: 0.05 + Math.sin(t * 0.58 + 1.1) * 0.058 * energy * amp,
    forearmL: Math.max(0, Math.sin(t * 0.76 + 0.2) * 0.044 * energy * amp),
    forearmR: Math.max(0, Math.sin(t * 0.72 + 0.9) * 0.042 * energy * amp),
  };
}

/**
 * Soft VRM expression overlay while idle (merged on top of base emotion).
 * @param {number} elapsedSec
 * @param {string} [emotion]
 */
export function sampleIdleExpressionBlend(elapsedSec, emotion = "neutral") {
  const t = elapsedSec;
  const breath = Math.sin(t * 0.52) * 0.5 + 0.5;
  const flutter = Math.sin(t * 0.29 + 1.8) * 0.5 + 0.5;
  const e = String(emotion || "neutral").toLowerCase();

  /** @type {Record<string, number>} */
  const blend = {
    Relaxed: 0.2 + breath * 0.28,
  };

  if (e === "happy" || e === "neutral") {
    blend.Happy = 0.1 + flutter * 0.22;
  } else if (e === "thinking") {
    blend.Relaxed = 0.34 + breath * 0.2;
  } else if (e === "sad") {
    blend.Sad = 0.55 + breath * 0.08;
    blend.Relaxed = 0.25;
  } else if (e === "surprised") {
    blend.Surprised = 0.15 + flutter * 0.12;
  }

  return blend;
}

/**
 * @typedef {{ beat: string | null, phase: number, duration: number, nextAt: number }} IdleBeatState
 */

/**
 * Advance periodic idle micro-gestures (nod, look, weight shift).
 * @param {IdleBeatState} state
 * @param {number} dt
 * @param {number} nowMs
 * @returns {{ state: IdleBeatState, overlay: Record<string, number> }}
 */
export function advanceIdleBeat(state, dt, nowMs) {
  let { beat, phase, duration, nextAt } = state;
  /** @type {Record<string, number>} */
  let overlay = {};

  if (!beat && nowMs >= nextAt) {
    const roll = Math.random();
    if (roll < 0.34) beat = "nod";
    else if (roll < 0.58) beat = "look";
    else if (roll < 0.8) beat = "shift";
    else beat = "fidget";
    phase = 0;
    duration =
      beat === "nod" ? 1.15 : beat === "look" ? 1.85 : beat === "shift" ? 2.1 : 1.55;
    nextAt = nowMs + 5200 + Math.random() * 7600;
  }

  if (beat) {
    phase += dt / duration;
    const p = Math.min(1, phase);
    const env = idleBeatEnvelope(p);
    const wave = easeInOutSine(p);

    switch (beat) {
      case "nod":
        overlay.headX = -0.09 * Math.sin(p * Math.PI);
        overlay.leanY = wave * 0.018 * env;
        break;
      case "look":
        overlay.headZ = Math.sin(p * Math.PI) * 0.08 * env;
        overlay.headX = wave * 0.028 * env;
        break;
      case "shift":
        overlay.hipZ = Math.sin(p * Math.PI) * 0.055 * env;
        overlay.leanY = wave * 0.038 * env;
        overlay.spineX = 0.016 * wave * env;
        break;
      case "fidget":
        overlay.armLiftL = wave * 0.07 * env;
        overlay.forearmL = wave * 0.048 * env;
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.028 * env;
        break;
      default:
        break;
    }

    if (phase >= 1) {
      beat = null;
      phase = 0;
      duration = 0;
    }
  }

  return {
    state: { beat, phase, duration, nextAt },
    overlay,
  };
}

/**
 * @param {number} [nowMs]
 * @returns {IdleBeatState}
 */
export function createIdleBeatState(nowMs = performance.now()) {
  return {
    beat: null,
    phase: 0,
    duration: 0,
    nextAt: nowMs + 2500 + Math.random() * 3500,
  };
}
