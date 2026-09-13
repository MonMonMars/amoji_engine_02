/**
 * Browser / Node audio helpers for SenseVoice WAV snapshots + TTS playback.
 * Pure codecs work in Node; `TtsChunkPlayer` needs a browser (or offline clock).
 */
export const BROWSER_AUDIO_SCHEMA = 'amoji.browserAudio.v1';

/**
 * @param {Float32Array | number[]} samples
 * @param {number} [sampleRate]
 * @returns {ArrayBuffer}
 */
export function encodeWavPcm16(samples, sampleRate = 16000) {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buffer;
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * @param {string} b64
 * @returns {Uint8Array}
 */
export function base64ToBytes(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(String(b64), 'base64'));
  }
  const binary = atob(String(b64));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Soft tone (or silence) WAV for mock CosyVoice chunks — playable in Web Audio.
 * @param {{
 *   durationSec?: number,
 *   sampleRate?: number,
 *   frequencyHz?: number,
 *   amplitude?: number,
 *   silent?: boolean,
 * }} [opts]
 */
export function synthesizeWavBase64(opts = {}) {
  const sampleRate = opts.sampleRate || 22050;
  const durationSec = Math.max(0.04, Number(opts.durationSec) || 0.2);
  const n = Math.max(1, Math.floor(sampleRate * durationSec));
  const samples = new Float32Array(n);
  if (!opts.silent) {
    const freq = opts.frequencyHz ?? 220;
    const amp = opts.amplitude ?? 0.08;
    for (let i = 0; i < n; i += 1) {
      const t = i / sampleRate;
      const env =
        Math.min(1, i / (0.01 * sampleRate)) *
        Math.min(1, (n - i) / (0.02 * sampleRate));
      samples[i] = Math.sin(2 * Math.PI * freq * t) * amp * env;
    }
  }
  return arrayBufferToBase64(encodeWavPcm16(samples, sampleRate));
}

/**
 * @param {Float32Array | number[]} samples
 * @param {number} fromRate
 * @param {number} toRate
 * @returns {Float32Array}
 */
export function downsampleMono(samples, fromRate, toRate) {
  if (!samples?.length) return new Float32Array(0);
  if (fromRate === toRate) {
    return samples instanceof Float32Array
      ? samples
      : Float32Array.from(samples);
  }
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      sum += samples[j];
      count += 1;
    }
    out[i] = count ? sum / count : samples[start] || 0;
  }
  return out;
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Queue + play streamed TTS chunks (WAV or raw PCM base64).
 * Browser uses Web Audio; Node / tests use duration-based offline clock.
 * Optional `onLipSync` receives Face Live mouth params per chunk.
 */
export class TtsChunkPlayer {
  /**
   * @param {{
   *   onStart?: (chunk: object) => void,
   *   onEnd?: (chunk: object) => void,
   *   onIdle?: () => void,
   *   onLipSync?: (payload: { chunk: object, mouthOpen: number, parameters: object[] }) => void,
   *   lipSync?: { pushChunk: Function, reset?: Function } | null,
   *   offline?: boolean,
   *   gain?: number,
   *   createAudioContext?: () => AudioContext,
   * }} [opts]
   */
  constructor(opts = {}) {
    this.onStart = opts.onStart || null;
    this.onEnd = opts.onEnd || null;
    this.onIdle = opts.onIdle || null;
    this.onLipSync = opts.onLipSync || null;
    this.lipSync = opts.lipSync || null;
    this.offline =
      opts.offline === true ||
      (typeof globalThis.AudioContext === 'undefined' &&
        typeof globalThis.webkitAudioContext === 'undefined');
    this.createAudioContext = opts.createAudioContext || null;
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {object[]} */
    this._queue = [];
    this._playing = false;
    this._generation = 0;
    this.muted = false;
    this._played = 0;
    this._lastMouthOpen = 0;
    this._gain =
      typeof opts.gain === "number" && Number.isFinite(opts.gain)
        ? Math.max(0, opts.gain)
        : 1;
    /** @type {GainNode | null} */
    this._gainNode = null;
  }

  async ensureCtx() {
    if (this.offline) return null;
    if (!this.ctx) {
      if (this.createAudioContext) {
        this.ctx = this.createAudioContext();
      } else {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) {
          this.offline = true;
          return null;
        }
        this.ctx = new AC();
      }
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (this.ctx && !this._gainNode && typeof this.ctx.createGain === "function") {
      this._gainNode = this.ctx.createGain();
      this._gainNode.gain.value = this._gain;
      this._gainNode.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  get playing() {
    return this._playing;
  }

  get queueLength() {
    return this._queue.length;
  }

  get playedCount() {
    return this._played;
  }

  get lastMouthOpen() {
    return this._lastMouthOpen;
  }

  get gain() {
    return this._gain;
  }

  /**
   * Linear playback gain (0 = silent, 1 = unity). Applied via GainNode when available.
   * @param {number} value
   */
  setGain(value) {
    const next = Math.max(0, Number(value));
    this._gain = Number.isFinite(next) ? next : 1;
    if (this._gainNode) {
      try {
        this._gainNode.gain.value = this._gain;
      } catch {
        /* ignore */
      }
    }
    return this._gain;
  }

  /**
   * Mute / unmute TTS playback. Muting flushes the queue (barge-safe).
   * @param {boolean} [muted]
   */
  setMuted(muted = true) {
    this.muted = Boolean(muted);
    if (this.muted) this.flush();
    return this.muted;
  }

  /**
   * @param {object} chunk
   */
  async enqueue(chunk) {
    if (this.muted) return;
    this._queue.push(chunk);
    if (!this._playing) await this._drain();
  }

  /** Enqueue many chunks (e.g. worker.tts result). */
  async enqueueAll(chunks = []) {
    for (const c of chunks) {
      if (this.muted) return;
      this._queue.push(c);
    }
    if (!this._playing && this._queue.length) await this._drain();
  }

  /** Barge-in: drop queued + stop current audio. */
  flush() {
    this._generation += 1;
    this._queue = [];
    this._playing = false;
    this._lastMouthOpen = 0;
    this.lipSync?.reset?.();
    try {
      this.ctx?.suspend?.();
    } catch {
      /* ignore */
    }
    this.onIdle?.();
  }

  /**
   * @param {object} chunk
   */
  _emitLipSync(chunk) {
    if (!this.onLipSync && !this.lipSync) return;
    let mouthOpen = 0;
    /** @type {object[]} */
    let parameters = [];
    if (this.lipSync?.pushChunk) {
      const result = this.lipSync.pushChunk(chunk);
      mouthOpen = result.mouthOpen;
      parameters = result.parameters || [];
    } else {
      mouthOpen = Math.min(
        0.9,
        0.2 + String(chunk.text || '').length * 0.05,
      );
      parameters = [
        { id: 'ParamMouthOpenY', value: mouthOpen },
        { id: 'ParamMouthSmile', value: mouthOpen > 0.1 ? 0.25 : 0.12 },
      ];
    }
    this._lastMouthOpen = mouthOpen;
    this.onLipSync?.({ chunk, mouthOpen, parameters });
  }

  async _drain() {
    const gen = this._generation;
    this._playing = true;
    const ctx = await this.ensureCtx();
    while (this._queue.length && gen === this._generation) {
      const chunk = this._queue.shift();
      this.onStart?.(chunk);
      this._emitLipSync(chunk);
      try {
        if (ctx && !this.offline) {
          const buffer = await decodeChunkToAudioBuffer(ctx, chunk);
          if (gen !== this._generation) break;
          await playAudioBuffer(ctx, buffer, {
            destination: this._gainNode || ctx.destination,
          });
        } else {
          const dur = Math.max(0.04, Number(chunk.durationSec) || 0.12);
          await sleep(dur * 1000);
        }
      } catch {
        const dur = Math.max(0.04, Number(chunk.durationSec) || 0.12);
        await sleep(dur * 1000);
      }
      if (gen !== this._generation) break;
      this._played += 1;
      this.onEnd?.(chunk);
      const pauseMs = chunk.prosody?.pauseMs || chunk.pauseMs || 0;
      if (pauseMs > 0 && this._queue.length) {
        await sleep(Math.min(pauseMs, 600));
      }
    }
    if (gen === this._generation) {
      this._playing = false;
      this._lastMouthOpen = 0;
      this.lipSync?.reset?.();
      this.onIdle?.();
    }
  }
}

/**
 * @param {{
 *   onStart?: (chunk: object) => void,
 *   onEnd?: (chunk: object) => void,
 *   onIdle?: () => void,
 *   onLipSync?: (payload: object) => void,
 *   lipSync?: object,
 *   offline?: boolean,
 *   gain?: number,
 * }} [opts]
 */
export function createTtsPlaybackQueue(opts = {}) {
  return new TtsChunkPlayer(opts);
}

/**
 * @param {AudioContext} ctx
 * @param {object} chunk
 */
export async function decodeChunkToAudioBuffer(ctx, chunk) {
  if (chunk?.pcmBase64) {
    const bytes = base64ToBytes(chunk.pcmBase64);
    if (
      bytes.length >= 12 &&
      String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF'
    ) {
      const ab = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      );
      return ctx.decodeAudioData(ab.slice(0));
    }
    const sampleRate = chunk.sampleRate || 22050;
    const samples = Math.floor(bytes.length / 2);
    const audio = ctx.createBuffer(1, samples, sampleRate);
    const ch = audio.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < samples; i += 1) {
      ch[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    return audio;
  }
  const dur = Math.max(0.05, Number(chunk.durationSec) || 0.12);
  const sampleRate = chunk.sampleRate || 22050;
  const n = Math.floor(sampleRate * dur);
  const audio = ctx.createBuffer(1, n, sampleRate);
  const ch = audio.getChannelData(0);
  const freq = 180 + (String(chunk.text || '').length % 8) * 20;
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const env =
      Math.min(1, i / (0.01 * sampleRate)) *
      Math.min(1, (n - i) / (0.02 * sampleRate));
    ch[i] = Math.sin(2 * Math.PI * freq * t) * 0.08 * env;
  }
  return audio;
}

/**
 * @param {AudioContext} ctx
 * @param {AudioBuffer} buffer
 * @param {{ destination?: AudioNode }} [opts]
 */
function playAudioBuffer(ctx, buffer, opts = {}) {
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(opts.destination || ctx.destination);
    src.onended = () => resolve();
    src.start();
  });
}
