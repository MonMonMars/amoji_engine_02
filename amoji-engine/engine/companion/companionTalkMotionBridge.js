/**
 * Bridge Disney-style talk gestures (talkGestures.js) → VRM humanoid body pose.
 */
import {
  inferTalkGestureFromText,
  sampleTalkGesture,
  TALK_GESTURE_STYLES,
} from "../face/talkGestures.js";

export const COMPANION_TALK_MOTION_BRIDGE_SCHEMA =
  "amoji.companionTalkMotionBridge.v1";

/**
 * Map Face Live talk-gesture pose channels to companion body pose keys.
 * @param {Record<string, number>} pose
 */
export function talkGesturePoseToBody(pose) {
  const p = pose || {};
  const armL = Number(p.armLA ?? 0.15);
  const armR = Number(p.armRA ?? 0.15);
  const shoulderL = Number(p.shoulderL ?? 0.08);
  const shoulderR = Number(p.shoulderR ?? 0.08);

  return {
    headX: -Number(p.bodyAngleX ?? 0) * 0.55,
    headZ: Number(p.bodyAngleZ ?? 0) * 0.75,
    spineX: Number(p.bodyAngleX ?? 0) * 0.35 + Number(p.breath ?? 0.35) * 0.04,
    chestX: -Number(p.bodyAngleY ?? 0) * 0.25,
    hipZ: Number(p.bodyAngleZ ?? 0) * 0.45,
    leanY: Number(p.bodyAngleY ?? 0) * 0.65,
    armLiftL: 0.05 + armL * 0.48 + shoulderL * 0.15,
    armLiftR: 0.05 + armR * 0.48 + shoulderR * 0.15,
    forearmL: Number(p.armLB ?? 0.05) + Number(p.handLY ?? 0.1) * 0.35,
    forearmR: Number(p.armRB ?? 0.05) + Number(p.handRY ?? 0.1) * 0.35,
    handWaveR: Number(p.handRX ?? 0) * 0.4,
    handWaveL: Number(p.handLX ?? 0) * 0.4,
  };
}

/**
 * @param {Record<string, number>} base
 * @param {Record<string, number>} overlay
 * @param {number} weight
 */
export function blendBodyPoses(base, overlay, weight) {
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
 * Sample continuous talk motion from the gesture library.
 * @param {number} timeSec
 * @param {{ style?: string, emotion?: string, speechEnergy?: number }} opts
 */
export function sampleBodyTalkMotion(timeSec, opts = {}) {
  const style = TALK_GESTURE_STYLES.includes(String(opts.style || ""))
    ? String(opts.style)
    : "explain";
  const sample = sampleTalkGesture(timeSec, {
    style,
    emotion: opts.emotion || "neutral",
    speechEnergy: opts.speechEnergy ?? 0.5,
    intensity: 0.78 + (opts.speechEnergy ?? 0.5) * 0.35,
  });
  return {
    style: sample.style,
    body: talkGesturePoseToBody(sample.pose),
  };
}

/**
 * Pick the next gesture style when speech hits a phrase boundary.
 * @param {string} chunk
 * @param {{ emotion?: string, prevStyle?: string }} [opts]
 */
export function inferTalkStyleFromChunk(chunk, opts = {}) {
  const inferred = inferTalkGestureFromText(chunk, {
    emotion: opts.emotion || "neutral",
  });
  if (inferred && inferred !== opts.prevStyle) return inferred;
  const idx = TALK_GESTURE_STYLES.indexOf(String(opts.prevStyle || "explain"));
  const next = TALK_GESTURE_STYLES[(Math.max(0, idx) + 1) % TALK_GESTURE_STYLES.length];
  return inferred || next;
}
