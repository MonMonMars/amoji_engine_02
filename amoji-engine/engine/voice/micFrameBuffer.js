/**
 * Mic frame ring buffer → WAV snapshot for SenseVoice /asr.
 * Pure JS; works in browser lab and Node tests.
 */
import {
  arrayBufferToBase64,
  downsampleMono,
  encodeWavPcm16,
} from './browserAudio.js';

/**
 * Accumulate Float32 / Int16 mic frames while listening.
 * @param {{
 *   inputRate?: number,
 *   targetSampleRate?: number,
 *   maxSeconds?: number,
 * }} [opts]
 */
export function createMicFrameBuffer(opts = {}) {
  const inputRate = opts.inputRate || 24000;
  const targetSampleRate = opts.targetSampleRate || 16000;
  const maxSeconds = opts.maxSeconds ?? 12;
  const maxSamples = Math.max(1600, Math.floor(inputRate * maxSeconds));
  /** @type {Float32Array[]} */
  let chunks = [];
  let total = 0;
  let speechMs = 0;
  let sequence = 0;

  const toFloat = (frame) => {
    if (frame instanceof Float32Array) return frame;
    if (typeof Int16Array !== 'undefined' && frame instanceof Int16Array) {
      const out = new Float32Array(frame.length);
      for (let i = 0; i < frame.length; i += 1) out[i] = frame[i] / 32768;
      return out;
    }
    return Float32Array.from(frame || [], (v) =>
      Math.abs(v) > 1.5 ? v / 32768 : v,
    );
  };

  return {
    get inputRate() {
      return inputRate;
    },
    get targetSampleRate() {
      return targetSampleRate;
    },
    get sampleCount() {
      return total;
    },
    get speechMs() {
      return speechMs;
    },
    get sequence() {
      return sequence;
    },
    /** @param {Float32Array | Int16Array | ArrayLike<number>} frame */
    push(frame) {
      const f = toFloat(frame);
      if (!f.length) return;
      chunks.push(f);
      total += f.length;
      speechMs += (f.length / inputRate) * 1000;
      while (total > maxSamples && chunks.length > 1) {
        const dropped = chunks.shift();
        total -= dropped.length;
      }
    },
    clear() {
      chunks = [];
      total = 0;
      speechMs = 0;
    },
    /** Begin a new utterance capture (keeps sequence counter). */
    beginUtterance() {
      this.clear();
      sequence += 1;
      return sequence;
    },
    /**
     * @returns {{ audioBase64: string | null, speechMs: number, sequence: number, sampleCount: number }}
     */
    snapshot() {
      if (total < Math.floor(inputRate * 0.08)) {
        return {
          audioBase64: null,
          speechMs,
          sequence,
          sampleCount: total,
        };
      }
      const merged = new Float32Array(total);
      let off = 0;
      for (const c of chunks) {
        merged.set(c, off);
        off += c.length;
      }
      const pcm = downsampleMono(merged, inputRate, targetSampleRate);
      const wav = encodeWavPcm16(pcm, targetSampleRate);
      return {
        audioBase64: arrayBufferToBase64(wav),
        speechMs,
        sequence,
        sampleCount: total,
      };
    },
  };
}
