/**
 * Minimal companion chrome — hide instructional copy; keep icons + chat only.
 */
export const COMPANION_CLEAN_UI_SCHEMA = "amoji.companionCleanUi.v1";

/** When true, suppress hints, starter chips, and info toasts on the main stage. */
export const COMPANION_CLEAN_UI = true;

/**
 * @param {"error" | "info" | string} [kind]
 */
export function shouldShowToast(kind = "error") {
  if (!COMPANION_CLEAN_UI) return true;
  return kind === "error";
}

/**
 * @param {string} role
 * @param {{ force?: boolean }} [opts]
 */
export function shouldShowChatBubble(role, opts = {}) {
  if (!COMPANION_CLEAN_UI) return true;
  if (opts.force) return true;
  return role !== "system";
}

/**
 * @param {boolean} [isEnglish]
 */
export function cleanComposerPlaceholder(isEnglish = false) {
  return isEnglish ? "Message…" : "輸入…";
}

/**
 * @param {boolean} [isEnglish]
 */
export function cleanStatusLine(isEnglish = false) {
  return "";
}

export function shouldShowStarterPrompts() {
  /** Empty-chat starter chips stay useful even in clean UI. */
  return true;
}

export function shouldShowListenHint() {
  return !COMPANION_CLEAN_UI;
}

export function shouldShowOrbitHint() {
  return !COMPANION_CLEAN_UI;
}
