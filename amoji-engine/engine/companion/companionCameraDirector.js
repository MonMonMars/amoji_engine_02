/**
 * Auto camera director — portrait by default, talk-close on long dialogue, full-body on big moves.
 */
import { getActionDef } from "./companionActionCatalog.js";

export const COMPANION_CAMERA_DIRECTOR_SCHEMA = "amoji.companionCameraDirector.v1";
export const CAMERA_MODE_AUTO = "auto";

/** @type {ReadonlySet<string>} */
export const FULL_BODY_ACTIONS = new Set([
  "dance",
  "jump",
  "kungfu",
  "run",
  "walk",
  "celebrate",
  "cheer",
  "spin",
  "moonwalk",
  "squat",
  "sit",
  "yoga",
  "sleep",
  "laugh",
  "cry",
  "angry",
  "eat",
  "drink",
  "rock",
  "punch",
  "kick",
  "breakdance",
  "taiji",
  "taichi",
  "ballet",
  "hiphop",
  "macarena",
  "floss",
  "wiggle",
  "superhero",
  "pushup",
  "plank",
  "zombie",
  "sneak",
  "jumpjack",
  "tiktokdance",
  "highfive",
  "curtsy",
]);

/** @type {ReadonlySet<string>} */
export const UPPER_BODY_ACTIONS = new Set([
  "wave",
  "nod",
  "headshake",
  "bow",
  "salute",
  "clap",
  "point",
  "shrug",
  "facepalm",
  "thumbsup",
  "peace",
  "kiss",
  "hug",
  "dab",
  "thinking",
  "learning",
  "downloading",
  "stretch",
  "shy",
  "handshake",
  "fingerheart",
  "photopose",
]);

export const LONG_DIALOGUE_SEC = 3;
export const LONG_DIALOGUE_CHARS = 72;

/**
 * @param {string | null | undefined} actionId
 */
export function isFullBodyAction(actionId) {
  const id = String(actionId || "").toLowerCase();
  if (!id || id === "none" || id === "stop") return false;
  if (UPPER_BODY_ACTIONS.has(id)) return false;
  if (FULL_BODY_ACTIONS.has(id)) return true;
  const def = getActionDef(id);
  if (!def) return false;
  return Boolean(def.loops && def.duration >= 2.2);
}

/**
 * @param {number} talkSeconds
 * @param {number} dialogueChars
 */
export function wantsTalkCloseShot(talkSeconds, dialogueChars) {
  return talkSeconds >= LONG_DIALOGUE_SEC || dialogueChars >= LONG_DIALOGUE_CHARS;
}

/**
 * @param {{
 *   mode?: string,
 *   longDialogueSec?: number,
 *   longDialogueChars?: number,
 * }} [opts]
 */
export function createCompanionCameraDirector(opts = {}) {
  let mode = opts.mode || CAMERA_MODE_AUTO;
  let talking = false;
  let talkSeconds = 0;
  let dialogueChars = 0;
  let currentAction = null;
  let userOrbiting = false;
  let talkCloseBlend = 0;
  let fullBodyBlend = 0;

  const longDialogueSec = opts.longDialogueSec ?? LONG_DIALOGUE_SEC;
  const longDialogueChars = opts.longDialogueChars ?? LONG_DIALOGUE_CHARS;

  const setMode = (next) => {
    mode = next === CAMERA_MODE_AUTO ? CAMERA_MODE_AUTO : CAMERA_MODE_AUTO;
    return mode;
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    if (!talking) {
      talkSeconds = 0;
    }
    return talking;
  };

  const notifySpeech = (text) => {
    const added = String(text || "").replace(/\s+/g, "").length;
    if (added > 0) dialogueChars += added;
    return dialogueChars;
  };

  const resetDialogue = () => {
    talkSeconds = 0;
    dialogueChars = 0;
    talkCloseBlend = 0;
  };

  const setCurrentAction = (actionId) => {
    currentAction = actionId ? String(actionId).toLowerCase() : null;
    return currentAction;
  };

  const setUserOrbiting = (on) => {
    userOrbiting = Boolean(on);
    return userOrbiting;
  };

  const update = (dt) => {
    if (talking) talkSeconds += Math.max(0, dt);

    const wantsTalkClose =
      talking &&
      !isFullBodyAction(currentAction) &&
      (talkSeconds >= longDialogueSec || dialogueChars >= longDialogueChars);
    const wantsFullBody = isFullBodyAction(currentAction);

    const talkTarget = wantsTalkClose ? 1 : 0;
    const bodyTarget = wantsFullBody ? 1 : 0;
    const talkRate = talkTarget > talkCloseBlend ? 2.4 : 3.2;
    const bodyRate = bodyTarget > fullBodyBlend ? 5.5 : 2.8;

    talkCloseBlend += (talkTarget - talkCloseBlend) * Math.min(1, dt * talkRate);
    fullBodyBlend += (bodyTarget - fullBodyBlend) * Math.min(1, dt * bodyRate);

    return {
      mode,
      talking,
      talkSeconds,
      dialogueChars,
      currentAction,
      userOrbiting,
      talkCloseBlend: Math.max(0, Math.min(1, talkCloseBlend)),
      fullBodyBlend: Math.max(0, Math.min(1, fullBodyBlend)),
      autoActive: mode === CAMERA_MODE_AUTO && !userOrbiting,
    };
  };

  return {
    setMode,
    setTalking,
    notifySpeech,
    resetDialogue,
    setCurrentAction,
    setUserOrbiting,
    update,
    get mode() {
      return mode;
    },
    get talkCloseBlend() {
      return talkCloseBlend;
    },
    get fullBodyBlend() {
      return fullBodyBlend;
    },
  };
}
