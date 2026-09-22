/**
 * Start-picker visibility — avoid re-opening after Begin; optional skip on return visits.
 */

export const START_PICKER_COMPLETED_STORAGE_KEY = "amoji.companion.startPickerCompleted.v1";

/**
 * Default /play and companion entry to roster + scene picker unless explicitly skipped.
 * @param {URLSearchParams | string | null | undefined} search
 */
export function applyBootPickerUrlDefaults(search) {
  const params = new URLSearchParams(
    search instanceof URLSearchParams
      ? search
      : String(search || "").replace(/^\?/, ""),
  );
  if (params.get("autostart") === "1" || params.get("pick") === "0") {
    return params;
  }
  if (!params.get("pick")) params.set("pick", "1");
  if (!params.get("automic")) params.set("automic", "0");
  return params;
}

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
  /** Explicit picker entry — /play adds pick=1; always show roster + scene row. */
  const explicitPicker =
    pick === "1" || pick === "force" || pick === "always";
  if (explicitPicker) {
    const start = opts.start;
    if (start?.pickerDismissed || start?.tapped) return false;
    if (opts.sessionStartedLocal || start?.sessionStarted) return false;
    return true;
  }
  const storage = opts.storage ?? globalThis.localStorage;
  if (hasCompletedStartPicker(storage)) return false;
  const start = opts.start;
  if (start?.pickerDismissed || start?.tapped) return false;
  if (opts.sessionStartedLocal || start?.sessionStarted) return false;
  return true;
}

/**
 * Auto-enter session when the start picker will not show (returning users, autostart).
 * @param {{
 *   autostart?: string | null,
 *   pick?: string | null,
 *   start?: Record<string, unknown> | null,
 *   sessionStartedLocal?: boolean,
 *   storage?: Pick<Storage, "getItem"> | null,
 * }} opts
 */
export function shouldAutoStartCompanionSession(opts = {}) {
  const autostart = String(opts.autostart ?? "");
  const pick = String(opts.pick ?? "");
  if (opts.sessionStartedLocal || opts.start?.sessionStarted) return false;
  if (autostart === "1" || pick === "0") return true;
  if (pick === "1" || pick === "force" || pick === "always") return false;
  return !shouldShowStartPickerOnBoot(opts);
}

/**
 * @param {{
 *   sessionStarted?: boolean,
 *   pickerVisible?: boolean,
 *   pickerOpenBodyClass?: boolean,
 *   fallbackVisible?: boolean,
 * }} opts
 */
export function shouldRemoveBootSplash(opts = {}) {
  return Boolean(
    opts.sessionStarted ||
      opts.pickerVisible ||
      opts.pickerOpenBodyClass ||
      opts.fallbackVisible,
  );
}

/**
 * DOM snapshot for inline boot splash + module boot (single policy).
 *
 * @param {Document | null | undefined} [doc]
 * @param {Record<string, unknown> | null | undefined} [start]
 */
export function bootSplashGateFromDom(
  doc = globalThis.document,
  start = globalThis.__amojiStart,
) {
  const fallback = doc?.getElementById?.("amoji-boot-fallback");
  const fallbackVisible = Boolean(
    fallback &&
      !fallback.hidden &&
      fallback.classList.contains("show"),
  );
  const picker = doc?.getElementById?.("start-character-picker");
  const pickerVisible = Boolean(
    picker &&
      picker.classList.contains("is-open") &&
      !picker.classList.contains("hide") &&
      picker.getAttribute("aria-hidden") !== "true" &&
      !picker.hidden,
  );
  const body = doc?.body;
  const pickerOpenBodyClass = Boolean(
    body?.classList?.contains?.("companion-picker-open") ||
      body?.classList?.contains?.("companion-start-picker-open"),
  );
  return shouldRemoveBootSplash({
    sessionStarted: Boolean(start?.sessionStarted),
    pickerVisible,
    pickerOpenBodyClass,
    fallbackVisible,
  });
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
