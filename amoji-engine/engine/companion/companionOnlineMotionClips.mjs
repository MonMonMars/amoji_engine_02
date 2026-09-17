/**
 * Online VRMA motion clips — hosted library for all scripted body actions.
 *
 * Policy: VRM avatars play hosted VRMA for every catalog action. We do not
 * synthesize body motion in code — custom libraries can be added later.
 * Standing idle stays procedural; continuous talk sway uses hosted VRMA loops
 * (see companionTalkMotionLibrary.mjs).
 *
 * Source: tk256ailab/vrm-viewer (MIT) — 11 clips mapped to ~50+ action ids.
 */
import { resolveMotionSamplerKey } from "./companionMotionLibrary.js";

export const COMPANION_ONLINE_MOTION_CLIPS_SCHEMA =
  "amoji.companionOnlineMotionClips.v3";

/** Relax.vrma is a stretch, not a rest — standing idle stays clip-free. */
export const ONLINE_IDLE_ACTION = "idle";
export const ONLINE_IDLE_CLIP_FILE = "Relax";
export const ONLINE_THINKING_ACTION = "thinking";

/** Hosted VRMA clips that loop during talk (Thinking, LookAround, Blush, etc.). */
export const ONLINE_TALK_LOOP_ACTIONS = Object.freeze(
  new Set(["thinking", "learning", "wiggle", "point", "shy", "shrug"]),
);

/**
 * @deprecated Empty — all scripted actions use hosted VRMA, not bone samplers.
 */
export const PROCEDURAL_PREFERRED_ACTIONS = Object.freeze(new Set());

const VRMA_BASE =
  "https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA";

/** @type {Readonly<Record<string, string>>} */
export const ONLINE_MOTION_CLIP_FILES = Object.freeze({
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
  yoga: "Relax",
  stretch: "Relax",
  point: "LookAround",
  fingerheart: "Blush",
  walk: "LookAround",
  run: "LookAround",
  moonwalk: "LookAround",
  sneak: "LookAround",
  spin: "LookAround",
  rock: "LookAround",
  kungfu: "LookAround",
  zombie: "LookAround",
  superhero: "LookAround",
  // Social / catalog actions — nearest hosted clip (custom libs later).
  nod: "Goodbye",
  bow: "Goodbye",
  shrug: "Thinking",
  peace: "Blush",
  laugh: "Clapping",
  hug: "Blush",
  kiss: "Blush",
  sit: "Relax",
  squat: "Relax",
  eat: "LookAround",
  drink: "LookAround",
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
  return id === ONLINE_THINKING_ACTION || ONLINE_TALK_LOOP_ACTIONS.has(id);
}

/**
 * @param {string | null | undefined} actionId
 */
export function resolveOnlineMotionClipFile(actionId) {
  const id = String(actionId || "").toLowerCase();
  if (!id || id === "none" || id === "stop" || id === ONLINE_IDLE_ACTION) {
    return null;
  }
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
