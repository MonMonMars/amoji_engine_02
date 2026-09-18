/**
 * Map talk styles → hosted VRMA clips for continuous speech body motion.
 * Lip sync / visemes stay procedural; this layer replaces code sway while speaking.
 */
import {
  ONLINE_TALK_LOOP_ACTIONS,
  resolveOnlineMotionClipUrl,
} from "./companionOnlineMotionClips.mjs";

export const COMPANION_TALK_MOTION_LIBRARY_SCHEMA =
  "amoji.companionTalkMotionLibrary.v1";

/** Default style → hosted VRMA action id (see companionOnlineMotionClips.mjs). */
export const TALK_STYLE_LIBRARY_ACTIONS = Object.freeze({
  explain: "thinking",
  soft: "shy",
  question: "thinking",
  emphasize: "wiggle",
  celebrate: "wiggle",
  thinking: "learning",
  nod: "thinking",
  point: "point",
  listen: "relax",
  wave: "relax",
  count: "point",
});

/** Clips that may loop as the background talk track. */
export const TALK_LIBRARY_LOOP_ACTIONS = ONLINE_TALK_LOOP_ACTIONS;

/** Clips owned by the talk loop (not one-shot reply actions). */
export const TALK_BACKGROUND_LIBRARY_ACTIONS = Object.freeze(
  new Set([...TALK_LIBRARY_LOOP_ACTIONS, "downloading", "facepalm"]),
);

/**
 * @param {string | null | undefined} actionId
 */
export function isTalkBackgroundLibraryAction(actionId) {
  return TALK_BACKGROUND_LIBRARY_ACTIONS.has(
    String(actionId || "").toLowerCase(),
  );
}

/**
 * @param {string | null | undefined} actionId
 */
export function isTalkLibraryLoopAction(actionId) {
  return TALK_LIBRARY_LOOP_ACTIONS.has(String(actionId || "").toLowerCase());
}

/**
 * Pick a hosted VRMA action for the current talk style / emotion.
 * @param {string | null | undefined} talkStyle
 * @param {string | null | undefined} [emotion]
 */
export function resolveTalkLibraryAction(talkStyle, emotion) {
  const style = String(talkStyle || "explain").toLowerCase();
  const mapped = TALK_STYLE_LIBRARY_ACTIONS[style];
  if (mapped && resolveOnlineMotionClipUrl(mapped)) return mapped;

  const emo = String(emotion || "neutral").toLowerCase();
  if (emo === "happy" && resolveOnlineMotionClipUrl("wiggle")) return "wiggle";
  if (emo === "sad" && resolveOnlineMotionClipUrl("relax")) return "relax";
  if (emo === "surprised" && resolveOnlineMotionClipUrl("shy")) return "shy";
  if (emo === "angry" && resolveOnlineMotionClipUrl("shrug")) return "shrug";
  if (emo === "thinking" && resolveOnlineMotionClipUrl("learning")) {
    return "learning";
  }
  if (resolveOnlineMotionClipUrl("thinking")) return "thinking";
  return null;
}

/**
 * Short VRMA accent clips for talk gestures (nod / point) — crossfade in/out.
 * @param {string | null | undefined} gesture
 */
export function resolveTalkGestureLibraryAction(gesture) {
  const g = String(gesture || "").toLowerCase();
  if (g === "nod" && resolveOnlineMotionClipUrl("nod")) return "nod";
  if (g === "point" && resolveOnlineMotionClipUrl("point")) return "point";
  return null;
}
