/**
 * Wait-time asset registry — motions, emotions, expressions, and dialogue phases to preload.
 */
import {
  ACTION_COMBOS,
  IDLE_SHOWCASE_POOL,
  SHOWCASE_SEQUENCE_POOL,
} from "./companionActionChoreography.js";
import { buildVrmExpressionBlend } from "./companionContentMotion.js";
import {
  BUNDLED_MOTION_IDS,
  CLOUD_EXTENSION_MOTIONS,
  PREMIUM_EXTENSION_MOTIONS,
} from "./motionPackData.mjs";

export const COMPANION_WAIT_ASSETS_SCHEMA = "amoji.companionWaitAssets.v3";

/** High-traffic reply / showcase motions to install early. */
export const PRIORITY_REPLY_MOTION_IDS = Object.freeze([
  "dance",
  "celebrate",
  "cheer",
  "jump",
  "spin",
  "clap",
  "hug",
  "kiss",
  "punch",
  "kick",
  "run",
  "walk",
  "yoga",
  "moonwalk",
  "laugh",
  "angry",
  "shrug",
  "point",
  "salute",
  "kungfu",
  "dab",
  "stretch",
  "peace",
  "thumbsup",
  "shy",
  "bow",
  "headshake",
]);

/** @type {Record<string, readonly string[]>} */
export const WAIT_POSES_BY_PHASE = Object.freeze({
  connecting: ["wave", "nod", "thinking", "stretch", "peace"],
  searching: ["thinking", "nod", "wave", "shrug", "point"],
  downloading: ["downloading", "learning", "wave", "nod", "thinking"],
  learning: ["learning", "thinking", "nod", "stretch", "wave"],
  installing: ["nod", "learning", "downloading", "clap", "thumbsup"],
  thinking: ["thinking", "nod", "wave", "shrug", "point"],
  "avatar-load": ["wave", "nod", "peace", "shrug", "wave"],
  "character-switch": ["wave", "nod", "celebrate", "cheer", "dab"],
  "motion-pack": [
    "downloading",
    "learning",
    "wave",
    "thinking",
    "stretch",
    "nod",
  ],
  idle: IDLE_SHOWCASE_POOL,
  ready: ["wave", "celebrate", "nod", "cheer", "dab", "clap"],
});

/**
 * @param {string} phase
 * @param {number} [tick]
 */
export function pickWaitPose(phase, tick = 0) {
  const list = WAIT_POSES_BY_PHASE[phase] || WAIT_POSES_BY_PHASE.learning;
  return list[Math.abs(tick) % list.length];
}

/** Base emotions rotated during wait performances (VRM expression presets). */
export const WAIT_EMOTIONS_BY_PHASE = Object.freeze({
  connecting: ["thinking", "neutral", "happy", "surprised"],
  searching: ["thinking", "neutral", "surprised"],
  downloading: ["thinking", "happy", "neutral", "surprised"],
  learning: ["thinking", "happy", "neutral"],
  installing: ["happy", "thinking", "surprised"],
  thinking: ["thinking", "neutral", "happy"],
  "avatar-load": ["happy", "neutral", "surprised", "happy", "neutral"],
  "character-switch": ["happy", "thinking", "surprised"],
  "motion-pack": ["thinking", "happy", "neutral", "surprised"],
  idle: ["happy", "neutral", "thinking", "surprised", "sad", "angry"],
  ready: ["happy", "surprised", "neutral"],
});

/**
 * Expression profiles (emotion + nuance) rotated during waits for richer faces.
 * @type {Record<string, readonly { emotion: string, nuance: string }[]>}
 */
export const WAIT_EXPRESSION_BY_PHASE = Object.freeze({
  connecting: [
    { emotion: "thinking", nuance: "curious" },
    { emotion: "neutral", nuance: "none" },
    { emotion: "happy", nuance: "shy" },
  ],
  searching: [
    { emotion: "thinking", nuance: "curious" },
    { emotion: "neutral", nuance: "none" },
    { emotion: "surprised", nuance: "curious" },
  ],
  downloading: [
    { emotion: "thinking", nuance: "none" },
    { emotion: "happy", nuance: "excited" },
    { emotion: "neutral", nuance: "curious" },
  ],
  learning: [
    { emotion: "thinking", nuance: "curious" },
    { emotion: "happy", nuance: "excited" },
    { emotion: "neutral", nuance: "none" },
  ],
  installing: [
    { emotion: "happy", nuance: "excited" },
    { emotion: "thinking", nuance: "none" },
    { emotion: "neutral", nuance: "curious" },
  ],
  thinking: [
    { emotion: "thinking", nuance: "curious" },
    { emotion: "neutral", nuance: "none" },
    { emotion: "happy", nuance: "shy" },
  ],
  "avatar-load": [
    { emotion: "happy", nuance: "none" },
    { emotion: "neutral", nuance: "none" },
    { emotion: "happy", nuance: "excited" },
    { emotion: "surprised", nuance: "excited" },
    { emotion: "neutral", nuance: "none" },
  ],
  "character-switch": [
    { emotion: "happy", nuance: "excited" },
    { emotion: "surprised", nuance: "excited" },
    { emotion: "happy", nuance: "love" },
  ],
  "motion-pack": [
    { emotion: "thinking", nuance: "curious" },
    { emotion: "happy", nuance: "excited" },
    { emotion: "neutral", nuance: "none" },
  ],
  idle: [
    { emotion: "happy", nuance: "none" },
    { emotion: "neutral", nuance: "shy" },
    { emotion: "happy", nuance: "love" },
    { emotion: "thinking", nuance: "curious" },
    { emotion: "surprised", nuance: "excited" },
    { emotion: "happy", nuance: "excited" },
  ],
  ready: [
    { emotion: "happy", nuance: "excited" },
    { emotion: "surprised", nuance: "excited" },
    { emotion: "happy", nuance: "love" },
  ],
});

/**
 * @param {string} phase
 * @param {number} [tick]
 * @param {string} [kind]
 */
export function pickWaitEmotion(phase, tick = 0, kind = "wait") {
  const profile = pickWaitExpressionProfile(phase, tick, kind);
  return profile.emotion;
}

/**
 * @param {string} phase
 * @param {number} [tick]
 * @param {string} [kind]
 * @returns {{ emotion: string, nuance: string, blend: Record<string, number> }}
 */
export function pickWaitExpressionProfile(phase, tick = 0, kind = "wait") {
  const list =
    kind === "idle"
      ? WAIT_EXPRESSION_BY_PHASE.idle
      : WAIT_EXPRESSION_BY_PHASE[phase] || WAIT_EXPRESSION_BY_PHASE.learning;
  const picked = list[Math.abs(tick) % list.length] || {
    emotion: "neutral",
    nuance: "none",
  };
  return {
    emotion: picked.emotion,
    nuance: picked.nuance,
    blend: buildVrmExpressionBlend(picked.emotion, picked.nuance),
  };
}

/** All emotion + nuance blends to warm at boot (VRM morph targets). */
export function collectWaitPreloadExpressionProfiles() {
  /** @type {Map<string, { emotion: string, nuance: string, blend: Record<string, number> }>} */
  const seen = new Map();
  const add = (emotion, nuance) => {
    const key = `${emotion}::${nuance}`;
    if (seen.has(key)) return;
    seen.set(key, {
      emotion,
      nuance,
      blend: buildVrmExpressionBlend(emotion, nuance),
    });
  };

  for (const profiles of Object.values(WAIT_EXPRESSION_BY_PHASE)) {
    for (const profile of profiles) {
      add(profile.emotion, profile.nuance);
    }
  }

  for (const emotion of [
    "neutral",
    "happy",
    "thinking",
    "sad",
    "surprised",
    "angry",
  ]) {
    for (const nuance of [
      "none",
      "shy",
      "curious",
      "excited",
      "love",
      "stress",
    ]) {
      add(emotion, nuance);
    }
  }

  return [...seen.values()];
}

/** Idle-only motion ids for targeted boot preload. */
export function collectIdlePreloadMotionIds() {
  return [...IDLE_SHOWCASE_POOL];
}

/** Unique motion ids used while waiting / idling — install at boot when possible. */
export function collectWaitPreloadMotionIds() {
  const ids = new Set(BUNDLED_MOTION_IDS);
  for (const id of IDLE_SHOWCASE_POOL) ids.add(id);
  for (const poses of Object.values(WAIT_POSES_BY_PHASE)) {
    for (const id of poses) ids.add(id);
  }
  for (const id of SHOWCASE_SEQUENCE_POOL) ids.add(id);
  for (const id of PRIORITY_REPLY_MOTION_IDS) ids.add(id);
  for (const combo of Object.values(ACTION_COMBOS)) {
    for (const id of combo) ids.add(id);
  }
  for (const id of Object.keys(CLOUD_EXTENSION_MOTIONS)) ids.add(id);
  for (const id of Object.keys(PREMIUM_EXTENSION_MOTIONS)) ids.add(id);
  ids.delete("stop");
  ids.delete("none");
  return [...ids];
}
