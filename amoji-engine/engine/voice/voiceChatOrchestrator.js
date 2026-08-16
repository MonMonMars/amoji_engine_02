/**
 * Voice chat orchestrator — listen/talk turns with optional always-on VAD loop.
 *
 * Wraps {@link createAlwaysOnListen}: when always-on is active, mic frames drive
 * energy VAD end-of-utterance → stopListeningAndTalk → startListening.
 */

import {
  createAlwaysOnListen,
  resolveAlwaysOnListenOptions,
} from "./alwaysOnListen.js";

/**
 * @typedef {object} VoiceChatOrchestratorOptions
 * @property {{ onFrame: (cb: (frame: Int16Array | Float32Array) => void) => (() => void) }} [mic]
 *   Mic source required for always-on mode.
 * @property {boolean | Record<string, unknown>} [alwaysOn]
 *   `true` or VAD option overrides to enable always-on mode (still needs startAlwaysOn()).
 * @property {() => void | Promise<void>} [onStartListening]
 *   Host hook when a listen turn begins.
 * @property {(extra?: unknown) => void | Promise<void>} [onStopListeningAndTalk]
 *   Host hook when listen ends and talk should start.
 * @property {() => unknown | Promise<unknown>} [getTurnExtra]
 *   Optional per-turn payload for stopListeningAndTalk.
 * @property {(state: string, prev: string) => void} [onVadStateChange]
 * @property {(info: { speechMs: number, silenceMs: number }) => void} [onUtteranceEnded]
 * @property {(error: unknown) => void} [onError]
 * @property {number} [energyThreshold]
 * @property {number} [minSpeechMs]
 * @property {number} [trailingSilenceMs]
 * @property {number} [sampleRateHz]
 * @property {number} [frameSamples]
 */

export class VoiceChatOrchestrator {
  /**
   * @param {VoiceChatOrchestratorOptions} [opts]
   */
  constructor(opts = {}) {
    this.opts = opts;
    this._phase = "idle"; // idle | listening | talking
    this._alwaysOnMode = Boolean(opts.alwaysOn);
    this._alwaysOnOpts =
      opts.alwaysOn && typeof opts.alwaysOn === "object" ? opts.alwaysOn : {};
    this._controller = null;
  }

  /** Whether always-on mode was requested in the constructor. */
  get alwaysOnMode() {
    return this._alwaysOnMode;
  }

  /** Whether the always-on listen loop is currently running. */
  get alwaysOnActive() {
    return Boolean(this._controller?.active);
  }

  get phase() {
    return this._phase;
  }

  get detectorState() {
    return this._controller?.detectorState ?? null;
  }

  /**
   * Begin a listen turn (host hook + phase).
   * Used by AlwaysOnListen and by manual push-to-talk hosts.
   */
  async startListening() {
    this._phase = "listening";
    await this.opts.onStartListening?.();
  }

  /**
   * End listen and start talk, optionally with turn extras.
   * @param {unknown} [extra]
   */
  async stopListeningAndTalk(extra) {
    this._phase = "talking";
    await this.opts.onStopListeningAndTalk?.(extra);
  }

  /**
   * Start the always-on VAD listen loop.
   * Requires `mic.onFrame`. Enables always-on mode if it was not set at construct time.
   */
  async startAlwaysOn() {
    if (this._controller?.active) return this._controller;

    if (!this.opts.mic?.onFrame) {
      throw new TypeError(
        "VoiceChatOrchestrator.startAlwaysOn requires opts.mic.onFrame",
      );
    }

    this._alwaysOnMode = true;

    const vad = {
      ...resolveAlwaysOnListenOptions({
        energyThreshold: this.opts.energyThreshold,
        minSpeechMs: this.opts.minSpeechMs,
        trailingSilenceMs: this.opts.trailingSilenceMs,
        sampleRateHz: this.opts.sampleRateHz,
        frameSamples: this.opts.frameSamples,
        ...this._alwaysOnOpts,
      }),
    };

    this._controller = createAlwaysOnListen({
      mic: this.opts.mic,
      startListening: () => this.startListening(),
      stopListeningAndTalk: (extra) => this.stopListeningAndTalk(extra),
      getTurnExtra: this.opts.getTurnExtra,
      energyThreshold: vad.energyThreshold,
      minSpeechMs: vad.minSpeechMs,
      trailingSilenceMs: vad.trailingSilenceMs,
      sampleRateHz: vad.sampleRateHz,
      frameSamples: vad.frameSamples,
      onStateChange: this.opts.onVadStateChange,
      onUtteranceEnded: this.opts.onUtteranceEnded,
      onError: this.opts.onError,
    });

    await this._controller.start();
    return this._controller;
  }

  /** Stop the always-on loop without forcing a talk turn. */
  async stopAlwaysOn() {
    if (!this._controller) {
      this._phase = "idle";
      return;
    }
    await this._controller.stop();
    this._controller = null;
    this._phase = "idle";
  }
}

/**
 * @param {VoiceChatOrchestratorOptions} [opts]
 */
export function createVoiceChatOrchestrator(opts = {}) {
  return new VoiceChatOrchestrator(opts);
}
