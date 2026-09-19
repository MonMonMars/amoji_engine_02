/**
 * Idle / waiting life — weight shifts, breathing, micro-gestures, soft expressions.
 */
import {
  easeInOutSine,
  idleBeatEnvelope,
} from "./companionPoseSmoothing.js";
import { REST_NEUTRAL_HAPPY } from "./companionFaceRest.js";
import {
  idleGenderBodyProfile,
  isIdleBeatAllowedForGender,
  normalizeIdleGender,
  pickRandomProceduralIdleBeat,
  PROCEDURAL_IDLE_BEAT_POOL,
  PROCEDURAL_IDLE_BEAT_POOL_FEMALE,
  PROCEDURAL_IDLE_BEAT_POOL_MALE,
  proceduralIdleBeatPoolForGender,
} from "./companionIdleGender.js";

export {
  normalizeIdleGender,
  PROCEDURAL_IDLE_BEAT_POOL,
  PROCEDURAL_IDLE_BEAT_POOL_FEMALE,
  PROCEDURAL_IDLE_BEAT_POOL_MALE,
  proceduralIdleBeatPoolForGender,
} from "./companionIdleGender.js";

export const COMPANION_IDLE_MOTION_SCHEMA = "amoji.companionIdleMotion.v5";

/** First seconds after avatar is visible — gentle breathe, sway, relaxed arms. */
export const BOOT_SIMPLE_IDLE_SEC = 10;

/**
 * Very light boot idle: breathing, tiny sway, natural arm hang (no VRMA / big gestures).
 * @param {number} elapsedSec
 */
export function sampleSimpleBootIdleMotion(elapsedSec, opts = {}) {
  const profile = idleGenderBodyProfile(opts.gender);
  const t = elapsedSec;
  const pulse = Math.min(1, Math.max(0, elapsedSec / 0.9));
  const breath = Math.sin(t * 0.95);
  const sway = Math.sin(t * 0.46 + 0.5) * profile.swayMul;
  const weight = Math.sin(t * 0.34 + 1.1);

  return {
    headX: (-0.012 + breath * 0.05 * pulse) * profile.headMul,
    headZ: (0.02 + (sway * 0.07 + weight * 0.03) * pulse) * profile.headMul,
    leanY: (0.03 + (sway * 0.08 + weight * 0.04) * pulse) * profile.leanMul,
    spineX: (0.02 + breath * 0.038 * pulse) * profile.spineMul,
    chestX: (-0.01 + breath * 0.026 * pulse) * profile.chestMul,
    hipZ: (0.01 + weight * 0.006 * pulse) * profile.hipMul,
    armLiftL:
      profile.armLiftBaseL + Math.sin(t * 0.55 + 0.3) * 0.05 * pulse,
    armLiftR:
      profile.armLiftBaseR + Math.sin(t * 0.5 + 1.1) * 0.045 * pulse,
    forearmL:
      profile.forearmBaseL * 0.45 +
      Math.max(0, Math.sin(t * 0.62 + 0.2) * 0.05) * pulse,
    forearmR:
      profile.forearmBaseR * 0.45 +
      Math.max(0, Math.sin(t * 0.58 + 0.9) * 0.04) * pulse,
    upperLegL: profile.legSpread,
    upperLegR: profile.legSpread,
    lowerLegL: 0.02,
    lowerLegR: 0.02,
  };
}

/**
 * Fallback idle when the hosted VRMA library is unavailable.
 * Bent limbs, planted feet, tiny breath — no root sway or fidget beats.
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function sampleCalmBreathIdle(elapsedSec, opts = {}) {
  const profile = idleGenderBodyProfile(opts.gender);
  const t = elapsedSec;
  const listening = Boolean(opts.listening);
  const breath = Math.sin(t * 0.85);
  const amp = (listening ? 1.05 : 1) * 1.55;

  return {
    headX: breath * 0.022 * amp * profile.headMul,
    headZ: 0,
    leanY: 0,
    spineX: (0.028 + breath * 0.022 * amp) * profile.spineMul,
    chestX: (-0.012 + breath * 0.018 * amp) * profile.chestMul,
    hipZ: 0.006 * profile.hipMul,
    armLiftL: profile.armLiftBaseL,
    armLiftR: profile.armLiftBaseR,
    forearmL: profile.forearmBaseL * 0.42,
    forearmR: profile.forearmBaseR * 0.42,
    upperLegL: profile.legSpread,
    upperLegR: profile.legSpread,
    lowerLegL: 0.02,
    lowerLegR: 0.02,
  };
}

/**
 * Standing idle: planted knees (no Mixamo forward-leg blend) + living upper
 * body — breathe, look, soft arm hang. Comb/look/nod overlays sit on top.
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function samplePlantedAliveIdle(elapsedSec, opts = {}) {
  const calm = sampleCalmBreathIdle(elapsedSec, opts);
  const life = sampleIdleBodyMotion(elapsedSec, opts);
  return {
    upperLegL: calm.upperLegL,
    upperLegR: calm.upperLegR,
    lowerLegL: calm.lowerLegL,
    lowerLegR: calm.lowerLegR,
    hipZ: calm.hipZ + (life.hipZ - calm.hipZ) * 0.28,
    headX: life.headX * 0.85,
    headZ: life.headZ * 0.72,
    leanY: life.leanY * 0.5,
    spineX: life.spineX,
    chestX: life.chestX,
    armLiftL: calm.armLiftL + (life.armLiftL - calm.armLiftL) * 0.22,
    armLiftR: calm.armLiftR + (life.armLiftR - calm.armLiftR) * 0.22,
    forearmL: calm.forearmL + (life.forearmL - calm.forearmL) * 0.42,
    forearmR: calm.forearmR + (life.forearmR - calm.forearmR) * 0.42,
  };
}

/**
 * Continuous idle body sway (not talking, not in scripted action).
 * @param {number} elapsedSec
 * @param {{ listening?: boolean, emotion?: string }} [opts]
 */
export function sampleIdleBodyMotion(elapsedSec, opts = {}) {
  const profile = idleGenderBodyProfile(opts.gender);
  const t = elapsedSec;
  const listening = Boolean(opts.listening);
  const breath = Math.sin(t * 1.12);
  const sway = Math.sin(t * 0.58 + 0.4) * profile.swayMul;
  const shift = Math.sin(t * 0.72);
  const bob = Math.sin(t * 0.9 + 0.3);
  const energy = (listening ? 1.08 : 1) * 1.55;
  const leftFree = Math.max(0, -shift);
  const rightFree = Math.max(0, shift);

  return {
    headX:
      (breath * 0.024 + Math.sin(t * 0.5) * 0.014) * energy * profile.headMul,
    headZ:
      (sway * 0.03 + shift * 0.016) * energy * profile.headMul,
    leanY:
      (shift * 0.022 + bob * 0.012) * energy * profile.leanMul,
    spineX: (0.018 + breath * 0.026 * energy) * profile.spineMul,
    chestX: (-0.008 + breath * 0.018 * energy) * profile.chestMul,
    hipZ: (0.008 + shift * 0.005) * energy * profile.hipMul,
    armLiftL:
      (profile.armLiftBaseL +
        breath * 0.035 +
        rightFree * 0.028 +
        Math.sin(t * 0.8 + 0.4) * 0.04) *
      energy,
    armLiftR:
      (profile.armLiftBaseR +
        breath * 0.032 +
        leftFree * 0.028 +
        Math.sin(t * 0.74 + 1.2) * 0.038) *
      energy,
    forearmL:
      (profile.forearmBaseL +
        Math.max(0, breath) * 0.055 +
        Math.sin(t * 0.9 + 0.2) * 0.06) *
      energy,
    forearmR:
      (profile.forearmBaseR +
        Math.max(0, breath) * 0.05 +
        Math.sin(t * 0.84 + 1.0) * 0.055) *
      energy,
    upperLegL: profile.legSpread,
    upperLegR: profile.legSpread,
    lowerLegL: 0.02,
    lowerLegR: 0.02,
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
  const breath = Math.sin(t * 0.42 + 0.5) * 0.5 + 0.5;
  const e = String(emotion || "neutral").toLowerCase();
  /** @type {Record<string, number>} */
  const blend = {};

  if (e === "sad") {
    blend.Sad = 0.32 + Math.sin(t * 0.52) * 0.05;
  } else if (e === "surprised") {
    blend.Surprised = 0.08 + flutter * 0.05;
  } else if (e === "angry") {
    blend.Angry = 0.28;
  } else if (e === "happy") {
    blend.Happy = 0.42 + breath * 0.12 + flutter * 0.06;
  } else if (e === "thinking") {
    blend.Sad = 0.16 + flutter * 0.04;
    blend.Surprised = 0.06 + breath * 0.05;
  } else {
    const happyFloor = REST_NEUTRAL_HAPPY * 0.72;
    blend.Happy = Math.max(
      happyFloor,
      0.22 + breath * 0.14 + flutter * 0.08,
    );
    blend.Surprised = Math.min(0.14, 0.04 + flutter * 0.08);
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
export function advanceIdleBeat(state, dt, nowMs, opts = {}) {
  let { beat, phase, duration, nextAt } = state;
  const gender = normalizeIdleGender(opts.gender);
  /** @type {Record<string, number>} */
  let overlay = {};

  if (!beat && nowMs >= nextAt) {
    beat = pickRandomProceduralIdleBeat(gender);
    phase = 0;
    duration = idleBeatDurationSec(beat);
    nextAt =
      nowMs + duration * 1000 + 280 + Math.random() * 520;
  }

  if (beat) {
    phase += dt / duration;
    const p = Math.min(1, phase);
    const env = idleBeatEnvelope(p);
    const wave = easeInOutSine(p);

    switch (beat) {
      case "look":
        overlay.headZ = Math.sin(p * Math.PI) * 0.28 * env;
        overlay.headX = wave * 0.07 * env;
        overlay.leanY = wave * 0.05 * env;
        break;
      case "comb":
        overlay.armLiftR = 0.46 * wave * env;
        overlay.forearmR = 0.42 * wave * env;
        overlay.headZ = 0.12 * wave * env;
        overlay.headX = -0.06 * wave * env;
        overlay.leanY = 0.04 * wave * env;
        break;
      case "cross":
        overlay.armLiftL = 0.24 * wave * env;
        overlay.armLiftR = 0.22 * wave * env;
        overlay.forearmL = 0.34 * wave * env;
        overlay.forearmR = 0.32 * wave * env;
        overlay.headZ = 0.05 * wave * env;
        overlay.spineX = 0.02 * wave * env;
        break;
      case "shift":
        overlay.hipZ = Math.sin(p * Math.PI) * 0.02 * env;
        overlay.leanY = wave * 0.06 * env;
        overlay.spineX = 0.028 * wave * env;
        overlay.armLiftL = wave * 0.05 * env;
        overlay.forearmL = wave * 0.06 * env;
        break;
      case "breathe":
        overlay.spineX = 0.055 * wave * env;
        overlay.chestX = 0.04 * wave * env;
        overlay.leanY = Math.sin(p * Math.PI) * 0.03 * env;
        overlay.armLiftL = wave * 0.05 * env;
        overlay.armLiftR = wave * 0.05 * env;
        break;
      case "sway":
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.06 * env;
        overlay.hipZ = Math.sin(p * Math.PI) * 0.016 * env;
        overlay.leanY = wave * 0.044 * env;
        overlay.armLiftL = 0.04 + wave * 0.05 * env;
        overlay.armLiftR = 0.04 + wave * 0.05 * env;
        break;
      case "tilt":
        overlay.hipZ = Math.sin(p * Math.PI) * 0.028 * env;
        overlay.leanY = wave * 0.07 * env;
        overlay.headZ = Math.sin(p * Math.PI) * 0.12 * env;
        overlay.headX = -0.04 * wave * env;
        overlay.spineX = 0.02 * wave * env;
        break;
      case "softsway":
        overlay.headZ = Math.sin(p * Math.PI * 2) * 0.045 * env;
        overlay.hipZ = Math.sin(p * Math.PI) * 0.022 * env;
        overlay.leanY = wave * 0.05 * env;
        overlay.armLiftL = 0.06 + wave * 0.04 * env;
        overlay.forearmL = 0.08 + wave * 0.06 * env;
        break;
      case "hair":
        overlay.armLiftR = 0.38 * wave * env;
        overlay.forearmR = 0.34 * wave * env;
        overlay.headZ = 0.1 * wave * env;
        overlay.headX = -0.05 * wave * env;
        overlay.leanY = 0.03 * wave * env;
        break;
      case "pocket":
        overlay.armLiftL = 0.22 * wave * env;
        overlay.forearmL = 0.28 * wave * env;
        overlay.hipZ = Math.sin(p * Math.PI) * 0.012 * env;
        overlay.leanY = wave * 0.04 * env;
        overlay.spineX = 0.03 * wave * env;
        break;
      case "wide":
        overlay.upperLegL = 0.06 * wave * env;
        overlay.upperLegR = 0.06 * wave * env;
        overlay.chestX = -0.02 * wave * env;
        overlay.spineX = 0.04 * wave * env;
        overlay.armLiftL = 0.08 * wave * env;
        overlay.armLiftR = 0.08 * wave * env;
        break;
      case "chin":
        overlay.armLiftR = 0.42 * wave * env;
        overlay.forearmR = 0.36 * wave * env;
        overlay.headX = 0.08 * wave * env;
        overlay.headZ = -0.06 * wave * env;
        overlay.leanY = 0.035 * wave * env;
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
    nextAt: nowMs + 40 + Math.random() * 160,
  };
}

const IDLE_BEAT_DURATION_SEC = {
  look: 1.45,
  comb: 2.0,
  cross: 1.85,
  shift: 1.75,
  breathe: 2.2,
  sway: 1.65,
  tilt: 1.7,
  softsway: 1.85,
  hair: 1.95,
  pocket: 1.8,
  wide: 1.75,
  chin: 1.9,
};

/**
 * @param {number} tick
 * @param {string | null | undefined} [gender]
 * @returns {string}
 */
export function pickProceduralIdleBeat(tick = 0, gender) {
  const pool = proceduralIdleBeatPoolForGender(gender);
  const idx = Math.abs(Math.floor(Number(tick) || 0)) % pool.length;
  return pool[idx] || "look";
}

/**
 * @param {string | null | undefined} beat
 * @returns {number}
 */
export function idleBeatDurationSec(beat) {
  const key = String(beat || "look");
  return IDLE_BEAT_DURATION_SEC[key] || 1.4;
}

/**
 * Force an idle life beat (look / comb / breathe) from wait-act ticks.
 * @param {IdleBeatState} state
 * @param {string} beat
 * @param {number} [nowMs]
 * @returns {IdleBeatState}
 */
export function startIdleBeat(state, beat, nowMs = 0, gender) {
  let key = String(beat || "look");
  if (!isIdleBeatAllowedForGender(key, gender)) {
    key = pickProceduralIdleBeat(0, gender);
  }
  const duration = IDLE_BEAT_DURATION_SEC[key] || 1.4;
  return {
    beat: IDLE_BEAT_DURATION_SEC[key] ? key : "look",
    phase: 0,
    duration,
    nextAt: Number(nowMs) + duration * 1000 + 380,
  };
}
