/**
 * Partial / interim ASR — poll SenseVoice while the mic is still open
 * so the face can prefire emotion before end-of-utterance.
 */
import {
  callVoiceWorker,
  mockAsr,
} from './voiceWorkerClient.js';
import {
  emotionFromSenseVoice,
  parseSenseVoiceTranscript,
} from './senseVoice.js';
import { detectLanguage } from './dialect.js';
import {
  arrayBufferToBase64,
  downsampleMono,
  encodeWavPcm16,
} from './browserAudio.js';

/**
 * @param {{
 *   workerUrl?: string,
 *   language?: string,
 *   intervalMs?: number,
 *   mode?: 'mock' | 'http',
 *   onPartial?: (ev: object) => void,
 * }} [opts]
 */
export function createPartialAsrWatcher(opts = {}) {
  const intervalMs = Math.max(200, Number(opts.intervalMs) || 450);
  let timer = null;
  let sequence = 0;
  let lastText = '';
  /** @type {(() => Promise<string | null>) | null} */
  let getAudioBase64 = null;

  async function tick() {
    if (!getAudioBase64) return;
    const workerUrl =
      opts.workerUrl ||
      (typeof process !== 'undefined' ? process.env?.AMOJI_VOICE_WORKER : '') ||
      '';
    sequence += 1;
    const seq = sequence;
    let payload;

    try {
      const audioBase64 = await getAudioBase64();
      if (workerUrl && audioBase64) {
        payload = await callVoiceWorker(workerUrl, '/asr/partial', {
          audioBase64,
          language: opts.language || 'yue',
          interim: true,
          sequence: seq,
        });
      } else if (opts.mode === 'mock' && audioBase64) {
        // Lab stub: treat non-null snapshot as "still listening" heartbeat only
        // unless supplier embeds a text marker (tests pass text via mockAsr path).
        payload = await mockAsr({
          text: typeof audioBase64 === 'string' && audioBase64.startsWith('<|')
            ? audioBase64
            : undefined,
          language: opts.language || 'yue',
        });
        if (!(typeof audioBase64 === 'string' && audioBase64.startsWith('<|'))) {
          payload = {
            provider: 'local',
            interim: true,
            sequence: seq,
            text: lastText,
            language: opts.language || 'yue',
          };
        }
      } else {
        payload = {
          provider: 'local',
          interim: true,
          sequence: seq,
          text: lastText,
          language: opts.language || 'yue',
        };
      }
    } catch {
      return;
    }

    if (seq !== sequence) return;
    const parsed = parseSenseVoiceTranscript(payload.raw || payload.text || '');
    const text = parsed.text || payload.text || '';
    if (text && text !== lastText) {
      lastText = text;
      const language = detectLanguage(
        { language: parsed.language || payload.language, text, asrRaw: payload.raw },
        { preferred: opts.language || 'yue' },
      );
      const emotion = emotionFromSenseVoice({
        text,
        serEmotion: parsed.serEmotion || payload.serEmotion,
        language: language.id,
      });
      opts.onPartial?.({
        type: 'asr_partial',
        data: {
          text,
          language: language.id,
          languageSource: language.source,
          emotion: emotion.emotion,
          intensity: emotion.intensity,
          serEmotion: parsed.serEmotion || payload.serEmotion || null,
          sequence: seq,
          interim: true,
        },
      });
    }
  }

  return {
    /**
     * @param {() => Promise<string | null>} supplier — latest WAV base64 (or SenseVoice-tagged text in mock tests)
     */
    start(supplier) {
      this.stop();
      getAudioBase64 = supplier;
      sequence = 0;
      lastText = '';
      timer = setInterval(() => {
        tick().catch(() => {});
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      getAudioBase64 = null;
    },
    get lastText() {
      return lastText;
    },
  };
}

/**
 * Snapshot mic float chunks as WAV base64 without stopping capture.
 * @param {{ _chunks?: Float32Array[], _inputRate?: number, targetSampleRate?: number }} mic
 * @param {{
 *   encodeWavPcm16?: typeof encodeWavPcm16,
 *   arrayBufferToBase64?: typeof arrayBufferToBase64,
 *   downsampleMono?: typeof downsampleMono,
 * }} [codec]
 */
export function snapshotMicWavBase64(mic, codec = {}) {
  const encode = codec.encodeWavPcm16 || encodeWavPcm16;
  const toB64 = codec.arrayBufferToBase64 || arrayBufferToBase64;
  const down = codec.downsampleMono || downsampleMono;
  if (!mic?._chunks?.length) return null;
  let total = 0;
  for (const c of mic._chunks) total += c.length;
  const merged = new Float32Array(total);
  let off = 0;
  for (const c of mic._chunks) {
    merged.set(c, off);
    off += c.length;
  }
  const pcm = down(merged, mic._inputRate || 48000, mic.targetSampleRate || 16000);
  if (pcm.length < 1600) return null;
  const wav = encode(pcm, mic.targetSampleRate || 16000);
  return toB64(wav);
}
