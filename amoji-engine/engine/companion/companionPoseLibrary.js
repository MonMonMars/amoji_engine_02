/**
 * VRM companion pose library — arms-down rest/listen, talkGestures for speech only.
 */
import {
  sampleTalkGesture,
  TALK_GESTURE_STYLES,
} from "../face/talkGestures.js";
import { talkGesturePoseToBody } from "./companionTalkMotionBridge.js";

export const COMPANION_POSE_LIBRARY_SCHEMA = "amoji.companionPoseLibrary.v1";

/**
 * Normalized bone rotations that drop this VRM rig from bind T-pose to a
 * living stand: arms hang at the sides, elbows bent. Extra upper-arm X
 * pitches both limbs forward (Mixamo T-pose blend) — keep it tiny.
 * (0,0,0) on upper arms is horizontal T-pose — not arms-at-sides.
 */
export const VRM_ARM_REST_ROTATIONS = Object.freeze({
  leftUpperArm: { x: 0.06, y: 0.08, z: -1.42 },
  rightUpperArm: { x: 0.05, y: -0.06, z: 1.42 },
  leftLowerArm: { x: 0.62, y: 0.14, z: 0.1, flexAxis: "x" },
  rightLowerArm: { x: 0.5, y: -0.1, z: -0.08, flexAxis: "x" },
});

/**
 * Authored A-pose (VRoid / photoreal) already hangs the arms. Only a
 * small in-toward-body nudge — a Mixamo T-pose drop on top twists elbows
 * straight, and extra X blends both arms forward of the hips.
 */
export const VRM_APOSE_ARM_REST_ROTATIONS = Object.freeze({
  leftUpperArm: { x: 0.05, y: 0.06, z: -0.14 },
  rightUpperArm: { x: 0.04, y: -0.05, z: 0.14 },
  leftLowerArm: { x: 0.14, y: 0.05, z: 0.05, flexAxis: "x" },
  rightLowerArm: { x: 0.12, y: -0.04, z: -0.04, flexAxis: "x" },
});

/** Planted stand — thighs under the hips, knees softly bent. Extra upper-leg X is a forward kick. */
export const VRM_LEG_REST_ROTATIONS = Object.freeze({
  leftUpperLeg: { x: 0.02, y: 0.02, z: 0.01 },
  rightUpperLeg: { x: 0.02, y: -0.02, z: -0.01 },
  leftLowerLeg: { x: 0.22, y: 0, z: 0, flexAxis: "x" },
  rightLowerLeg: { x: 0.22, y: 0, z: 0, flexAxis: "x" },
});

/** Soft wrists so palms aren't T-pose flat. */
export const VRM_HAND_REST_ROTATIONS = Object.freeze({
  leftHand: { x: 0.16, y: 0.26, z: 0.2 },
  rightHand: { x: 0.14, y: -0.22, z: -0.16 },
});

/** Slight symmetric foot turnout so soles stay floor-parallel. */
export const VRM_FOOT_REST_ROTATIONS = Object.freeze({
  leftFoot: { x: 0.02, y: 0.02, z: 0 },
  rightFoot: { x: 0.02, y: -0.02, z: 0 },
});

/** Natural standing — bent elbows, cocked hip, not a stick figure. */
export const REST_POSE = Object.freeze({
  armLiftL: 0.18,
  armLiftR: 0.12,
  forearmL: 0.38,
  forearmR: 0.32,
  headX: -0.015,
  headZ: 0.02,
  spineX: 0.018,
  chestX: -0.012,
    hipZ: 0.008,
    leanY: 0.012,
    upperLegL: 0.02,
    upperLegR: 0.02,
    lowerLegL: 0.1,
    lowerLegR: 0.1,
});

/** Mic on / waiting — attentive but arms stay down (humans don't raise arms to listen). */
export const LISTENING_POSE = Object.freeze({
  ...REST_POSE,
  headX: -0.025,
  headZ: 0.035,
  leanY: 0.025,
  spineX: 0.012,
});

/** Face-only emotion offsets layered on rest/listen — no arm lifts. */
export const EMOTION_FACE_OFFSET = Object.freeze({
  neutral: { headX: 0, headZ: 0, spineX: 0 },
  happy: { headX: -0.02, headZ: 0.025, spineX: 0.008, hipZ: -0.008 },
  thinking: { headX: 0.035, headZ: -0.04, spineX: 0.015 },
  sad: { headX: 0.05, headZ: 0.03, spineX: 0.025, chestX: 0.02 },
  surprised: { headX: -0.06, headZ: 0, spineX: -0.02, chestX: -0.015 },
  angry: { headX: 0.03, headZ: -0.035, spineX: 0.02, chestX: 0.015 },
});

/** Grok Ani–style nuance overlays on top of base emotion pose. */
export const NUANCE_FACE_OFFSET = Object.freeze({
  none: { headX: 0, headZ: 0, leanY: 0, spineX: 0 },
  shy: { headX: 0.045, headZ: 0.055, leanY: -0.01, spineX: 0.01 },
  curious: { headX: -0.03, headZ: -0.05, leanY: 0.028, spineX: 0.008 },
  excited: { headX: -0.045, headZ: 0.02, leanY: 0.015, hipZ: -0.01 },
  love: { headX: -0.025, headZ: 0.04, leanY: 0.02, spineX: 0.006 },
  stress: { headX: 0.025, headZ: -0.03, leanY: -0.008, spineX: 0.018 },
});

/** One-shot gesture length (seconds) — from talkGestures styles. */
export const GESTURE_DURATION_SEC = Object.freeze({
  explain: 2.4,
  point: 1.6,
  emphasize: 1.5,
  shrug: 1.4,
  celebrate: 1.6,
  count: 1.8,
  wave: 1.8,
  question: 1.5,
  soft: 2,
  thinking: 2.2,
  nod: 0.9,
  lean: 1.6,
});

/** Head-only micro-gestures (no arm overlay). */
export const HEAD_GESTURE_NOD = Object.freeze({
  duration: 0.9,
  sample(phase) {
    const nod = Math.sin(phase * Math.PI * 2);
    return { headX: -0.1 * nod, leanY: nod * 0.015 };
  },
});

/**
 * @param {string} style
 * @returns {boolean}
 */
export function isTalkGestureStyle(style) {
  return TALK_GESTURE_STYLES.includes(String(style || ""));
}

/**
 * Sample a talk-gesture pose at time and map to VRM body channels.
 * @param {string} style
 * @param {number} timeSec
 * @param {{ emotion?: string, speechEnergy?: number, intensity?: number }} [opts]
 */
/** VRM-safe: celebrate/wave remap; thinking allowed with clamped arms. */
export function companionGestureStyle(style) {
  const key = String(style || "explain").toLowerCase();
  if (key === "nod") return "nod";
  if (key === "thinking") return "thinking";
  if (key === "soft" || key === "explain") return key;
  if (key === "point" || key === "question") return key;
  return "soft";
}

/**
 * Clamp arm channels so hands stay away from hair on A-pose VRM rigs.
 * @param {Record<string, number>} pose
 */
export function clampArmPose(pose) {
  const out = { ...pose };
  const maxLift = 0.14;
  const maxFore = 0.12;
  if ("armLiftL" in out) out.armLiftL = Math.min(maxLift, Math.max(0, out.armLiftL));
  if ("armLiftR" in out) out.armLiftR = Math.min(maxLift, Math.max(0, out.armLiftR));
  if ("forearmL" in out) out.forearmL = Math.min(maxFore, Math.max(0, out.forearmL ?? 0));
  if ("forearmR" in out) out.forearmR = Math.min(maxFore, Math.max(0, out.forearmR ?? 0));
  return out;
}

/**
 * Idle stand may bend elbows and shift weight — talk-gesture clampArmPose
 * is too tight and made limbs look glued to the sides.
 * @param {Record<string, number>} pose
 */
export function clampIdleArmPose(pose) {
  const out = { ...pose };
  const maxLift = 0.34;
  const maxFore = 0.7;
  if ("armLiftL" in out) out.armLiftL = Math.min(maxLift, Math.max(0, out.armLiftL));
  if ("armLiftR" in out) out.armLiftR = Math.min(maxLift, Math.max(0, out.armLiftR));
  if ("forearmL" in out) out.forearmL = Math.min(maxFore, Math.max(0, out.forearmL ?? 0));
  if ("forearmR" in out) out.forearmR = Math.min(maxFore, Math.max(0, out.forearmR ?? 0));
  return out;
}

/**
 * Raise the upper arm from calibrated rest (works for T-pose and flipped-Z rigs).
 * @param {number} restComponent
 * @param {number} delta
 * @param {number} [defaultSign]
 */
export function restDirectedLift(restComponent, delta, defaultSign = 1) {
  const base = Number(restComponent) || 0;
  const towardLift =
    Math.abs(base) > 0.06 ? Math.sign(-base) : defaultSign;
  return base + towardLift * delta;
}

/** @deprecated Use restDirectedLift */
export const restDirectedDelta = restDirectedLift;

/**
 * Add extra hinge bend on the calibrated flex axis (x on Mixamo, often z on photoreal VRMs).
 * @param {{ x?: number, y?: number, z?: number, flexAxis?: string }} restLower
 * @param {number} extra
 */
export function withElbowBend(restLower, extra = 0) {
  const axis = restLower?.flexAxis === "y" || restLower?.flexAxis === "z"
    ? restLower.flexAxis
    : "x";
  return {
    x: restLower?.x ?? 0,
    y: restLower?.y ?? 0,
    z: restLower?.z ?? 0,
    [axis]: (restLower?.[axis] ?? 0) + extra,
  };
}

/**
 * Looser limits while speaking so ChatGPT-style talk gestures read on camera.
 * @param {Record<string, number>} pose
 */
export function clampTalkArmPose(pose) {
  const out = { ...pose };
  const maxLift = 0.42;
  const maxFore = 0.36;
  if ("armLiftL" in out) out.armLiftL = Math.min(maxLift, Math.max(0, out.armLiftL));
  if ("armLiftR" in out) out.armLiftR = Math.min(maxLift, Math.max(0, out.armLiftR));
  if ("forearmL" in out) out.forearmL = Math.min(maxFore, Math.max(0, out.forearmL ?? 0));
  if ("forearmR" in out) out.forearmR = Math.min(maxFore, Math.max(0, out.forearmR ?? 0));
  return out;
}

/**
 * Looser limits for scripted full-body actions (kungfu, dance, jump).
 * Talk-gesture clampArmPose must not be used here — it flattens visible motion.
 * @param {Record<string, number>} pose
 */
export function clampActionPose(pose) {
  const out = { ...pose };
  const maxLift = 0.52;
  const maxFore = 0.46;
  const maxLeg = 0.62;
  if ("armLiftL" in out) out.armLiftL = Math.min(maxLift, Math.max(-0.08, out.armLiftL));
  if ("armLiftR" in out) out.armLiftR = Math.min(maxLift, Math.max(-0.08, out.armLiftR));
  if ("forearmL" in out) out.forearmL = Math.min(maxFore, Math.max(0, out.forearmL ?? 0));
  if ("forearmR" in out) out.forearmR = Math.min(maxFore, Math.max(0, out.forearmR ?? 0));
  if ("upperLegL" in out) out.upperLegL = Math.min(maxLeg, Math.max(-0.12, out.upperLegL));
  if ("upperLegR" in out) out.upperLegR = Math.min(maxLeg, Math.max(-0.12, out.upperLegR));
  if ("lowerLegL" in out) out.lowerLegL = Math.min(maxLeg, Math.max(0, out.lowerLegL ?? 0));
  if ("lowerLegR" in out) out.lowerLegR = Math.min(maxLeg, Math.max(0, out.lowerLegR ?? 0));
  return out;
}

export function sampleVrmTalkPose(style, timeSec, opts = {}) {
  const key = companionGestureStyle(style);
  if (key === "nod") return {};
  const sample = sampleTalkGesture(timeSec, {
    style: key,
    emotion: opts.emotion || "neutral",
    speechEnergy: opts.speechEnergy ?? 0.35,
    intensity: opts.intensity ?? 0.38,
  });
  return clampArmPose(
    talkGesturePoseToBody(sample.pose, { includeArms: opts.includeArms === true }),
  );
}

/**
 * @param {Record<string, number>} base
 * @param {Record<string, number>} overlay
 * @param {number} weight
 */
export function mergePoses(base, overlay, weight) {
  const w = Math.max(0, Math.min(1, Number(weight) || 0));
  if (w <= 0) return { ...base };
  /** @type {Record<string, number>} */
  const out = { ...base };
  for (const [key, val] of Object.entries(overlay)) {
    const a = Number(out[key] ?? 0);
    const b = Number(val ?? 0);
    out[key] = a + (b - a) * w;
  }
  return out;
}

/**
 * Build idle / listen / emotion base pose (arms always from rest unless overridden later).
 * @param {{ listening?: boolean, emotion?: string, nuance?: string }} opts
 */
export function buildBasePose(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const nuance = String(opts.nuance || "none").toLowerCase();
  const face =
    EMOTION_FACE_OFFSET[emotion] || EMOTION_FACE_OFFSET.neutral;
  const nuanceFace =
    NUANCE_FACE_OFFSET[nuance] || NUANCE_FACE_OFFSET.none;
  const base = opts.listening ? { ...LISTENING_POSE } : { ...REST_POSE };
  /** @type {Record<string, number>} */
  const out = { ...base };
  for (const [key, val] of Object.entries(face)) {
    if (Number(val) !== 0) {
      out[key] = (out[key] ?? 0) + Number(val);
    }
  }
  for (const [key, val] of Object.entries(nuanceFace)) {
    if (Number(val) !== 0) {
      out[key] = (out[key] ?? 0) + Number(val);
    }
  }
  return out;
}
