import { describe, expect, it, vi } from 'vitest';
import {
  synthesizeWavBase64,
  base64ToBytes,
  createTtsPlaybackQueue,
  encodeWavPcm16,
} from '../engine/voice/browserAudio.js';
import { mockTtsStream } from '../engine/voice/voiceWorkerClient.js';

describe('tts playback', () => {
  it('synthesizes RIFF wav base64', () => {
    const b64 = synthesizeWavBase64({ durationSec: 0.1, frequencyHz: 220 });
    const bytes = base64ToBytes(b64);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe(
      'RIFF',
    );
    expect(bytes.length).toBeGreaterThan(44);
  });

  it('mock TTS chunks include playable pcmBase64', async () => {
    const tts = await mockTtsStream({
      text: '好呀開心',
      language: 'yue',
      emotion: 'happy',
    });
    expect(tts.chunks[0].pcmBase64).toBeTruthy();
    const head = base64ToBytes(tts.chunks[0].pcmBase64).subarray(0, 4);
    expect(String.fromCharCode(...head)).toBe('RIFF');
  });

  it('offline queue plays by duration and flush barges', async () => {
    const started = [];
    const ended = [];
    const idle = vi.fn();
    const player = createTtsPlaybackQueue({
      offline: true,
      onStart: (c) => started.push(c.index),
      onEnd: (c) => ended.push(c.index),
      onIdle: idle,
    });
    const chunks = [
      { index: 0, durationSec: 0.05, text: 'a', pauseMs: 0 },
      { index: 1, durationSec: 0.05, text: 'b', pauseMs: 0 },
    ];
    const play = player.enqueueAll(chunks);
    await new Promise((r) => setTimeout(r, 30));
    player.flush();
    await play.catch(() => {});
    expect(started.length).toBeGreaterThanOrEqual(1);
    expect(idle).toHaveBeenCalled();
  });

  it('encodeWavPcm16 length matches sample count', () => {
    const samples = new Float32Array(100);
    const buf = encodeWavPcm16(samples, 16000);
    expect(buf.byteLength).toBe(44 + 200);
  });
});
