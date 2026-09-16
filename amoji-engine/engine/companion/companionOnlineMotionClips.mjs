/**
 * Online VRMA motion clips — hosted library used after /api/motions install.
 * Source: tk256ailab/vrm-viewer (MIT sample animations).
 */
import { resolveMotionSamplerKey } from "./companionMotionLibrary.js";

export const COMPANION_ONLINE_MOTION_CLIPS_SCHEMA =
  "amoji.companionOnlineMotionClips.v1";

const VRMA_BASE =
  "https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA";

/** @type {Readonly<Record<string, string>>} */
export const ONLINE_MOTION_CLIP_FILES = Object.freeze({
  wave: "Goodbye",
  highfive: "Goodbye",
  salute: "Goodbye",
  handshake: "Goodbye",
  clap: "Clapping",
  cheer: "Clapping",
  thumbsup: "Clapping",
  jump: "Jump",
  jumpjack: "Jump",
  celebrate: "Jump",
  dance: "Jump",
  dab: "Jump",
  breakdance: "Jump",
  tiktokdance: "Jump",
  ballet: "Jump",
  hiphop: "Jump",
  macarena: "Jump",
  floss: "Jump",
  wiggle: "Jump",
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
  point: "Relax",
  peace: "Relax",
  shrug: "Relax",
  fingerheart: "Relax",
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
  superhero: "Jump",
  pushup: "Relax",
  plank: "Relax",
});

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
