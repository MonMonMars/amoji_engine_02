import { describe, expect, it } from 'vitest';
import {
  mouthOpenFromPcm,
  smoothMouthOpen,
  decodePcmBase64ToFloat32,
  lipSyncParamsFromChunk,
  createLipSyncTracker,
} from '../engine/face/lipSyncFromChunk.js';
import { synthesizeWavBase64 } from '../engine/voice/browserAudio.js';
import { createTtsPlaybackQueue } from '../engine/voice/browserAudio.js';
import { resolveVoiceWorkerConfig } from '../engine/lab/workerUrl.js';

describe('lipSyncFromChunk', () => {
  it('computes mouth open from pcm energy', () => {
    expect(mouthOpenFromPcm(new Float32Array(64))).toBe(0);
    expect(mouthOpenFromPcm(new Float32Array(64).fill(0.4))).toBeGreaterThan(0.3);
    expect(smoothMouthOpen(1, 0, 0.5)).toBeCloseTo(0.5);
  });

  it('decodes RIFF wav and builds face params', () => {
    const b64 = synthesizeWavBase64({
      durationSec: 0.15,
      frequencyHz: 240,
      amplitude: 0.2,
    });
    const { samples, sampleRate } = decodePcmBase64ToFloat32(b64);
    expect(sampleRate).toBe(22050);
    expect(samples.length).toBeGreaterThan(100);

    const result = lipSyncParamsFromChunk(
      { pcmBase64: b64, text: '好', emotion: 'happy' },
      { previousMouthOpen: 0 },
    );
    expect(result.mouthOpen).toBeGreaterThan(0);
    expect(result.parameters[0].id).toBe('ParamMouthOpenY');
  });

  it('tracker smooths across chunks and resets', () => {
    const tracker = createLipSyncTracker({ alpha: 0.5 });
    const b64 = synthesizeWavBase64({ durationSec: 0.1, amplitude: 0.25 });
    const a = tracker.pushChunk({ pcmBase64: b64, text: '啊' });
    const b = tracker.pushChunk({ pcmBase64: b64, text: '呀' });
    expect(b.mouthOpen).toBeGreaterThan(0);
    expect(a.mouthOpen).toBeGreaterThanOrEqual(0);
    const reset = tracker.reset();
    expect(reset[0].value).toBe(0);
    expect(tracker.mouthOpen).toBe(0);
  });
});

describe('TtsChunkPlayer lip-sync hook', () => {
  it('emits onLipSync while draining offline', async () => {
    const mouths = [];
    const tracker = createLipSyncTracker();
    const player = createTtsPlaybackQueue({
      offline: true,
      lipSync: tracker,
      onLipSync: ({ mouthOpen }) => mouths.push(mouthOpen),
    });
    const b64 = synthesizeWavBase64({ durationSec: 0.05, amplitude: 0.2 });
    await player.enqueueAll([
      { index: 0, durationSec: 0.05, pauseMs: 0, pcmBase64: b64, text: '嗨' },
      { index: 1, durationSec: 0.05, pauseMs: 0, pcmBase64: b64, text: '呀' },
    ]);
    expect(mouths.length).toBeGreaterThanOrEqual(2);
    expect(player.lastMouthOpen).toBe(0);
  });
});

describe('resolveVoiceWorkerConfig', () => {
  it('defaults to mock', () => {
    const cfg = resolveVoiceWorkerConfig({
      search: '',
      storage: null,
      env: {},
    });
    expect(cfg.mode).toBe('mock');
  });

  it('prefers query worker and persists', () => {
    const store = new Map();
    const storage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
    };
    const cfg = resolveVoiceWorkerConfig({
      search: '?worker=http://127.0.0.1:7890',
      storage,
      env: {},
    });
    expect(cfg.mode).toBe('http');
    expect(cfg.source).toBe('query');
    expect(cfg.workerUrl).toBe('http://127.0.0.1:7890');
    expect(store.get('amoji.voiceWorkerUrl')).toBe('http://127.0.0.1:7890');
  });
});
