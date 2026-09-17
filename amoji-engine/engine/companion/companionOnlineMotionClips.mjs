/**
 * Online VRMA motion clips — hosted library used after /api/motions install.
 * Source: tk256ailab/vrm-viewer (MIT sample animations).
 */
import { resolveMotionSamplerKey } from "./companionMotionLibrary.js";

export const COMPANION_ONLINE_MOTION_CLIPS_SCHEMA =
  "amoji.companionOnlineMotionClips.v2";

/** Loop this clip as standing idle instead of procedural sine-wave sway. */
export const ONLINE_IDLE_ACTION = "idle";
export const ONLINE_IDLE_CLIP_FILE = "Relax";
export const ONLINE_THINKING_ACTION = "thinking";

/**
 * @deprecated Empty — social gestures now play hosted VRMA instead of
 * procedural bone sway (which made the body shake).
 */
export const PROCEDURAL_PREFERRED_ACTIONS = Object.freeze(new Set());

const VRMA_BASE =
  "https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA";

/** @type {Readonly<Record<string, string>>} */
export const ONLINE_MOTION_CLIP_FILES = Object.freeze({
  idle: "Relax",
  relax: "Relax",
  wave: "Goodbye",
  highfive: "Goodbye",
  salute: "Goodbye",
  handshake: "Goodbye",
  clap: "Clapping",
  cheer: "Clapping",
  thumbsup: "Clapping",
  celebrate: "Clapping",
  jump: "Jump",
  jumpjack: "Jump",
  dance: "LookAround",
  dab: "LookAround",
  breakdance: "LookAround",
  tiktokdance: "LookAround",
  ballet: "LookAround",
  hiphop: "LookAround",
  macarena: "LookAround",
  floss: "LookAround",
  wiggle: "LookAround",
  thinking: "Thinking",
  learning: "Thinking",
  downloading: "Thinking",
  facepalm: "Thinking",
  sleep: "Sleepy",
  angry: "Angry",
  punch: "Angry",
  kick: "Angry",
  cry: "Sad",
  sad: "Sad",
  surprised: "Surprised",
  headshake: "Surprised",
  shy: "Blush",
  blush: "Blush",
  bow: "Relax",
  curtsy: "Relax",
  hug: "Relax",
  kiss: "Relax",
  sit: "Relax",
  squat: "Relax",
  yoga: "Relax",
  stretch: "Relax",
  eat: "Relax",
  drink: "Relax",
  nod: "Relax",
  point: "LookAround",
  peace: "Relax",
  shrug: "Relax",
  fingerheart: "Blush",
  photopose: "Relax",
  walk: "LookAround",
  run: "LookAround",
  moonwalk: "LookAround",
  sneak: "LookAround",
  spin: "LookAround",
  rock: "LookAround",
  kungfu: "LookAround",
  taiji: "Relax",
  zombie: "LookAround",
  superhero: "LookAround",
  pushup: "Relax",
  plank: "Relax",
});

/**
 * @param {string | null | undefined} actionId
 */
export function isOnlineIdleAction(actionId) {
  const id = String(actionId || "").toLowerCase();
  return id === ONLINE_IDLE_ACTION || id === "relax";
}

/**
 * @param {string | null | undefined} actionId
 */
export function isOnlineLoopingLibraryAction(actionId) {
  const id = String(actionId || "").toLowerCase();
  return isOnlineIdleAction(id) || id === ONLINE_THINKING_ACTION;
}

/**
 * @param {string | null | undefined} actionId
 */
export function resolveOnlineMotionClipFile(actionId) {
  const id = String(actionId || "").toLowerCase();
  if (!id || id === "none" || id === "stop") return null;
  if (ONLINE_MOTION_CLIP_FILES[id]) return ONLINE_MOTION_CLIP_FILES[id];
  const sampler = resolveMotionSamplerKey(id);
  if (sampler && ONLINE_MOTION_CLIP_FILES[sampler]) {
    return ONLINE_MOTION_CLIP_FILES[sampler];
  }
  return null;
}

/**
 * @param {string | null | undefined} actionId
 */
export function resolveOnlineMotionClipUrl(actionId) {
  const file = resolveOnlineMotionClipFile(actionId);
  if (!file) return null;
  return `${VRMA_BASE}/${file}.vrma`;
}

/**
 * Attach clipUrl to motion pack entries for /api/motions responses.
 * @param {string} actionId
 */
export function enrichMotionWithClip(actionId) {
  const id = String(actionId || "").toLowerCase();
  const clipUrl = resolveOnlineMotionClipUrl(id);
  if (!clipUrl) return { id };
  return { id, clipUrl, clipFormat: "vrma" };
}
