/**
 * Lab keyboard shortcuts for the realtime voice prototype.
 *
 * Space — push-to-talk hold
 * Escape — barge-in
 * KeyM — mute TTS
 * KeyE — expression demo cycle (optional)
 */
export const LAB_HOTKEYS_SCHEMA = "amoji.labHotkeys.v1";

/**
 * @param {{
 *   onPttPress?: () => void | Promise<void>,
 *   onPttRelease?: () => void | Promise<void>,
 *   onBarge?: () => void,
 *   onMuteToggle?: () => void,
 *   onExpressionCycle?: () => void,
 *   isTextInputTarget?: (el: EventTarget | null) => boolean,
 *   target?: { addEventListener: Function, removeEventListener: Function },
 * }} [opts]
 */
export function createLabHotkeys(opts = {}) {
  const target =
    opts.target ||
    (typeof globalThis.document !== "undefined" ? globalThis.document : null);

  const isTextInputTarget =
    opts.isTextInputTarget ||
    ((el) => {
      if (!el || typeof el !== "object") return false;
      const node = /** @type {HTMLElement} */ (el);
      const tag = String(node.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (node.isContentEditable) return true;
      return false;
    });

  let bound = false;
  let spaceDown = false;
  /** @type {((ev: KeyboardEvent) => void) | null} */
  let onKeyDown = null;
  /** @type {((ev: KeyboardEvent) => void) | null} */
  let onKeyUp = null;

  const handleDown = (ev) => {
    if (ev.defaultPrevented) return;
    if (isTextInputTarget(ev.target)) return;
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

    if (ev.code === "Space" || ev.key === " ") {
      if (spaceDown || ev.repeat) {
        ev.preventDefault();
        return;
      }
      spaceDown = true;
      ev.preventDefault();
      void opts.onPttPress?.();
      return;
    }

    if (ev.code === "Escape" || ev.key === "Escape") {
      ev.preventDefault();
      opts.onBarge?.();
      return;
    }

    if (ev.code === "KeyM" || ev.key === "m" || ev.key === "M") {
      if (ev.repeat) return;
      ev.preventDefault();
      opts.onMuteToggle?.();
      return;
    }

    if (ev.code === "KeyE" || ev.key === "e" || ev.key === "E") {
      if (ev.repeat) return;
      ev.preventDefault();
      opts.onExpressionCycle?.();
    }
  };

  const handleUp = (ev) => {
    if (ev.code === "Space" || ev.key === " ") {
      if (!spaceDown) return;
      spaceDown = false;
      ev.preventDefault();
      void opts.onPttRelease?.();
    }
  };

  return {
    get schema() {
      return LAB_HOTKEYS_SCHEMA;
    },
    get bound() {
      return bound;
    },
    get spaceDown() {
      return spaceDown;
    },
    bind() {
      if (bound || !target) return false;
      onKeyDown = handleDown;
      onKeyUp = handleUp;
      target.addEventListener("keydown", onKeyDown);
      target.addEventListener("keyup", onKeyUp);
      bound = true;
      return true;
    },
    unbind() {
      if (!bound || !target) return false;
      if (onKeyDown) target.removeEventListener("keydown", onKeyDown);
      if (onKeyUp) target.removeEventListener("keyup", onKeyUp);
      onKeyDown = null;
      onKeyUp = null;
      bound = false;
      spaceDown = false;
      return true;
    },
  };
}
