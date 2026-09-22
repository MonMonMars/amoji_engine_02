/**
 * Block TTS / lip-sync while menu sheets (settings, scene, pickers, secretary) are open.
 */
export const COMPANION_MENU_SPEECH_GATE_SCHEMA =
  "amoji.companionMenuSpeechGate.v1";

/** Body classes used by menu / setup overlays (not in-world chat). */
export const COMPANION_MENU_BODY_CLASSES = Object.freeze([
  "settings-open",
  "scene-sheet-open",
  "companion-picker-open",
  "companion-treat-open",
  "secretary-panel-open",
  "companion-start-picker-open",
]);

/** @type {(() => void) | null} */
let pauseSpeechForMenu = null;

/**
 * @param {{ pauseForMenu?: () => void } | null | undefined} ctrl
 */
export function registerCompanionMenuSpeechController(ctrl) {
  pauseSpeechForMenu =
    typeof ctrl?.pauseForMenu === "function" ? ctrl.pauseForMenu : null;
}

export function notifyCompanionMenuOverlayOpened() {
  pauseSpeechForMenu?.();
}

/**
 * @param {Document | null | undefined} [doc]
 */
export function isCompanionMenuUiOpen(doc = globalThis.document) {
  const body = doc?.body;
  if (!body) return false;

  for (const cls of COMPANION_MENU_BODY_CLASSES) {
    if (body.classList.contains(cls)) return true;
  }

  const settings = doc.getElementById("settings");
  if (settings?.classList.contains("open")) return true;

  const sceneSheet = doc.getElementById("scene-sheet");
  if (sceneSheet?.classList.contains("open")) return true;

  const startPicker = doc.getElementById("start-character-picker");
  if (
    startPicker?.classList.contains("is-open") &&
    !startPicker.classList.contains("hide")
  ) {
    return true;
  }

  const sessionPicker = doc.getElementById("companion-character-picker");
  if (
    sessionPicker?.classList.contains("is-open") &&
    !sessionPicker.classList.contains("hide")
  ) {
    return true;
  }

  if (doc.querySelector(".secretary-overlay.is-open")) return true;

  return false;
}

/**
 * @param {Document | null | undefined} [doc]
 */
export function shouldBlockCompanionSpeech(doc = globalThis.document) {
  return isCompanionMenuUiOpen(doc);
}
