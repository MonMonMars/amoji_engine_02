/**
 * Anime-style title / boot screen copy.
 */
export const COMPANION_TITLE_SCREEN_SCHEMA = "amoji.companionTitleScreen.v1";

/** @param {boolean} [isEnglish] */
export function titleScreenLogo(_isEnglish = false) {
  void _isEnglish;
  return "AMOJI";
}

/** @param {boolean} [isEnglish] */
export function titleScreenKicker(isEnglish = false) {
  return isEnglish ? "Voice · Chat · Live 3D" : "語音 · 傾偈 · 立體 3D";
}

/** @param {boolean} [isEnglish] */
export function titleScreenTagline(isEnglish = false) {
  return isEnglish
    ? "Your companion story begins…"
    : "同伴故事即將開始…";
}

/** @param {boolean} [isEnglish] */
export function titleScreenLoadingHint(isEnglish = false) {
  return isEnglish ? "Loading 3D world…" : "載入 3D 世界…";
}
