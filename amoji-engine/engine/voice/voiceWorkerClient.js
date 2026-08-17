/**
 * SenseVoice ASR + CosyVoice TTS worker client.
 *
 * Modes:
 *   - mock  — offline stubs (tests / lab without GPU)
 *   - http  — POST to Python voice_bridge_server.py
 *
 * Endpoints (worker): /health, /asr, /asr/partial, /tts, /tts/stream
 */
import {
  emotionFromSenseVoice,
  parseSenseVoiceTranscript,
} from './senseVoice.js';
import { detectLanguage, stripAsrTags } from './dialect.js';
import { prosodyFromMarkedText } from './prosodyMarkers.js';
import { synthesizeWavBase64 } from './browserAudio.js';

export const VOICE_WORKER_SCHEMA = 'amoji.voiceWorker.v1';

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {object} body
 */
export async function callVoiceWorker(baseUrl, path, body) {
  const url = `${String(baseUrl).replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`voice worker ${res.status}: ${errText.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * GET /health on an HTTP voice worker.
 * @param {string} baseUrl
 * @param {{ signal?: AbortSignal, timeoutMs?: number }} [opts]
 */
export async function callVoiceWorkerHealth(baseUrl, opts = {}) {
  const url = `${String(baseUrl).replace(/\/$/, '')}/health`;
  const timeoutMs = Number(opts.timeoutMs) || 2500;
  const ctrl = opts.signal ? null : new AbortController();
  const timer =
    ctrl && timeoutMs > 0
      ? setTimeout(() => ctrl.abort(), timeoutMs)
      : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: opts.signal || ctrl?.signal,
    });
    if (!res.ok) {
      throw new Error(`voice worker health ${res.status}`);
    }
    const body = await res.json();
    return { ok: true, ...body, url };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Stream NDJSON lines from POST /tts/stream.
 * @param {string} baseUrl
 * @param {object} body
 * @param {{ onChunk?: (chunk: object) => void }} [opts]
 */
export async function callVoiceWorkerTtsStream(baseUrl, body, opts = {}) {
  const url = `${String(baseUrl).replace(/\/$/, '')}/tts/stream`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({ ...body, streaming: true }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`voice worker stream ${res.status}: ${errText.slice(0, 200)}`);
  }

  const chunks = [];
  let provider = 'http-stream';
  const text = await res.text();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    /** @type {object} */
    let row;
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (row.type === 'meta') {
      provider = row.provider || provider;
      continue;
    }
    if (row.type === 'chunk' || row.index != null) {
      const chunk = row.type === 'chunk' ? row.data || row : row;
      chunks.push(chunk);
      opts.onChunk?.(chunk);
    }
  }
  return {
    provider,
    chunkCount: chunks.length,
    durationSec: chunks.reduce((s, c) => s + (c.durationSec || 0), 0),
    chunks,
  };
}

/**
 * Mock ASR — text passthrough, audio-only stub lines, or default happy Cantonese.
 * @param {{ audioPath?: string, text?: string, language?: string, audioBase64?: string, speechMs?: number, sequence?: number }} [input]
 */
export async function mockAsr(input = {}) {
  let parsed;
  if (input.text) {
    parsed = parseSenseVoiceTranscript(input.text);
  } else if (input.audioBase64 || input.audioPath || input.speechMs != null) {
    const seq = Number(input.sequence) || Math.max(1, Math.round((input.speechMs || 400) / 200));
    const stubs = [
      '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀',
      '<|yue|><|NEUTRAL|><|Speech|>喂，你喺度嗎？',
      '<|yue|><|HAPPY|><|Speech|>我想聽吓歌',
      '<|en|><|NEUTRAL|><|Speech|>Hello there, how are you?',
      '<|yue|><|SAD|><|Speech|>我今日有啲攰',
    ];
    parsed = parseSenseVoiceTranscript(stubs[Math.abs(seq) % stubs.length]);
  } else {
    parsed = {
      text: '今日天氣好正呀，我好開心！',
      raw: '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀，我好開心！',
      language: 'yue',
      serEmotion: 'happy',
      audioEvent: 'speech',
      tags: ['yue', 'HAPPY', 'Speech'],
    };
  }
  if (input.language && !parsed.language) parsed.language = input.language;
  return {
    provider: 'mock',
    schema: VOICE_WORKER_SCHEMA,
    ...parsed,
    durationSec: Math.max(0.8, (parsed.text?.length || 8) / 8),
  };
}

/**
 * @param {object} partial
 */
function makeTtsChunk(partial) {
  return {
    index: 0,
    text: '',
    pcmBase64: null,
    sampleRate: 22050,
    durationSec: 0.2,
    final: false,
    provider: 'mock',
    langTag: '<|yue|>',
    emotion: 'neutral',
    ...partial,
  };
}

/**
 * Mock CosyVoice-style TTS stream (metadata chunks; optional silent delay).
 * @param {{
 *   text: string,
 *   language?: string,
 *   emotion?: string,
 *   instruct?: string,
 *   speed?: number,
 *   pauseMs?: number,
 * }} input
 * @param {{ onChunk?: (chunk: object) => void, chunkDelayMs?: number }} [opts]
 */
export async function mockTtsStream(input, opts = {}) {
  const text = String(input.text || '').trim();
  const language = input.language || 'yue';
  const langTag =
    language === 'en' ? '<|en|>' : language === 'zh' ? '<|zh|>' : '<|yue|>';
  const speed = Math.max(0.5, Math.min(2, Number(input.speed) || 1));
  const chars = [...text];
  const chunkSize = 4;
  const chunks = [];
  let i = 0;
  let index = 0;
  const delayMs = Math.max(0, Number(opts.chunkDelayMs) || 0);

  while (i < chars.length) {
    const slice = chars.slice(i, i + chunkSize).join('');
    i += chunkSize;
    const durationSec = Math.max(0.12, slice.length * 0.09) / speed;
    const freq = 200 + (index % 5) * 30 + (language === 'en' ? 40 : 0);
    const chunk = makeTtsChunk({
      index,
      text: slice,
      durationSec,
      final: i >= chars.length,
      provider: 'mock',
      langTag,
      emotion: input.emotion || 'neutral',
      instruct: input.instruct || null,
      speed,
      pauseMs: input.pauseMs ?? 180,
      sampleRate: 22050,
      pcmBase64: synthesizeWavBase64({
        durationSec,
        sampleRate: 22050,
        frequencyHz: freq,
        amplitude: 0.07,
      }),
    });
    chunks.push(chunk);
    opts.onChunk?.(chunk);
    if (delayMs) await sleep(delayMs);
    index += 1;
  }
  if (!chunks.length) {
    const empty = makeTtsChunk({
      index: 0,
      text: '',
      final: true,
      provider: 'mock',
      langTag,
      emotion: input.emotion || 'neutral',
      instruct: input.instruct || null,
      speed,
      sampleRate: 22050,
      pcmBase64: synthesizeWavBase64({
        durationSec: 0.08,
        silent: true,
        sampleRate: 22050,
      }),
    });
    chunks.push(empty);
    opts.onChunk?.(empty);
  }
  return {
    provider: 'mock',
    schema: VOICE_WORKER_SCHEMA,
    text,
    language,
    chunkCount: chunks.length,
    durationSec: chunks.reduce((s, c) => s + c.durationSec, 0),
    chunks,
  };
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Unified worker façade: mock or HTTP SenseVoice/CosyVoice.
 * @param {{
 *   mode?: 'mock' | 'http',
 *   workerUrl?: string,
 *   language?: string,
 *   forceLanguage?: string | null,
 *   chunkDelayMs?: number,
 *   onEvent?: (ev: { type: string, data: object }) => void,
 * }} [opts]
 */
export function createVoiceWorkerClient(opts = {}) {
  const mode =
    opts.mode ||
    (opts.workerUrl ||
    (typeof process !== 'undefined' && process.env?.AMOJI_VOICE_WORKER)
      ? 'http'
      : 'mock');
  const workerUrl =
    opts.workerUrl ||
    (typeof process !== 'undefined' ? process.env?.AMOJI_VOICE_WORKER : '') ||
    '';
  let language = opts.language || 'yue';
  let forceLanguage =
    opts.forceLanguage == null || opts.forceLanguage === ''
      ? null
      : String(opts.forceLanguage).toLowerCase();

  const emit = (type, data) => opts.onEvent?.({ type, data });

  return {
    get schema() {
      return VOICE_WORKER_SCHEMA;
    },
    get mode() {
      return mode;
    },
    get workerUrl() {
      return workerUrl;
    },
    get language() {
      return language;
    },
    get forceLanguage() {
      return forceLanguage;
    },
    setLanguage(id) {
      language = id || language;
      return language;
    },
    /**
     * Lock dialect (`yue`/`en`) or pass null/'' for auto-detect.
     * @param {string | null | undefined} id
     */
    setForceLanguage(id) {
      forceLanguage =
        id == null || id === '' || id === 'auto'
          ? null
          : String(id).toLowerCase();
      if (forceLanguage) language = forceLanguage;
      return forceLanguage;
    },

    /**
     * Probe worker readiness (mock always ok; HTTP hits GET /health).
     * @param {{ signal?: AbortSignal, timeoutMs?: number }} [healthOpts]
     */
    async health(healthOpts = {}) {
      if (mode !== 'http' || !workerUrl) {
        const out = {
          ok: true,
          mode: 'mock',
          asr: 'mock',
          tts: 'mock',
        };
        emit('health', out);
        return out;
      }
      try {
        const out = {
          mode: 'http',
          ...(await callVoiceWorkerHealth(workerUrl, healthOpts)),
        };
        emit('health', out);
        return out;
      } catch (err) {
        const out = {
          ok: false,
          mode: 'http',
          url: workerUrl,
          error: err?.message || String(err),
        };
        emit('health', out);
        return out;
      }
    },

    /**
     * @param {{ text?: string, audioBase64?: string, audioPath?: string, language?: string }} input
     */
    async asr(input = {}) {
      let result;
      if (mode === 'http' && workerUrl) {
        result = await callVoiceWorker(workerUrl, '/asr', {
          text: input.text,
          audioBase64: input.audioBase64,
          audioPath: input.audioPath,
          language: input.language || language,
        });
      } else {
        result = await mockAsr({
          text: input.text,
          language: input.language || language,
          audioBase64: input.audioBase64,
          audioPath: input.audioPath,
          speechMs: input.speechMs,
          sequence: input.sequence,
        });
      }
      const parsed = parseSenseVoiceTranscript(result.raw || result.text || '');
      const text = parsed.text || result.text || '';
      const dialect = detectLanguage(
        {
          asrRaw: result.raw || result.text,
          text,
          language: parsed.language || result.language,
        },
        { sticky: language, preferred: language, force: forceLanguage },
      );
      language = dialect.id;
      const emotion = emotionFromSenseVoice({
        text,
        serEmotion: parsed.serEmotion || result.serEmotion,
        language: dialect.id,
      });
      const out = {
        ...result,
        text,
        raw: result.raw || result.text || '',
        language: dialect.id,
        dialect,
        emotion,
        cleanText: stripAsrTags(text),
      };
      emit('asr', out);
      return out;
    },

    /**
     * @param {{
     *   text: string,
     *   language?: string,
     *   emotion?: string,
     *   instruct?: string,
     *   speed?: number,
     *   pauseMs?: number,
     *   pitch?: number,
     * }} input
     * @param {{ onChunk?: (chunk: object) => void }} [ttsOpts]
     */
    async tts(input, ttsOpts = {}) {
      const lang = input.language || language;
      const prosody = prosodyFromMarkedText(input.text, {
        emotion: input.emotion || 'neutral',
        language: lang,
      });
      const payload = {
        text: prosody.text,
        language: lang,
        emotion: input.emotion || 'neutral',
        instruct: input.instruct || prosody.instruct,
        speed: input.speed ?? prosody.speed,
        pauseMs: input.pauseMs ?? prosody.pauseMs,
        pitch: input.pitch ?? prosody.pitch,
      };

      let result;
      if (mode === 'http' && workerUrl) {
        try {
          result = await callVoiceWorkerTtsStream(workerUrl, payload, ttsOpts);
        } catch {
          result = await callVoiceWorker(workerUrl, '/tts', {
            ...payload,
            streaming: true,
          });
          if (Array.isArray(result.chunks)) {
            for (const chunk of result.chunks) ttsOpts.onChunk?.(chunk);
          }
        }
      } else {
        result = await mockTtsStream(payload, {
          onChunk: ttsOpts.onChunk,
          chunkDelayMs: opts.chunkDelayMs,
        });
      }

      const out = {
        ...result,
        prosody,
        text: prosody.text,
        language: lang,
      };
      emit('tts', out);
      return out;
    },

    /**
     * One ASR → emotion → TTS pipeline turn (optional robot reply text).
     * @param {{
     *   text?: string,
     *   audioBase64?: string,
     *   replyText?: string,
     *   language?: string,
     * }} turn
     * @param {{ onChunk?: (chunk: object) => void }} [ttsOpts]
     */
    async runTurn(turn = {}, ttsOpts = {}) {
      const asr = await this.asr({
        text: turn.text,
        audioBase64: turn.audioBase64,
        language: turn.language || language,
      });
      const replyText =
        typeof turn.replyText === 'string'
          ? turn.replyText
          : asr.language === 'en'
            ? 'Got it — what would you like to talk about?'
            : '收到啦，有咩想傾？';
      const tts = await this.tts(
        {
          text: replyText,
          language: asr.language,
          emotion: asr.emotion?.emotion || 'neutral',
        },
        ttsOpts,
      );
      const out = {
        schema: VOICE_WORKER_SCHEMA,
        asr,
        tts,
        language: asr.language,
        emotion: asr.emotion,
        reply: tts.text,
      };
      emit('turn', out);
      return out;
    },
  };
}
