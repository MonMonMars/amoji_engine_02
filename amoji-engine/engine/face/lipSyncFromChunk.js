/**
 * Lip-sync from TTS PCM / WAV chunks → Face Live mouth parameters.
 * Mirrors `src/face-live/expressions.ts` for the JS engine / lab.
 */
import { base64ToBytes } from '../voice/browserAudio.js';

export const LIP_SYNC_SCHEMA = 'amoji.lipSync.v1';

export const LIP_SYNC_PARAM_IDS = Object.freeze({
  mouthOpen: 'ParamMouthOpenY',
  mouthSmile: 'ParamMouthSmile',
});

/**
 * @param {Int16Array | Float32Array | ArrayLike<number>} pcm
 * @param {number} [sensitivity]
 */
export function mouthOpenFromPcm(pcm, sensitivity = 1.5) {
  const n = pcm?.length || 0;
  if (!n) return 0;
  let sum = 0;
  const asInt16 =
    typeof Int16Array !== 'undefined' && pcm instanceof Int16Array;
  for (let i = 0; i < n; i += 1) {
    const raw = pcm[i];
    const sample = asInt16
      ? raw / 32768
      : Math.abs(raw) > 1.5
        ? raw / 32768
        : raw;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / n);
  return Math.min(1, rms * sensitivity);
}

/**
 * @param {number} next
 * @param {number} previous
 * @param {number} [alpha]
 */
export function smoothMouthOpen(next, previous, alpha = 0.45) {
  const a = Math.max(0, Math.min(1, alpha));
  return previous * (1 - a) + next * a;
}

/**
 * Decode WAV (RIFF) or raw PCM16 little-endian from base64.
 * @param {string} pcmBase64
 * @returns {{ samples: Float32Array, sampleRate: number }}
 */
export function decodePcmBase64ToFloat32(pcmBase64) {
  const bytes = base64ToBytes(pcmBase64 || '');
  if (bytes.length < 4) {
    return { samples: new Float32Array(0), sampleRate: 22050 };
  }
  const isRiff =
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF';
  if (isRiff) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let sampleRate = 22050;
    let dataOffset = 44;
    let dataBytes = Math.max(0, bytes.length - 44);
    // Scan for 'fmt ' and 'data' chunks (minimal WAV parser)
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
      );
      const size = view.getUint32(offset + 4, true);
      if (id === 'fmt ' && size >= 16) {
        sampleRate = view.getUint32(offset + 12, true) || sampleRate;
      } else if (id === 'data') {
        dataOffset = offset + 8;
        dataBytes = size;
        break;
      }
      offset += 8 + size + (size % 2);
    }
    const sampleCount = Math.floor(dataBytes / 2);
    const samples = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
      samples[i] = view.getInt16(dataOffset + i * 2, true) / 0x8000;
    }
    return { samples, sampleRate };
  }
  const sampleCount = Math.floor(bytes.length / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i += 1) {
    samples[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return { samples, sampleRate: 22050 };
}

/**
 * Build Face Live lip-sync params from a worker TTS chunk.
 * @param {object} chunk
 * @param {{
 *   previousMouthOpen?: number,
 *   sensitivity?: number,
 *   alpha?: number,
 *   emotion?: string,
 * }} [opts]
 */
export function lipSyncParamsFromChunk(chunk = {}, opts = {}) {
  let mouthOpen = 0;
  if (chunk.pcmBase64) {
    const { samples } = decodePcmBase64ToFloat32(chunk.pcmBase64);
    mouthOpen = mouthOpenFromPcm(samples, opts.sensitivity ?? 1.5);
  } else {
    // Fallback: estimate from duration / text energy
    const dur = Number(chunk.durationSec) || 0.12;
    const textLen = String(chunk.text || '').length;
    mouthOpen = Math.min(0.85, 0.15 + textLen * 0.04 + dur * 0.2);
  }

  if (opts.previousMouthOpen != null) {
    mouthOpen = smoothMouthOpen(
      mouthOpen,
      opts.previousMouthOpen,
      opts.alpha ?? 0.45,
    );
  }

  const smileBase =
    opts.emotion === 'happy' || chunk.emotion === 'happy' ? 0.45 : 0.12;
  const smile = mouthOpen > 0.1 ? Math.max(smileBase, 0.25) : smileBase * 0.7;

  return {
    schema: LIP_SYNC_SCHEMA,
    mouthOpen: Number(mouthOpen.toFixed(3)),
    parameters: [
      { id: LIP_SYNC_PARAM_IDS.mouthOpen, value: Number(mouthOpen.toFixed(3)) },
      { id: LIP_SYNC_PARAM_IDS.mouthSmile, value: Number(smile.toFixed(3)) },
    ],
  };
}

/**
 * Stateful smoother for streaming TTS chunks → Face Live inject.
 * @param {{ sensitivity?: number, alpha?: number }} [opts]
 */
export function createLipSyncTracker(opts = {}) {
  let previousMouthOpen = 0;
  let lastParams = [];
  return {
    get mouthOpen() {
      return previousMouthOpen;
    },
    get lastParams() {
      return lastParams.slice();
    },
    /**
     * @param {object} chunk
     * @param {{ emotion?: string }} [extra]
     */
    pushChunk(chunk, extra = {}) {
      const result = lipSyncParamsFromChunk(chunk, {
        previousMouthOpen,
        sensitivity: opts.sensitivity,
        alpha: opts.alpha,
        emotion: extra.emotion || chunk.emotion,
      });
      previousMouthOpen = result.mouthOpen;
      lastParams = result.parameters;
      return result;
    },
    reset() {
      previousMouthOpen = 0;
      lastParams = [
        { id: LIP_SYNC_PARAM_IDS.mouthOpen, value: 0 },
        { id: LIP_SYNC_PARAM_IDS.mouthSmile, value: 0.15 },
      ];
      return lastParams.slice();
    },
  };
}
