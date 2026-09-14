/**
 * Mobile / iOS detection for companion audio and mic routing quirks.
 */

/**
 * iPhone, iPad, iPod, and iPadOS desktop Safari (touch Mac).
 * @returns {boolean}
 */
export function isIosLike() {
  if (typeof navigator === "undefined") return false;
  const ua = String(navigator.userAgent || "");
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints) > 1;
}

/**
 * Prefer the loudspeaker on phones — pause mic capture while TTS plays.
 * iOS routes playback to the earpiece when mic + Web Audio are active together.
 * @returns {boolean}
 */
export function shouldPauseMicDuringTts() {
  return isIosLike();
}
