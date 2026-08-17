import { describe, expect, it, vi } from 'vitest';
import {
  parseSenseVoiceTranscript,
  emotionFromSenseVoice,
  emotionFromTextHeuristics,
} from '../engine/voice/senseVoice.js';
import {
  mockAsr,
  mockTtsStream,
  createVoiceWorkerClient,
} from '../engine/voice/voiceWorkerClient.js';
import {
  encodeWavPcm16,
  arrayBufferToBase64,
  downsampleMono,
} from '../engine/voice/browserAudio.js';
import {
  createPartialAsrWatcher,
  snapshotMicWavBase64,
} from '../engine/voice/partialAsr.js';

describe('senseVoice', () => {
  it('parses language + SER tags', () => {
    const parsed = parseSenseVoiceTranscript(
      '<|yue|><|HAPPY|><|Speech|>今日好開心呀',
    );
    expect(parsed.language).toBe('yue');
    expect(parsed.serEmotion).toBe('happy');
    expect(parsed.text).toBe('今日好開心呀');
    expect(parsed.audioEvent).toBe('speech');
  });

  it('blends SER with lexicon', () => {
    const emo = emotionFromSenseVoice({
      text: '早晨',
      serEmotion: 'happy',
      language: 'yue',
    });
    expect(emo.emotion).toBe('happy');
    expect(emo.source).toBe('sensevoice_ser');
    expect(emotionFromTextHeuristics('哈哈開心').emotion).toBe('happy');
  });
});

describe('voiceWorkerClient mock', () => {
  it('runs ASR → TTS turn offline', async () => {
    const events = [];
    const client = createVoiceWorkerClient({
      mode: 'mock',
      onEvent: (ev) => events.push(ev.type),
    });
    const turn = await client.runTurn({
      text: '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀',
    });
    expect(turn.asr.language).toBe('yue');
    expect(turn.asr.emotion.emotion).toBe('happy');
    expect(turn.tts.chunkCount).toBeGreaterThan(0);
    expect(turn.reply).toBeTruthy();
    expect(events).toEqual(['asr', 'tts', 'turn']);
  });

  it('mockAsr / mockTtsStream work standalone', async () => {
    const asr = await mockAsr({
      text: '<|en|><|NEUTRAL|><|Speech|>Hello there',
    });
    expect(asr.language).toBe('en');
    const tts = await mockTtsStream({
      text: 'Hi[pause] there',
      language: 'en',
      emotion: 'happy',
    });
    expect(tts.chunkCount).toBeGreaterThan(0);
    expect(tts.chunks.at(-1).final).toBe(true);
  });

  it('strips prosody markers before mock TTS', async () => {
    const client = createVoiceWorkerClient({ mode: 'mock' });
    const tts = await client.tts({
      text: '好呀[pause]，跟住[fast]開心！',
      language: 'yue',
      emotion: 'happy',
    });
    expect(tts.text).toBe('好呀，跟住開心！');
    expect(tts.prosody.pauseMs).toBeGreaterThan(180);
  });
});

describe('browserAudio + partialAsr', () => {
  it('encodes wav and snapshots mic buffers', () => {
    const samples = new Float32Array(4800);
    for (let i = 0; i < samples.length; i += 1) samples[i] = Math.sin(i / 30) * 0.2;
    const down = downsampleMono(samples, 48000, 16000);
    expect(down.length).toBeLessThan(samples.length);
    const wav = encodeWavPcm16(down, 16000);
    expect(wav.byteLength).toBeGreaterThan(44);
    const b64 = arrayBufferToBase64(wav);
    expect(b64.length).toBeGreaterThan(100);

    const mic = {
      _chunks: [samples],
      _inputRate: 48000,
      targetSampleRate: 16000,
    };
    expect(snapshotMicWavBase64(mic)).toBeTruthy();
  });

  it('partial watcher lifecycle without text events', async () => {
    const events = [];
    const watcher = createPartialAsrWatcher({
      intervalMs: 200,
      onPartial: (ev) => events.push(ev),
    });
    let n = 0;
    watcher.start(async () => {
      n += 1;
      return null;
    });
    await new Promise((r) => setTimeout(r, 250));
    watcher.stop();
    expect(n).toBeGreaterThan(0);
    expect(events.length).toBe(0);
  });

  it('partial watcher emits when mock text changes', async () => {
    const events = [];
    const watcher = createPartialAsrWatcher({
      intervalMs: 80,
      mode: 'mock',
      onPartial: (ev) => events.push(ev),
    });
    let tick = 0;
    watcher.start(async () => {
      tick += 1;
      if (tick === 1) return '<|yue|><|HAPPY|><|Speech|>早晨';
      return '<|yue|><|HAPPY|><|Speech|>早晨呀';
    });
    await vi.waitFor(() => {
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
    watcher.stop();
    expect(events[0].type).toBe('asr_partial');
    expect(events[0].data.emotion).toBe('happy');
  });
});
