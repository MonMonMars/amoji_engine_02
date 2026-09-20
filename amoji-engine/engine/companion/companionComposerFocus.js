/**
 * Keep the stage as the default focus target — only focus the composer textarea
 * when the user taps it (avoids keyboard popping on app/browser resume).
 */
export const COMPANION_COMPOSER_FOCUS_SCHEMA = "amoji.companionComposerFocus.v1";

/**
 * @param {{
 *   input: HTMLTextAreaElement | HTMLInputElement | null | undefined,
 *   composerRoot?: HTMLElement | null,
 *   focusFallback?: HTMLElement | null,
 * }} opts
 */
export function bindCompanionComposerFocusGuard(opts = {}) {
  const input = opts.input || null;
  const composerRoot = opts.composerRoot || input?.closest?.("form") || null;
  const focusFallback = opts.focusFallback || null;
  if (!input) {
    return { destroy() {}, focusComposer() {} };
  }

  let userRequestedFocus = false;

  const markUserFocus = () => {
    userRequestedFocus = true;
  };

  const onInputPointerDown = () => markUserFocus();
  const onComposerPointerDown = (ev) => {
    if (ev.target === input) return;
    markUserFocus();
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  };

  const blurIfSpurious = () => {
    if (document.activeElement !== input) {
      userRequestedFocus = false;
      return false;
    }
    if (userRequestedFocus) {
      userRequestedFocus = false;
      return false;
    }
    input.blur();
    if (focusFallback && typeof focusFallback.focus === "function") {
      try {
        focusFallback.focus({ preventScroll: true });
      } catch {
        focusFallback.focus();
      }
    }
    return true;
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      blurIfSpurious();
    }
  };

  const onWindowFocus = () => {
    globalThis.setTimeout?.(blurIfSpurious, 0);
  };

  const onPageShow = () => {
    globalThis.setTimeout?.(blurIfSpurious, 0);
  };

  input.addEventListener("pointerdown", onInputPointerDown, { capture: true });
  composerRoot?.addEventListener?.("pointerdown", onComposerPointerDown, {
    capture: true,
  });
  document.addEventListener("visibilitychange", onVisibility);
  globalThis.addEventListener?.("focus", onWindowFocus);
  globalThis.addEventListener?.("pageshow", onPageShow);

  return {
    focusComposer(userInitiated = false) {
      if (!userInitiated) return false;
      markUserFocus();
      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }
      return true;
    },
    blurComposer() {
      userRequestedFocus = false;
      input.blur();
    },
    destroy() {
      input.removeEventListener("pointerdown", onInputPointerDown, {
        capture: true,
      });
      composerRoot?.removeEventListener?.("pointerdown", onComposerPointerDown, {
        capture: true,
      });
      document.removeEventListener("visibilitychange", onVisibility);
      globalThis.removeEventListener?.("focus", onWindowFocus);
      globalThis.removeEventListener?.("pageshow", onPageShow);
    },
  };
}
