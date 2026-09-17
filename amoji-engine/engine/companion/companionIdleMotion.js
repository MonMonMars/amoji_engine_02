/**
 * Idle / waiting life — weight shifts, breathing, micro-gestures, soft expressions.
 */
import {
  easeInOutSine,
  idleBeatEnvelope,
} from "./companionPoseSmoothing.js";

export const COMPANION_IDLE_MOTION_SCHEMA = "amoji.companionIdleMotion.v1";

/** First seconds after avatar is visible — gentle breathe, sway, relaxed arms. */
export const BOOT_SIMPLE_IDLE_SEC = 10;

/**
 * Very light boot idle: breathing, tiny sway, natural arm hang (no VRMA / big gestures).
 * @param {number} elapsedSec
 */
export function sampleSimpleBootIdleMotion(elapsedSec) {
  const t = elapsedSec;
  const pulse = Math.min(1, Math.max(0, elapsedSec / 0.9));
  const breath = Math.sin(t * 0.95);
  const sway = Math.sin(t * 0.46 + 0.5);
  const weight = Math.sin(t * 0.34 + 1.1);

  return {
    headX: -0.012 + breath * 0.05 * pulse,
    headZ: 0.02 + (sway * 0.07 + weight * 0.03) * pulse,
    leanY: 0.03 + (sway * 0.08 + weight * 0.04) * pulse,
    spineX: 0.02 + breath * 0.038 * pulse,
    chestX: -0.01 + breath * 0.026 * pulse,
    hipZ: 0.018 + weight * 0.012 * pulse,
    armLiftL: 0.16 + Math.sin(t * 0.55 + 0.3) * 0.05 * pulse,
    armLiftR: 0.12 + Math.sin(t * 0.5 + 1.1) * 0.045 * pulse,
    forearmL: 0.4 + Math.max(0, Math.sin(t * 0.62 + 0.2) * 0.08) * pulse,
    forearmR: 0.34 + Math.max(0, Math.sin(t * 0.58 + 0.9) * 0.07) * pulse,
    upperLegL: 0.06 + Math.max(0, -weight) * 0.05 * pulse,
    upperLegR: 0.14 + Math.max(0, weight) * 0.07 * pulse,
    lowerLegL: 0.16 + Math.max(0, -weight) * 0.06 * pulse,
    lowerLegR: 0.28 + Math.max(0, weight) * 0.08 * pulse,
  };
}

/**
 * Fallback idle when the hosted VRMA library is unavailable.
 * Bent limbs, planted feet, tiny breath — no root sway or fidget beats.
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function sampleCalmBreathIdle(elapsedSec, opts = {}) {
  const t = elapsedSec;
  const listening = Boolean(opts.listening);
  const breath = Math.sin(t * 0.85);
  const amp = listening ? 1.05 : 1;

  return {
    headX: breath * 0.01 * amp,
    headZ: 0,
    leanY: 0,
    spineX: 0.018 + breath * 0.01 * amp,
    chestX: -0.01 + breath * 0.008 * amp,
    hipZ: 0.008,
    armLiftL: 0.16,
    armLiftR: 0.12,
    forearmL: 0.4,
    forearmR: 0.34,
    upperLegL: 0.04,
    upperLegR: 0.045,
    lowerLegL: 0.12,
    lowerLegR: 0.13,
  };
}

/**
 * Continuous idle body sway (not talking, not in scripted action).
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function sampleIdleBodyMotion(elapsedSec, opts = {}) {
  const t = elapsedSec;
  const listening = Boolean(opts.listening);
  const breath = Math.sin(t * 1.12);
  const sway = Math.sin(t * 0.58 + 0.4);
  const shift = Math.sin(t * 0.72);
  const bob = Math.sin(t * 0.9 + 0.3);
  const energy = listening ? 1.08 : 1;
  const leftFree = Math.max(0, -shift);
  const rightFree = Math.max(0, shift);

  return {
    headX: (breath * 0.05 + Math.sin(t * 0.5) * 0.03) * energy,
    headZ: (sway * 0.07 + shift * 0.035) * energy,
    leanY: (shift * 0.055 + bob * 0.028) * energy,
    spineX: 0.02 + breath * 0.042 * energy,
    chestX: -0.01 + breath * 0.028 * energy,
    hipZ: (0.016 + shift * 0.014) * energy,
    armLiftL: (0.16 + breath * 0.04 + rightFree * 0.05 + Math.sin(t * 0.8 + 0.4) * 0.05) * energy,
    armLiftR: (0.12 + breath * 0.035 + leftFree * 0.05 + Math.sin(t * 0.74 + 1.2) * 0.045) * energy,
    forearmL: (0.38 + Math.max(0, breath) * 0.07 + Math.sin(t * 0.9 + 0.2) * 0.08) * energy,
    forearmR: (0.32 + Math.max(0, breath) * 0.06 + Math.sin(t * 0.84 + 1.0) * 0.07) * energy,
    upperLegL: (0.06 + leftFree * 0.08) * energy,
    upperLegR: (0.14 + rightFree * 0.1) * energy,
    lowerLegL: (0.16 + leftFree * 0.1) * energy,
    lowerLegR: (0.28 + rightFree * 0.13) * energy,
  };
}

/**
 * Soft VRM expression overlay while idle (merged on top of base emotion).
 * @param {number} elapsedSec
 * @param {string} [emotion]
 */
export function sampleIdleExpressionBlend(elapsedSec, emotion = "neutral") {
  const t = elapsedSec;
  const flutter = Math.sin(t * 0.29 + 1.8) * 0.5 + 0.5;
  const e = String(emotion || "neutral").toLowerCase();
  /** @type {Record<string, number>} */
  const blend = {};

  if (e === "sad") {
    blend.Sad = 0.32 + Math.sin(t * 0.52) * 0.05;
  } else if (e === "surprised") {
    blend.Surprised = 0.08 + flutter * 0.05;
  } else if (e === "angry") {
    blend.Angry = 0.28;
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
    if (roll < 0.2) beat = "nod";
    else if (roll < 0.38) beat = "look";
    else if (roll < 0.52) beat = "comb";
    else if (roll < 0.66) beat = "shift";
    else if (roll < 0.8) beat = "fidget";
    else if (roll < 0.9) beat = "breathe";
    else beat = "sway";
    phase = 0;
    duration =
      beat === "nod"
        ? 0.95
        : beat === "look"
          ? 1.45
          : beat === "comb"
            ? 2.1
            : beat === "shift"
              ? 1.75
              : beat === "fidget"
                ? 1.35
                : beat === "breathe"
                  ? 2.2
                  : 1.65;
    nextAt = nowMs + 1600 + Math.random() * 2800;
  }

  if (beat) {
    phase += dt / duration;
    const p = Math.min(1, phase);
    const env = idleBeatEnvelope(p);
    const wave = easeInOutSine(p);

    switch (beat) {
      case "nod":
        overlay.headX = -0.12 * Math.sin(p * Math.PI);
        overlay.leanY = wave * 0.028 * env;
        break;
      case "look":
        overlay.headZ = Math.sin(p * Math.PI) * 0.11 * env;
        overlay.headX = wave * 0.038 * env;
        break;
      case "comb":
        overlay.armLiftR = 0.72 * wave * env;
        overlay.forearmR = 0.55 * wave * env;
        overlay.headZ = 0.07 * wave * env;
        overlay.headX = -0.04 * wave * env;
        overlay.leanY = 0.03 * wave * env;
        break;
      case "shift":
        overlay.hipZ = Math.sin(p * Math.PI) * 0.02 * env;
        overlay.leanY = wave * 0.06 * env;
        overlay.spineX = 0.028 * wave * env;
        overlay.armLiftL = wave * 0.05 * env;
        overlay.forearmL = wave * 0.06 * env;
        break;
      case "fidget":
        overlay.armLiftL = wave * 0.12 * env;
        overlay.armLiftR = wave * 0.08 * env;
        overlay.forearmL = wave * 0.12 * env;
        overlay.forearmR = wave * 0.08 * env;
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.038 * env;
        break;
      case "breathe":
        overlay.spineX = 0.03 * wave * env;
        overlay.chestX = 0.022 * wave * env;
        overlay.leanY = Math.sin(p * Math.PI) * 0.024 * env;
        overlay.armLiftL = wave * 0.045 * env;
        overlay.armLiftR = wave * 0.045 * env;
        break;
      case "sway":
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.06 * env;
        overlay.hipZ = Math.sin(p * Math.PI) * 0.016 * env;
        overlay.leanY = wave * 0.044 * env;
        overlay.armLiftL = 0.04 + wave * 0.05 * env;
        overlay.armLiftR = 0.04 + wave * 0.05 * env;
        break;
      default:
        beat = null;
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
    nextAt: nowMs + 320 + Math.random() * 680,
  };
}
