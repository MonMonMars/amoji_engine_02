import { describe, expect, it, vi } from 'vitest';
import { createMicFrameBuffer } from '../engine/voice/micFrameBuffer.js';
import {
  runWorkerRobotTurn,
  createWorkerTurnHost,
} from '../engine/voice/workerTurnPipeline.js';
import { createVoiceWorkerClient } from '../engine/voice/voiceWorkerClient.js';
import { createVoiceRobotBridge } from '../engine/voice/voiceRobotBridge.js';

function loud(n = 480) {
  return new Float32Array(n).fill(0.2);
}

describe('micFrameBuffer', () => {
  it('accumulates frames and snapshots wav base64', () => {
    const buf = createMicFrameBuffer({
      inputRate: 16000,
      targetSampleRate: 16000,
      maxSeconds: 2,
    });
    buf.beginUtterance();
    for (let i = 0; i < 20; i += 1) buf.push(loud(800));
    expect(buf.sampleCount).toBeGreaterThan(1000);
    const snap = buf.snapshot();
    expect(snap.audioBase64).toBeTruthy();
    expect(snap.sequence).toBe(1);
    expect(snap.speechMs).toBeGreaterThan(100);
  });
});

describe('runWorkerRobotTurn', () => {
  it('runs ASR → robot → TTS', async () => {
    const worker = createVoiceWorkerClient({ mode: 'mock' });
    const robot = createVoiceRobotBridge({ language: 'yue' });
    const chunks = [];
    const turn = await runWorkerRobotTurn({
      worker,
      robot,
      text: '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀',
      onChunk: (c) => chunks.push(c),
    });
    expect(turn.asr.language).toBe('yue');
    expect(turn.asr.emotion.emotion).toBe('happy');
    expect(turn.reply).toBeTruthy();
    expect(turn.tts.chunkCount).toBeGreaterThan(0);
    expect(chunks.length).toBe(turn.tts.chunkCount);
    expect(robot.getHud().phase).toBe('done');
    expect(turn.metrics.totalMs).toBeGreaterThanOrEqual(0);
    expect(turn.metrics.asrMs).toBeGreaterThanOrEqual(0);
    expect(turn.metrics.chunkCount).toBe(turn.tts.chunkCount);
  });

  it('mock audio-only ASR rotates stub lines', async () => {
    const worker = createVoiceWorkerClient({ mode: 'mock' });
    const a = await worker.asr({ audioBase64: 'AAAA', speechMs: 400, sequence: 1 });
    const b = await worker.asr({ audioBase64: 'AAAA', speechMs: 800, sequence: 2 });
    expect(a.text).toBeTruthy();
    expect(b.text).toBeTruthy();
  });
});

describe('createWorkerTurnHost', () => {
  it('buffers mic then runs pipeline turn', async () => {
    const worker = createVoiceWorkerClient({ mode: 'mock' });
    const robot = createVoiceRobotBridge();
    const onTurn = vi.fn();
    const host = createWorkerTurnHost({
      worker,
      robot,
      inputRate: 16000,
      onTurn,
      onPartialEmotion: vi.fn(),
    });
    host.beginListen();
    for (let i = 0; i < 30; i += 1) host.pushFrame(loud(800));
    const turn = await host.runFromBuffer();
    expect(turn.asr.text).toBeTruthy();
    expect(turn.tts.chunkCount).toBeGreaterThan(0);
    expect(onTurn).toHaveBeenCalledOnce();
    expect(host.capturing).toBe(false);
  });
});
