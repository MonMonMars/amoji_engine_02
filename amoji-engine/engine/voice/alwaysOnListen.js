/**
 * Always-on listen with energy VAD end-of-utterance detection.
 *
 * Flow: idle → speaking → trailing → ended
 * Controller loops: startListening → (frames) → stopListeningAndTalk → startListening
 */

/** Config schema + defaults for always-on listen / VAD. */
export const ALWAYS_ON_LISTEN_SCHEMA = Object.freeze({
  energyThreshold: {
    type: "number",
    default: 0.02,
    min: 0,
    max: 1,
    description: "RMS energy above which a frame counts as speech",
  },
  minSpeechMs: {
    type: "number",
    default: 120,
    min: 0,
    description: "Minimum speech duration before trailing silence can end the turn",
  },
  trailingSilenceMs: {
    type: "number",
    default: 500,
    min: 0,
    description: "Silence after speech that ends the utterance",
  },
  sampleRateHz: {
    type: "number",
    default: 24_000,
    description: "PCM sample rate used to convert samples → milliseconds",
  },
  frameSamples: {
    type: "number",
    default: 480,
    description: "Expected samples per mic frame (hint; frames may vary)",
  },
});

/**
 * Resolve schema defaults with optional overrides.
 * @param {Record<string, unknown>} [overrides]
 */
export function resolveAlwaysOnListenOptions(overrides = {}) {
  const out = {};
  for (const [key, field] of Object.entries(ALWAYS_ON_LISTEN_SCHEMA)) {
    const value = overrides[key] ?? field.default;
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new TypeError(`always-on listen option "${key}" must be a number`);
    }
    if (field.min !== undefined && value < field.min) {
      throw new RangeError(`always-on listen option "${key}" below min ${field.min}`);
    }
    if (field.max !== undefined && value > field.max) {
      throw new RangeError(`always-on listen option "${key}" above max ${field.max}`);
    }
    out[key] = value;
  }
  return out;
}

/**
 * RMS energy for Int16Array or Float32Array PCM frames (normalized 0–1 scale).
 * @param {Int16Array | Float32Array | ArrayLike<number>} frame
 */
export function frameEnergy(frame) {
  const n = frame.length;
  if (!n) return 0;
  let sum = 0;
  const asInt16 =
    typeof Int16Array !== "undefined" && frame instanceof Int16Array;
  for (let i = 0; i < n; i++) {
    const raw = frame[i];
    const sample = asInt16
      ? raw / 32768
      : Math.abs(raw) > 1.5
        ? raw / 32768
        : raw;
    sum += sample * sample;
  }
  return Math.sqrt(sum / n);
}

/**
 * Energy-VAD utterance detector.
 * States: idle → speaking → trailing → ended
 *
 * @param {Partial<ReturnType<typeof resolveAlwaysOnListenOptions>> & {
 *   onStateChange?: (state: string, prev: string) => void,
 *   onEnded?: (info: { speechMs: number, silenceMs: number }) => void,
 *   nowMs?: () => number,
 * }} [opts]
 */
export function createUtteranceDetector(opts = {}) {
  const config = resolveAlwaysOnListenOptions(opts);
  let state = "idle";
  let speechMs = 0;
  let silenceMs = 0;
  let endedInfo = null;

  const emitState = (next) => {
    if (next === state) return;
    const prev = state;
    state = next;
    opts.onStateChange?.(state, prev);
  };

  const samplesToMs = (sampleCount) =>
    (sampleCount / config.sampleRateHz) * 1000;

  return {
    get state() {
      return state;
    },
    get config() {
      return { ...config };
    },
    get speechMs() {
      return speechMs;
    },
    get silenceMs() {
      return silenceMs;
    },
    get endedInfo() {
      return endedInfo;
    },

    /**
     * Push one PCM frame. Returns the current state after processing.
     * @param {Int16Array | Float32Array | ArrayLike<number>} frame
     */
    pushFrame(frame) {
      if (state === "ended") return state;

      const energy = frameEnergy(frame);
      const dt = samplesToMs(frame.length || config.frameSamples);
      const isSpeech = energy >= config.energyThreshold;

      switch (state) {
        case "idle": {
          if (isSpeech) {
            speechMs = dt;
            silenceMs = 0;
            emitState("speaking");
          }
          break;
        }
        case "speaking": {
          if (isSpeech) {
            speechMs += dt;
            silenceMs = 0;
          } else {
            silenceMs = dt;
            emitState("trailing");
            if (
              speechMs >= config.minSpeechMs &&
              silenceMs >= config.trailingSilenceMs
            ) {
              endedInfo = { speechMs, silenceMs };
              emitState("ended");
              opts.onEnded?.(endedInfo);
            }
          }
          break;
        }
        case "trailing": {
          if (isSpeech) {
            speechMs += dt;
            silenceMs = 0;
            emitState("speaking");
          } else {
            silenceMs += dt;
            if (
              speechMs >= config.minSpeechMs &&
              silenceMs >= config.trailingSilenceMs
            ) {
              endedInfo = { speechMs, silenceMs };
              emitState("ended");
              opts.onEnded?.(endedInfo);
            }
          }
          break;
        }
        case "ended":
          break;
        default: {
          const _exhaustive = state;
          throw new Error(`Unknown utterance state: ${_exhaustive}`);
        }
      }

      return state;
    },

    /** Reset back to idle for the next utterance. */
    reset() {
      speechMs = 0;
      silenceMs = 0;
      endedInfo = null;
      emitState("idle");
    },
  };
}

/**
 * Always-on listen controller.
 *
 * Subscribes to `mic.onFrame`, runs energy VAD, and on utterance end calls
 * `stopListeningAndTalk(extra)` then loops `startListening()` until stopped.
 *
 * While talk is in flight (`_busy`), optional barge-in watches mic energy and
 * calls `onBargeIn` so the host can abort TTS / robot speech.
 */
export class AlwaysOnListenController {
  /**
   * @param {{
   *   mic: { onFrame: (cb: (frame: Int16Array | Float32Array) => void) => (() => void) },
   *   startListening: () => void | Promise<void>,
   *   stopListeningAndTalk: (extra?: unknown) => void | Promise<void>,
   *   getTurnExtra?: () => unknown | Promise<unknown>,
   *   energyThreshold?: number,
   *   minSpeechMs?: number,
   *   trailingSilenceMs?: number,
   *   sampleRateHz?: number,
   *   frameSamples?: number,
   *   onStateChange?: (state: string, prev: string) => void,
   *   onUtteranceEnded?: (info: { speechMs: number, silenceMs: number }) => void,
   *   onError?: (error: unknown) => void,
   *   bargeDuringTalk?: boolean,
   *   bargeEnergyThreshold?: number,
   *   bargeMinSpeechMs?: number,
   *   onBargeIn?: (info: { energy: number, speechMs: number }) => void | Promise<void>,
   * }} opts
   */
  constructor(opts) {
    if (!opts?.mic?.onFrame) {
      throw new TypeError("AlwaysOnListenController requires mic.onFrame");
    }
    if (typeof opts.startListening !== "function") {
      throw new TypeError("AlwaysOnListenController requires startListening()");
    }
    if (typeof opts.stopListeningAndTalk !== "function") {
      throw new TypeError(
        "AlwaysOnListenController requires stopListeningAndTalk()",
      );
    }

    this.opts = opts;
    this._active = false;
    this._busy = false;
    this._unsubscribe = null;
    this._detector = createUtteranceDetector({
      energyThreshold: opts.energyThreshold,
      minSpeechMs: opts.minSpeechMs,
      trailingSilenceMs: opts.trailingSilenceMs,
      sampleRateHz: opts.sampleRateHz,
      frameSamples: opts.frameSamples,
      onStateChange: (state, prev) => opts.onStateChange?.(state, prev),
    });
    this._bargeSpeechMs = 0;
    this._barging = false;
    this._bargeFired = false;
  }

  get active() {
    return this._active;
  }

  get busy() {
    return this._busy;
  }

  get bargeEnabled() {
    if (this.opts.bargeDuringTalk === false) return false;
    return typeof this.opts.onBargeIn === "function";
  }

  get detectorState() {
    return this._detector.state;
  }

  get detector() {
    return this._detector;
  }

  /** Start the always-on listen loop. */
  async start() {
    if (this._active) return;
    this._active = true;
    this._detector.reset();
    this._unsubscribe = this.opts.mic.onFrame((frame) => {
      void this._onFrame(frame);
    });
    await this.opts.startListening();
  }

  /** Stop the loop (does not force a talk turn). */
  async stop() {
    this._active = false;
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._detector.reset();
    this._bargeSpeechMs = 0;
    this._barging = false;
    this._bargeFired = false;
  }

  /** @param {Int16Array | Float32Array | ArrayLike<number>} frame */
  async _onFrame(frame) {
    if (!this._active) return;

    if (this._busy) {
      await this._maybeBarge(frame);
      return;
    }

    const next = this._detector.pushFrame(frame);
    if (next !== "ended") return;

    this._busy = true;
    this._bargeSpeechMs = 0;
    this._barging = false;
    this._bargeFired = false;
    try {
      const info = this._detector.endedInfo;
      this.opts.onUtteranceEnded?.(info);

      let extra;
      if (typeof this.opts.getTurnExtra === "function") {
        extra = await this.opts.getTurnExtra();
      }

      await this.opts.stopListeningAndTalk(extra);

      if (!this._active) return;

      this._detector.reset();
      await this.opts.startListening();
    } catch (error) {
      this.opts.onError?.(error);
      this._active = false;
      if (this._unsubscribe) {
        this._unsubscribe();
        this._unsubscribe = null;
      }
    } finally {
      this._busy = false;
      this._bargeSpeechMs = 0;
      this._barging = false;
      this._bargeFired = false;
    }
  }

  /**
   * While TTS / robot talk is running, sustained mic energy → barge-in.
   * @param {Int16Array | Float32Array | ArrayLike<number>} frame
   */
  async _maybeBarge(frame) {
    if (!this.bargeEnabled || this._barging || this._bargeFired) return;

    const config = this._detector.config;
    const threshold =
      this.opts.bargeEnergyThreshold ??
      Math.max(config.energyThreshold * 1.35, config.energyThreshold + 0.01);
    const minMs = this.opts.bargeMinSpeechMs ?? 90;
    const energy = frameEnergy(frame);
    const dt =
      ((frame.length || config.frameSamples) / config.sampleRateHz) * 1000;

    if (energy >= threshold) {
      this._bargeSpeechMs += dt;
    } else {
      this._bargeSpeechMs = 0;
      return;
    }

    if (this._bargeSpeechMs < minMs) return;

    this._barging = true;
    this._bargeFired = true;
    try {
      await this.opts.onBargeIn?.({
        energy,
        speechMs: this._bargeSpeechMs,
      });
    } catch (error) {
      this.opts.onError?.(error);
    } finally {
      this._barging = false;
    }
  }
}

/**
 * Factory for AlwaysOnListenController.
 * @param {ConstructorParameters<typeof AlwaysOnListenController>[0]} opts
 */
export function createAlwaysOnListen(opts) {
  return new AlwaysOnListenController(opts);
}
