/**
 * Start-picker visibility — avoid re-opening after the user taps Begin (early or late boot).
 */

/** @param {Record<string, unknown> | null | undefined} start */
export function markStartPickerDismissed(start) {
  if (!start || typeof start !== "object") return;
  start.pickerDismissed = true;
}

/**
 * @param {{
 *   autostart?: string | null,
 *   pick?: string | null,
 *   start?: Record<string, unknown> | null,
 *   sessionStartedLocal?: boolean,
 * }} opts
 */
export function shouldShowStartPickerOnBoot(opts = {}) {
  const autostart = String(opts.autostart ?? "");
  const pick = String(opts.pick ?? "");
  if (autostart === "1" || pick === "0") return false;
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
