/**
 * Gender-aware idle motion profiles — boys and girls use different sway,
 * stance, beat pools, and VRMA clip rotations while idle.
 */
export const COMPANION_IDLE_GENDER_SCHEMA = "amoji.companionIdleGender.v2-planted-calm-beats";

/** Micro-gestures that never lift arms off the planted rest pose. */
export const PLANTED_CALM_IDLE_BEAT_POOL = Object.freeze([
  "look",
  "breathe",
  "sway",
  "shift",
  "tilt",
]);

/**
 * @param {string | null | undefined} gender
 * @returns {"female" | "male"}
 */
export function normalizeIdleGender(gender) {
  const g = String(gender || "female").toLowerCase();
  if (g === "male" || g === "m" || g === "boy" || g === "man") return "male";
  return "female";
}

/**
 * Continuous idle body tuning per gender.
 * @param {string | null | undefined} gender
 */
export function idleGenderBodyProfile(gender) {
  if (normalizeIdleGender(gender) === "male") {
    return {
      swayMul: 0.74,
      hipMul: 0.58,
      headMul: 0.88,
      leanMul: 0.82,
      armLiftBaseL: 0.14,
      armLiftBaseR: 0.11,
      forearmBaseL: 0.34,
      forearmBaseR: 0.28,
      legSpread: 0.045,
      chestMul: 1.1,
      spineMul: 1.06,
    };
  }
  return {
    swayMul: 1.14,
    hipMul: 1.32,
    headMul: 1.08,
    leanMul: 1.12,
    armLiftBaseL: 0.18,
    armLiftBaseR: 0.14,
    forearmBaseL: 0.4,
    forearmBaseR: 0.35,
    legSpread: 0.012,
    chestMul: 0.94,
    spineMul: 0.96,
  };
}

/** Procedural micro-gestures while idle (between VRMA clips). */
export const PROCEDURAL_IDLE_BEAT_POOL_FEMALE = Object.freeze([
  "look",
  "breathe",
  "cross",
  "sway",
  "shift",
  "tilt",
  "softsway",
  "hair",
]);

export const PROCEDURAL_IDLE_BEAT_POOL_MALE = Object.freeze([
  "look",
  "breathe",
  "cross",
  "sway",
  "shift",
  "pocket",
  "wide",
  "chin",
]);

/** @deprecated use proceduralIdleBeatPoolForGender */
export const PROCEDURAL_IDLE_BEAT_POOL = PROCEDURAL_IDLE_BEAT_POOL_FEMALE;

/**
 * @param {string | null | undefined} gender
 * @returns {readonly string[]}
 */
export function proceduralIdleBeatPoolForGender(gender) {
  return normalizeIdleGender(gender) === "male"
    ? PROCEDURAL_IDLE_BEAT_POOL_MALE
    : PROCEDURAL_IDLE_BEAT_POOL_FEMALE;
}

/**
 * @param {string | null | undefined} beat
 * @param {string | null | undefined} gender
 */
export function isIdleBeatAllowedForGender(beat, gender) {
  const key = String(beat || "").toLowerCase();
  if (!key) return false;
  return proceduralIdleBeatPoolForGender(gender).includes(key);
}

/**
 * @param {string | null | undefined} gender
 * @returns {string}
 */
export function pickRandomProceduralIdleBeat(gender) {
  const pool = proceduralIdleBeatPoolForGender(gender);
  return pool[Math.floor(Math.random() * pool.length)] || "look";
}

/** Idle beats safe while feet/arms are hard-planted (no comb/hair/cross). */
export function pickPlantedCalmIdleBeat() {
  const pool = PLANTED_CALM_IDLE_BEAT_POOL;
  return pool[Math.floor(Math.random() * pool.length)] || "breathe";
}
