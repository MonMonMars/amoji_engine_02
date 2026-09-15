/**
 * Wait-time asset registry — motions, emotions, and dialogue phases to preload.
 */
import { IDLE_SHOWCASE_POOL } from "./companionActionChoreography.js";
import { BUNDLED_MOTION_IDS } from "./motionPackData.mjs";

export const COMPANION_WAIT_ASSETS_SCHEMA = "amoji.companionWaitAssets.v1";

/** @type {Record<string, readonly string[]>} */
export const WAIT_POSES_BY_PHASE = Object.freeze({
  connecting: ["wave", "nod", "thinking"],
  searching: ["thinking", "nod", "wave"],
  downloading: ["downloading", "learning", "wave"],
  learning: ["learning", "thinking", "nod"],
  installing: ["nod", "learning", "downloading"],
  thinking: ["thinking", "nod", "wave"],
  "avatar-load": ["wave", "learning", "downloading", "thinking"],
  "character-switch": ["wave", "nod", "celebrate"],
  "motion-pack": ["downloading", "learning", "wave", "thinking"],
  idle: ["wave", "nod", "stretch", "bow", "clap", "peace", "thumbsup", "shy", "dab"],
  ready: ["wave", "celebrate", "nod", "cheer"],
});

/**
 * @param {string} phase
 * @param {number} [tick]
 */
export function pickWaitPose(phase, tick = 0) {
  const list = WAIT_POSES_BY_PHASE[phase] || WAIT_POSES_BY_PHASE.learning;
  return list[Math.abs(tick) % list.length];
}

/** Emotions rotated during wait performances (VRM expression presets). */
export const WAIT_EMOTIONS_BY_PHASE = Object.freeze({
  connecting: ["thinking", "neutral", "happy"],
  searching: ["thinking", "neutral"],
  downloading: ["thinking", "happy", "neutral"],
  learning: ["thinking", "happy"],
  installing: ["happy", "thinking"],
  thinking: ["thinking", "neutral"],
  "avatar-load": ["thinking", "happy", "neutral", "surprised"],
  "character-switch": ["happy", "thinking", "surprised"],
  "motion-pack": ["thinking", "happy", "neutral"],
  idle: ["happy", "neutral", "thinking", "surprised"],
  ready: ["happy", "surprised"],
});

/**
 * @param {string} phase
 * @param {number} [tick]
 * @param {string} [kind]
 */
export function pickWaitEmotion(phase, tick = 0, kind = "wait") {
  if (kind === "idle") {
    const idle = WAIT_EMOTIONS_BY_PHASE.idle;
    return idle[Math.abs(tick) % idle.length];
  }
  const list = WAIT_EMOTIONS_BY_PHASE[phase] || WAIT_EMOTIONS_BY_PHASE.learning;
  return list[Math.abs(tick) % list.length];
}

/** Unique motion ids used while waiting / idling — install at boot when possible. */
export function collectWaitPreloadMotionIds() {
  const ids = new Set(BUNDLED_MOTION_IDS);
  for (const poses of Object.values(WAIT_POSES_BY_PHASE)) {
    for (const id of poses) ids.add(id);
  }
  for (const id of IDLE_SHOWCASE_POOL) ids.add(id);
  ids.delete("stop");
  ids.delete("none");
  return [...ids];
}
