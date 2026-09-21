/**
 * Start-picker visibility — avoid re-opening after Begin; optional skip on return visits.
 */

export const START_PICKER_COMPLETED_STORAGE_KEY = "amoji.companion.startPickerCompleted.v1";

/** @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} [storage] */
export function persistStartPickerCompleted(storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(START_PICKER_COMPLETED_STORAGE_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

/** @param {Pick<Storage, "getItem"> | null | undefined} [storage] */
export function hasCompletedStartPicker(storage = globalThis.localStorage) {
  try {
    return storage?.getItem?.(START_PICKER_COMPLETED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** @param {Record<string, unknown> | null | undefined} start */
export function markStartPickerDismissed(start) {
  if (!start || typeof start !== "object") return;
  start.pickerDismissed = true;
  persistStartPickerCompleted();
}

/**
 * @param {{
 *   autostart?: string | null,
 *   pick?: string | null,
 *   start?: Record<string, unknown> | null,
 *   sessionStartedLocal?: boolean,
 *   storage?: Pick<Storage, "getItem"> | null,
 * }} opts
 */
export function shouldShowStartPickerOnBoot(opts = {}) {
  const autostart = String(opts.autostart ?? "");
  const pick = String(opts.pick ?? "");
  if (autostart === "1" || pick === "0") return false;
  const forcePick = pick === "1";
  const storage = opts.storage ?? globalThis.localStorage;
  if (!forcePick && hasCompletedStartPicker(storage)) return false;
  const start = opts.start;
  if (start?.pickerDismissed || start?.tapped) return false;
  if (opts.sessionStartedLocal || start?.sessionStarted) return false;
  return true;
}

/**
 * @param {Document | null | undefined} [doc]
 */
export function clearStartPickerBodyLocks(doc = globalThis.document) {
  doc?.body?.classList?.remove?.(
    "companion-start-pending",
    "companion-start-picker-open",
    "companion-picker-open",
    "ui-page-open",
    "ui-page-leaving",
    "ui-page-entering",
  );
}

/**
 * @param {HTMLElement | null | undefined} pickerEl
 * @param {Record<string, unknown> | null | undefined} [start]
 */
export function dismissStartPickerDom(pickerEl, start = globalThis.__amojiStart) {
  markStartPickerDismissed(start);
  if (pickerEl) {
    pickerEl.classList.remove("is-open", "is-starting", "gacha-start-dismiss");
    pickerEl.classList.add("hide");
    pickerEl.setAttribute("aria-hidden", "true");
    pickerEl.hidden = true;
    pickerEl.removeAttribute("aria-busy");
  }
  clearStartPickerBodyLocks();
}
