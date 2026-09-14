/** Human-readable mic permission errors for the UI. */
export const MIC_ERROR_MESSAGES = Object.freeze({
  "not-allowed":
    "Microphone blocked — tap 🔒 in the address bar and allow mic, then tap 🎤 again.",
  "service-not-allowed":
    "Speech recognition blocked — use Chrome/Edge on HTTPS, or type your message.",
  "audio-capture": "No microphone found — plug in a mic or type your message.",
  unsupported:
    "Mic unavailable — try Chrome/Edge on desktop, or allow microphone when prompted.",
  "no-getusermedia":
    "Cannot request mic permission in this browser — try Chrome/Edge on HTTPS.",
  "no-mic": "No microphone detected — connect a mic or type your message.",
});

/**
 * @param {string} code
 * @returns {string}
 */
export function formatMicError(code) {
  const key = String(code || "").trim();
  return MIC_ERROR_MESSAGES[key] || `Mic error: ${key || "unknown"}`;
}

/**
 * Prime microphone permission via getUserMedia (clearer errors than SpeechRecognition alone).
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function requestMicPermission() {
  const md = globalThis.navigator?.mediaDevices;
  if (!md?.getUserMedia) {
    const Rec =
      globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
    if (!Rec) return { ok: false, reason: "unsupported" };
    return { ok: true, reason: "no-getusermedia" };
  }

  /** @type {MediaStream | null} */
  let stream = null;
  try {
    stream = await md.getUserMedia({ audio: true });
    return { ok: true };
  } catch (err) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, reason: "not-allowed" };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { ok: false, reason: "no-mic" };
    }
    return { ok: false, reason: err?.message || "mic-error" };
  } finally {
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
    }
  }
}
