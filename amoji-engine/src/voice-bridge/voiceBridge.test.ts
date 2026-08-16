import { describe, expect, it } from "vitest";
import {
  float32ToPcm16,
  mergePcm16,
  pcm16ToFloat32,
  VoiceBridge,
} from "./voiceBridge.js";

describe("VoiceBridge", () => {
  it("frames mic input and tracks stats", () => {
    const frames: Int16Array[] = [];
    const bridge = new VoiceBridge({
      frameSize: 4,
      onMicFrame: (frame) => frames.push(frame),
    });

    bridge.start();
    bridge.pushMicSamples(new Int16Array([1, 2, 3, 4, 5, 6, 7, 8]));

    expect(frames).toHaveLength(2);
    expect(Array.from(frames[0]!)).toEqual([1, 2, 3, 4]);
    expect(Array.from(frames[1]!)).toEqual([5, 6, 7, 8]);

    const stats = bridge.getStats();
    expect(stats.framesSent).toBe(2);
    expect(stats.bytesSent).toBe(16);
  });

  it("queues assistant audio for playback", () => {
    const played: Int16Array[] = [];
    const bridge = new VoiceBridge({
      onSpeakerFrame: (frame) => played.push(frame),
    });
    bridge.start();

    const chunk = new Int16Array([100, 200]);
    bridge.playAssistantAudio(chunk);

    expect(played).toHaveLength(1);
    expect(bridge.pullSpeakerFrame()).not.toBeNull();
    expect(bridge.pullSpeakerFrame()).toBeNull();
  });

  it("does not process audio when stopped", () => {
    const frames: Int16Array[] = [];
    const bridge = new VoiceBridge({
      frameSize: 2,
      onMicFrame: (f) => frames.push(f),
    });
    bridge.pushMicSamples(new Int16Array([1, 2, 3]));
    expect(frames).toHaveLength(0);
  });

  it("converts float32 mic to pcm16 via pushMicFloat32", () => {
    const frames: Int16Array[] = [];
    const bridge = new VoiceBridge({
      frameSize: 2,
      onMicFrame: (f) => frames.push(f),
    });
    bridge.start();
    bridge.pushMicFloat32(new Float32Array([0, 1, -1, 0.5]));
    expect(frames.length).toBeGreaterThan(0);
  });
});

describe("audio helpers", () => {
  it("converts float32 to pcm16 and back", () => {
    const f32 = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const pcm = float32ToPcm16(f32);
    const back = pcm16ToFloat32(pcm);
    expect(back[1]).toBeCloseTo(0.5, 2);
    expect(back[2]).toBeCloseTo(-0.5, 2);
  });

  it("merges pcm16 chunks", () => {
    const merged = mergePcm16([
      new Int16Array([1, 2]),
      new Int16Array([3, 4, 5]),
    ]);
    expect(Array.from(merged)).toEqual([1, 2, 3, 4, 5]);
  });
});
