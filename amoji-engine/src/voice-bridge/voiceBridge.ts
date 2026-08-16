import type { VoiceBridgeStats } from "../types.js";

export interface VoiceBridgeOptions {
  sampleRateHz?: number;
  /** Frames per bridge tick (defaults to 480 samples @ 24kHz = 20ms). */
  frameSize?: number;
  onMicFrame?: (pcm16: Int16Array) => void;
  onSpeakerFrame?: (pcm16: Int16Array) => void;
}

/**
 * Bridges microphone capture and speaker playback with the Realtime API.
 *
 * In Node, wire `onMicFrame` to your capture source and call `playAssistantAudio`
 * for TTS output. In the browser, pair with MediaStream / AudioWorklet.
 */
export class VoiceBridge {
  private readonly sampleRateHz: number;
  private readonly frameSize: number;
  private readonly onMicFrame?: (pcm16: Int16Array) => void;
  private readonly onSpeakerFrame?: (pcm16: Int16Array) => void;
  private micBuffer: number[] = [];
  private speakerQueue: Int16Array[] = [];
  private stats: VoiceBridgeStats = {
    framesSent: 0,
    framesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
  };
  private running = false;

  constructor(options: VoiceBridgeOptions = {}) {
    this.sampleRateHz = options.sampleRateHz ?? 24_000;
    this.frameSize = options.frameSize ?? 480;
    this.onMicFrame = options.onMicFrame;
    this.onSpeakerFrame = options.onSpeakerFrame;
  }

  get isRunning(): boolean {
    return this.running;
  }

  getSampleRateHz(): number {
    return this.sampleRateHz;
  }

  getStats(): VoiceBridgeStats {
    return { ...this.stats };
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
    this.micBuffer = [];
    this.speakerQueue = [];
  }

  /** Push raw mic samples; emits framed PCM16 via onMicFrame. */
  pushMicSamples(samples: Int16Array): void {
    if (!this.running) return;
    for (let i = 0; i < samples.length; i++) {
      this.micBuffer.push(samples[i]!);
    }
    this.drainMicBuffer();
  }

  /** Queue assistant TTS audio for playback / lip-sync. */
  playAssistantAudio(pcm16: Int16Array): Int16Array {
    if (!this.running) return pcm16;
    this.speakerQueue.push(pcm16);
    this.stats.framesReceived += 1;
    this.stats.bytesReceived += pcm16.byteLength;
    this.onSpeakerFrame?.(pcm16);
    return pcm16;
  }

  /** Drop queued speaker frames (used on barge-in). */
  clearSpeakerQueue(): void {
    this.speakerQueue = [];
  }

  /** Pull the next speaker frame if queued. */
  pullSpeakerFrame(): Int16Array | null {
    return this.speakerQueue.shift() ?? null;
  }

  /** Convert Float32 [-1,1] mic samples to PCM16 and push. */
  pushMicFloat32(float32: Float32Array): void {
    const pcm16 = float32ToPcm16(float32);
    this.pushMicSamples(pcm16);
  }

  private drainMicBuffer(): void {
    while (this.micBuffer.length >= this.frameSize) {
      const frame = new Int16Array(this.frameSize);
      for (let i = 0; i < this.frameSize; i++) {
        frame[i] = this.micBuffer.shift()!;
      }
      this.stats.framesSent += 1;
      this.stats.bytesSent += frame.byteLength;
      this.onMicFrame?.(frame);
    }
  }
}

export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]!));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return pcm16;
}

export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i]! / (pcm16[i]! < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

/** Merge multiple PCM16 chunks into one buffer (for lip-sync windows). */
export function mergePcm16(chunks: Int16Array[]): Int16Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Int16Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}
