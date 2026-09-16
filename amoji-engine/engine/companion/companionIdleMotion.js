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
  const breath = Math.sin(t * 1.05);
  const sway = Math.sin(t * 0.58 + 0.6);
  const weight = Math.sin(t * 0.42 + 1.4);
  const bob = Math.sin(t * 0.88 + 0.3);
  const energy = listening ? 1.08 : 1;
  const amp = 1.05;

  return {
    headX: (breath * 0.034 + Math.sin(t * 0.52) * 0.022) * energy * amp,
    headZ: (sway * 0.048 + weight * 0.038) * energy * amp,
    leanY: (weight * 0.072 + bob * 0.028) * energy * amp,
    spineX: 0.016 + breath * 0.028 * energy * amp,
    chestX: -0.008 + breath * 0.018 * energy * amp,
    hipZ: weight * 0.058 * energy * amp,
    armLiftL: 0.03 + Math.sin(t * 0.78 + 0.4) * 0.055 * energy * amp,
    armLiftR: 0.03 + Math.sin(t * 0.72 + 1.1) * 0.052 * energy * amp,
    forearmL: Math.max(0, Math.sin(t * 0.94 + 0.2) * 0.04 * energy * amp),
    forearmR: Math.max(0, Math.sin(t * 0.88 + 0.9) * 0.038 * energy * amp),
    upperLegL: Math.sin(t * 0.44 + 0.5) * 0.028 * energy * amp,
    upperLegR: Math.sin(t * 0.44 + 2.0) * 0.028 * energy * amp,
    lowerLegL: Math.max(0, Math.sin(t * 0.62) * 0.02 * energy * amp),
    lowerLegR: Math.max(0, Math.sin(t * 0.62 + 1.2) * 0.02 * energy * amp),
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
  // VRM "Relaxed" morphs droop eyelids — ramp in so the first frame stays awake.
  const awakeRamp = Math.min(1, Math.max(0, (t - 0.12) / 1.35));

  /** @type {Record<string, number>} */
  const blend = {
    Relaxed: (0.24 + breath * 0.34) * awakeRamp,
  };

  if (e === "happy" || e === "neutral") {
    blend.Happy = 0.12 + flutter * 0.28;
  } else if (e === "thinking") {
    blend.Relaxed = (0.34 + breath * 0.2) * awakeRamp;
  } else if (e === "sad") {
    blend.Sad = 0.55 + breath * 0.08;
    blend.Relaxed = 0.25 * awakeRamp;
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
    if (roll < 0.24) beat = "nod";
    else if (roll < 0.44) beat = "look";
    else if (roll < 0.62) beat = "shift";
    else if (roll < 0.8) beat = "fidget";
    else if (roll < 0.9) beat = "breathe";
    else beat = "sway";
    phase = 0;
    duration =
      beat === "nod"
        ? 0.95
        : beat === "look"
          ? 1.45
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
      case "shift":
        overlay.hipZ = Math.sin(p * Math.PI) * 0.075 * env;
        overlay.leanY = wave * 0.052 * env;
        overlay.spineX = 0.024 * wave * env;
        overlay.upperLegL = wave * 0.04 * env;
        overlay.upperLegR = -wave * 0.035 * env;
        break;
      case "fidget":
        overlay.armLiftL = wave * 0.1 * env;
        overlay.armLiftR = wave * 0.06 * env;
        overlay.forearmL = wave * 0.068 * env;
        overlay.forearmR = wave * 0.045 * env;
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
        overlay.hipZ = Math.sin(p * Math.PI) * 0.05 * env;
        overlay.leanY = wave * 0.044 * env;
        overlay.armLiftL = 0.04 + wave * 0.05 * env;
        overlay.armLiftR = 0.04 + wave * 0.05 * env;
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
    nextAt: nowMs + 320 + Math.random() * 680,
  };
}
