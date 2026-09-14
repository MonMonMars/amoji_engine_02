/**
 * Idle / waiting life — weight shifts, breathing, micro-gestures, soft expressions.
 */

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
  const weight = Math.sin(t * 0.39 + 1.4);
  const energy = listening ? 1.12 : 1;

  return {
    headX: (breath * 0.028 + Math.sin(t * 0.47) * 0.018) * energy,
    headZ: (sway * 0.038 + weight * 0.032) * energy,
    leanY: (weight * 0.062 + Math.sin(t * 0.82) * 0.024) * energy,
    spineX: 0.014 + breath * 0.022 * energy,
    chestX: -0.01 + breath * 0.014 * energy,
    hipZ: weight * 0.048 * energy,
    armLiftL: 0.06 + Math.sin(t * 0.71 + 0.4) * 0.078 * energy,
    armLiftR: 0.06 + Math.sin(t * 0.66 + 1.1) * 0.074 * energy,
    forearmL: Math.max(0, Math.sin(t * 0.88 + 0.2) * 0.058 * energy),
    forearmR: Math.max(0, Math.sin(t * 0.84 + 0.9) * 0.055 * energy),
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
      beat === "nod" ? 0.95 : beat === "look" ? 1.5 : beat === "shift" ? 1.8 : 1.35;
    nextAt = nowMs + 4200 + Math.random() * 6800;
  }

  if (beat) {
    phase += dt / duration;
    const p = Math.min(1, phase);
    const wave = Math.sin(p * Math.PI);

    switch (beat) {
      case "nod":
        overlay.headX = -0.11 * Math.sin(p * Math.PI * 2);
        overlay.leanY = wave * 0.022;
        break;
      case "look":
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.11;
        overlay.headX = Math.sin(p * Math.PI) * 0.04;
        break;
      case "shift":
        overlay.hipZ = Math.sin(p * Math.PI * 2) * 0.07;
        overlay.leanY = Math.sin(p * Math.PI) * 0.05;
        overlay.spineX = 0.02 * wave;
        break;
      case "fidget":
        overlay.armLiftL = wave * 0.09;
        overlay.forearmL = wave * 0.06;
        overlay.headZ = Math.sin(p * Math.PI * 3) * 0.04;
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
