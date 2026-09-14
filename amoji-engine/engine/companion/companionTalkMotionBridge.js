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
export function talkGesturePoseToBody(pose, opts = {}) {
  const p = pose || {};
  const includeArms = opts.includeArms === true;
  const armL = Number(p.armLA ?? 0.15);
  const armR = Number(p.armRA ?? 0.15);
  const shoulderL = Number(p.shoulderL ?? 0.08);
  const shoulderR = Number(p.shoulderR ?? 0.08);

  /** @type {Record<string, number>} */
  const body = {
    headX: -Number(p.bodyAngleX ?? 0) * 0.55,
    headZ: Number(p.bodyAngleZ ?? 0) * 0.75,
    spineX: Number(p.bodyAngleX ?? 0) * 0.35 + Number(p.breath ?? 0.35) * 0.04,
    chestX: -Number(p.bodyAngleY ?? 0) * 0.25,
    hipZ: Number(p.bodyAngleZ ?? 0) * 0.45,
    leanY: Number(p.bodyAngleY ?? 0) * 0.65,
  };

  if (includeArms) {
    body.armLiftL = 0.03 + armL * 0.34 + shoulderL * 0.1;
    body.armLiftR = 0.03 + armR * 0.34 + shoulderR * 0.1;
    body.forearmL = Number(p.armLB ?? 0.05) + Number(p.handLY ?? 0.1) * 0.35;
    body.forearmR = Number(p.armRB ?? 0.05) + Number(p.handRY ?? 0.1) * 0.35;
    body.handWaveR = Number(p.handRX ?? 0) * 0.4;
    body.handWaveL = Number(p.handLX ?? 0) * 0.4;
  }

  return body;
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
    intensity: 0.58 + (opts.speechEnergy ?? 0.5) * 0.32,
  });
  return {
    style: sample.style,
    body: talkGesturePoseToBody(sample.pose, {
      includeArms: opts.includeArms === true,
    }),
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
