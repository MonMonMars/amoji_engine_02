/**
 * Push-to-talk hold controller — press to listen, release to talk.
 *
 * Complements always-on VAD: the host owns mic frames and the talk pipeline.
 */

export const PUSH_TO_TALK_SCHEMA = "amoji.pushToTalk.v1";

/**
 * @param {{
 *   startListening: () => void | Promise<void>,
 *   stopListeningAndTalk: (extra?: object) => void | Promise<void>,
 *   cancelListening?: () => void | Promise<void>,
 *   getTurnExtra?: () => object | Promise<object>,
 *   onPress?: () => void,
 *   onRelease?: (info: { heldMs: number, outcome?: string }) => void,
 *   onError?: (error: unknown) => void,
 *   minHoldMs?: number,
 *   nowMs?: () => number,
 * }} opts
 */
export function createPushToTalk(opts) {
  if (typeof opts?.startListening !== "function") {
    throw new TypeError("createPushToTalk requires startListening()");
  }
  if (typeof opts?.stopListeningAndTalk !== "function") {
    throw new TypeError("createPushToTalk requires stopListeningAndTalk()");
  }

  const minHoldMs = Math.max(0, Number(opts.minHoldMs) || 80);
  const nowMs = opts.nowMs ?? (() => Date.now());

  let holding = false;
  let busy = false;
  let pressAt = 0;
  let generation = 0;

  const endListenQuietly = async () => {
    try {
      await opts.cancelListening?.();
    } catch (err) {
      opts.onError?.(err);
    }
  };

  return {
    get schema() {
      return PUSH_TO_TALK_SCHEMA;
    },
    get holding() {
      return holding;
    },
    get busy() {
      return busy;
    },

    /**
     * Begin a hold (pointerdown / keydown).
     * @returns {Promise<boolean>} true if press accepted
     */
    async press() {
      if (holding || busy) return false;
      holding = true;
      pressAt = nowMs();
      const gen = ++generation;
      try {
        await opts.startListening();
        if (gen !== generation || !holding) return false;
        opts.onPress?.();
        return true;
      } catch (err) {
        holding = false;
        opts.onError?.(err);
        return false;
      }
    },

    /**
     * End hold and run talk turn (pointerup / keyup).
     * Short holds below minHoldMs are cancelled without talking.
     * @returns {Promise<'talked' | 'cancelled' | 'ignored'>}
     */
    async release() {
      if (!holding) return "ignored";
      holding = false;
      const heldMs = Math.max(0, nowMs() - pressAt);
      generation += 1;

      if (heldMs < minHoldMs) {
        await endListenQuietly();
        opts.onRelease?.({ heldMs, outcome: "cancelled" });
        return "cancelled";
      }

      busy = true;
      try {
        const extra = {
          source: "push-to-talk",
          useWorker: true,
          heldMs,
          ...(await opts.getTurnExtra?.()),
        };
        await opts.stopListeningAndTalk(extra);
        opts.onRelease?.({ heldMs, outcome: "talked" });
        return "talked";
      } catch (err) {
        opts.onError?.(err);
        await endListenQuietly();
        return "cancelled";
      } finally {
        busy = false;
      }
    },

    /** Cancel hold without talking (pointercancel / Escape). */
    async cancel() {
      if (!holding && !busy) return false;
      holding = false;
      generation += 1;
      await endListenQuietly();
      return true;
    },
  };
}

/**
 * Bind pointer hold events on a button / element.
 * @param {Element} el
 * @param {ReturnType<typeof createPushToTalk>} ptt
 * @param {{ preventContextMenu?: boolean }} [bindOpts]
 * @returns {() => void} unbind
 */
export function bindPushToTalkPointer(el, ptt, bindOpts = {}) {
  if (!el || !ptt) {
    throw new TypeError("bindPushToTalkPointer requires element and ptt");
  }

  const onDown = (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault?.();
    void ptt.press();
  };
  const onUp = (ev) => {
    ev.preventDefault?.();
    void ptt.release();
  };
  const onCancel = () => {
    void ptt.cancel();
  };
  const onContext = (ev) => {
    if (bindOpts.preventContextMenu !== false) ev.preventDefault();
  };

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointerleave", onUp);
  el.addEventListener("pointercancel", onCancel);
  el.addEventListener("lostpointercapture", onCancel);
  el.addEventListener("contextmenu", onContext);

  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointerleave", onUp);
    el.removeEventListener("pointercancel", onCancel);
    el.removeEventListener("lostpointercapture", onCancel);
    el.removeEventListener("contextmenu", onContext);
  };
}
