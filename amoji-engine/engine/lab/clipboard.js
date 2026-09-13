/**
 * Copy text to the clipboard when available (lab URL sharing).
 * @param {string} text
 * @param {{ clipboard?: { writeText?: (t: string) => Promise<void> } | null }} [opts]
 * @returns {Promise<{ ok: boolean, method: string, error?: string }>}
 */
export async function copyTextToClipboard(text, opts = {}) {
  const value = String(text ?? "");
  const clipboard =
    opts.clipboard === null
      ? null
      : opts.clipboard ||
        (typeof globalThis.navigator !== "undefined"
          ? globalThis.navigator.clipboard
          : null);

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(value);
      return { ok: true, method: "clipboard" };
    } catch (err) {
      return {
        ok: false,
        method: "clipboard",
        error: err?.message || String(err),
      };
    }
  }

  // Fallback for older browsers / non-secure contexts.
  if (typeof document !== "undefined") {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok
        ? { ok: true, method: "execCommand" }
        : { ok: false, method: "execCommand", error: "copy failed" };
    } catch (err) {
      return {
        ok: false,
        method: "execCommand",
        error: err?.message || String(err),
      };
    }
  }

  return { ok: false, method: "none", error: "clipboard unavailable" };
}

/**
 * Build a shareable lab URL with current query prefs.
 * @param {{
 *   href?: string,
 *   workerUrl?: string,
 *   faceUrl?: string,
 *   lang?: string,
 *   vad?: string,
 *   vol?: string,
 *   motion?: string,
 *   motionBridge?: string,
 * }} [opts]
 */
export function buildLabShareUrl(opts = {}) {
  const base =
    opts.href ||
    (typeof globalThis.location !== "undefined"
      ? globalThis.location.href
      : "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html");
  let url;
  try {
    url = new URL(base);
  } catch {
    url = new URL(
      "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html",
    );
  }
  if (opts.workerUrl) url.searchParams.set("worker", opts.workerUrl);
  if (opts.faceUrl) url.searchParams.set("face", opts.faceUrl);
  if (opts.lang) url.searchParams.set("lang", opts.lang);
  if (opts.vad) url.searchParams.set("vad", opts.vad);
  if (opts.vol) url.searchParams.set("vol", opts.vol);
  if (opts.motion) url.searchParams.set("motion", opts.motion);
  if (opts.motionBridge) url.searchParams.set("motionBridge", opts.motionBridge);
  return url.toString();
}
