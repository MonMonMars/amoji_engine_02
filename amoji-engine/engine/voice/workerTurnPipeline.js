/**
 * Glue: mic/text → SenseVoice worker ASR → robot plan → CosyVoice TTS.
 */
import { createMicFrameBuffer } from './micFrameBuffer.js';

export const WORKER_TURN_SCHEMA = 'amoji.workerRobotTurn.v1';

/**
 * One pipeline turn.
 * @param {{
 *   worker: { asr: Function, tts: Function, setLanguage?: Function },
 *   robot: { runTurn: Function, abort?: Function },
 *   text?: string,
 *   audioBase64?: string,
 *   speechMs?: number,
 *   sequence?: number,
 *   language?: string,
 *   speakMs?: number,
 *   replyText?: string,
 *   onChunk?: (chunk: object) => void,
 * }} opts
 */
export async function runWorkerRobotTurn(opts) {
  if (!opts?.worker?.asr || !opts?.robot?.runTurn) {
    throw new TypeError('runWorkerRobotTurn requires worker.asr and robot.runTurn');
  }

  const t0 = nowMs();
  const asrStarted = t0;
  const asr = await opts.worker.asr({
    text: opts.text,
    audioBase64: opts.audioBase64,
    speechMs: opts.speechMs,
    sequence: opts.sequence,
    language: opts.language,
  });
  const asrMs = Math.round(nowMs() - asrStarted);

  if (typeof opts.worker.setLanguage === 'function') {
    opts.worker.setLanguage(asr.language);
  }

  const emotion = asr.emotion?.emotion || 'neutral';
  const intensity = asr.emotion?.intensity ?? 0.5;

  const robotStarted = nowMs();
  // Robot plans immediately; host can animate speak using tts.durationSec.
  const robotResult = await opts.robot.runTurn(asr.text, {
    forceReply: opts.replyText,
    speakMs: typeof opts.speakMs === 'number' ? opts.speakMs : 0,
  });
  const robotMs = Math.round(nowMs() - robotStarted);

  if (robotResult.barged) {
    return {
      schema: WORKER_TURN_SCHEMA,
      asr,
      robot: robotResult,
      tts: null,
      language: asr.language,
      emotion: { emotion, intensity, ...(asr.emotion || {}) },
      reply: robotResult.reply || '',
      barged: true,
      metrics: {
        schema: 'amoji.turnMetrics.v1',
        asrMs,
        robotMs,
        ttsMs: 0,
        totalMs: Math.round(nowMs() - t0),
        speechMs: opts.speechMs ?? null,
        ttsDurationSec: 0,
        chunkCount: 0,
      },
    };
  }

  const reply = robotResult.reply || opts.replyText || '';
  const ttsStarted = nowMs();
  const tts = await opts.worker.tts(
    {
      text: reply,
      language: asr.language || robotResult.language,
      emotion: robotResult.emotion || emotion,
    },
    { onChunk: opts.onChunk },
  );
  const ttsMs = Math.round(nowMs() - ttsStarted);

  return {
    schema: WORKER_TURN_SCHEMA,
    asr,
    robot: robotResult,
    tts,
    language: asr.language,
    emotion: { emotion, intensity, ...(asr.emotion || {}) },
    reply: tts.text || reply,
    barged: false,
    metrics: {
      schema: 'amoji.turnMetrics.v1',
      asrMs,
      robotMs,
      ttsMs,
      totalMs: Math.round(nowMs() - t0),
      speechMs: opts.speechMs ?? null,
      ttsDurationSec: Number(tts.durationSec) || 0,
      chunkCount: tts.chunkCount || tts.chunks?.length || 0,
    },
  };
}

function nowMs() {
  return typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();
}

/**
 * Host helper for always-on: buffer mic while listening, pipeline on talk.
 * @param {{
 *   worker: object,
 *   robot: object,
 *   inputRate?: number,
 *   targetSampleRate?: number,
 *   onPartialEmotion?: (emo: { emotion: string, intensity?: number, text?: string }) => void,
 *   onTurn?: (turn: object) => void,
 *   onChunk?: (chunk: object) => void,
 * }} opts
 */
export function createWorkerTurnHost(opts) {
  if (!opts?.worker || !opts?.robot) {
    throw new TypeError('createWorkerTurnHost requires worker and robot');
  }
  const buffer = createMicFrameBuffer({
    inputRate: opts.inputRate,
    targetSampleRate: opts.targetSampleRate,
  });
  let capturing = false;

  return {
    get buffer() {
      return buffer;
    },
    get capturing() {
      return capturing;
    },
    /** Call when listen turn starts. */
    beginListen() {
      capturing = true;
      buffer.beginUtterance();
    },
    /** @param {Float32Array | Int16Array | ArrayLike<number>} frame */
    pushFrame(frame) {
      if (!capturing) return;
      buffer.push(frame);
    },
    endListen() {
      capturing = false;
    },
    /**
     * Snapshot + run ASR→robot→TTS. Clears capture flag.
     * @param {{ text?: string, replyText?: string, speakMs?: number }} [extra]
     */
    async runFromBuffer(extra = {}) {
      capturing = false;
      const snap = buffer.snapshot();
      const turn = await runWorkerRobotTurn({
        worker: opts.worker,
        robot: opts.robot,
        text: extra.text,
        audioBase64: extra.text ? undefined : snap.audioBase64,
        speechMs: snap.speechMs,
        sequence: snap.sequence,
        replyText: extra.replyText,
        speakMs: extra.speakMs,
        onChunk: opts.onChunk,
      });
      opts.onTurn?.(turn);
      if (turn.emotion) {
        opts.onPartialEmotion?.({
          emotion: turn.emotion.emotion,
          intensity: turn.emotion.intensity,
          text: turn.asr?.text,
        });
      }
      buffer.clear();
      return turn;
    },
    /**
     * Prefire emotion from interim text (partial ASR).
     * @param {{ text: string, emotion?: string, intensity?: number }} partial
     */
    applyPartial(partial) {
      if (!partial?.text) return;
      opts.onPartialEmotion?.({
        emotion: partial.emotion || 'neutral',
        intensity: partial.intensity ?? 0.5,
        text: partial.text,
      });
    },
  };
}
