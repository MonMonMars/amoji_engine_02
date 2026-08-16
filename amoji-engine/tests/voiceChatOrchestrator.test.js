import { describe, expect, it, vi } from "vitest";
import {
  VoiceChatOrchestrator,
  createVoiceChatOrchestrator,
} from "../engine/voice/voiceChatOrchestrator.js";

function loudFrame(n = 20) {
  return new Int16Array(n).fill(12_000);
}

function silentFrame(n = 20) {
  return new Int16Array(n);
}

function createMic() {
  let frameCb = null;
  return {
    mic: {
      onFrame: (cb) => {
        frameCb = cb;
        return () => {
          frameCb = null;
        };
      },
    },
    push: (frame) => frameCb?.(frame),
    get subscribed() {
      return frameCb !== null;
    },
  };
}

describe("VoiceChatOrchestrator always-on wiring", () => {
  it("exposes optional alwaysOn mode and startAlwaysOn/stopAlwaysOn", async () => {
    const harness = createMic();
    const onStartListening = vi.fn(async () => {});
    const onStopListeningAndTalk = vi.fn(async () => {});
    const getTurnExtra = vi.fn(() => ({ turn: 1 }));

    const orch = createVoiceChatOrchestrator({
      mic: harness.mic,
      alwaysOn: true,
      onStartListening,
      onStopListeningAndTalk,
      getTurnExtra,
      energyThreshold: 0.05,
      minSpeechMs: 20,
      trailingSilenceMs: 40,
      sampleRateHz: 1000,
      frameSamples: 20,
    });

    expect(orch).toBeInstanceOf(VoiceChatOrchestrator);
    expect(orch.alwaysOnMode).toBe(true);
    expect(orch.alwaysOnActive).toBe(false);

    await orch.startAlwaysOn();
    expect(orch.alwaysOnActive).toBe(true);
    expect(onStartListening).toHaveBeenCalledTimes(1);
    expect(orch.phase).toBe("listening");
    expect(harness.subscribed).toBe(true);

    harness.push(loudFrame());
    harness.push(loudFrame());
    harness.push(silentFrame());
    harness.push(silentFrame());

    await vi.waitFor(() => {
      expect(onStopListeningAndTalk).toHaveBeenCalledTimes(1);
    });
    expect(getTurnExtra).toHaveBeenCalled();
    expect(onStopListeningAndTalk).toHaveBeenCalledWith({ turn: 1 });

    await vi.waitFor(() => {
      expect(onStartListening).toHaveBeenCalledTimes(2);
    });

    await orch.stopAlwaysOn();
    expect(orch.alwaysOnActive).toBe(false);
    expect(orch.phase).toBe("idle");
    expect(harness.subscribed).toBe(false);
  });

  it("startAlwaysOn works when alwaysOn was not set at construct time", async () => {
    const { mic } = createMic();
    const orch = new VoiceChatOrchestrator({
      mic,
      onStartListening: async () => {},
      onStopListeningAndTalk: async () => {},
      energyThreshold: 0.05,
      minSpeechMs: 20,
      trailingSilenceMs: 40,
      sampleRateHz: 1000,
    });

    expect(orch.alwaysOnMode).toBe(false);
    await orch.startAlwaysOn();
    expect(orch.alwaysOnMode).toBe(true);
    expect(orch.alwaysOnActive).toBe(true);
    await orch.stopAlwaysOn();
  });

  it("rejects startAlwaysOn without mic.onFrame", async () => {
    const orch = createVoiceChatOrchestrator({ alwaysOn: true });
    await expect(orch.startAlwaysOn()).rejects.toThrow(/mic.onFrame/);
  });

  it("supports manual startListening / stopListeningAndTalk without always-on", async () => {
    const onStartListening = vi.fn();
    const onStopListeningAndTalk = vi.fn();
    const orch = createVoiceChatOrchestrator({
      onStartListening,
      onStopListeningAndTalk,
    });

    await orch.startListening();
    expect(orch.phase).toBe("listening");
    await orch.stopListeningAndTalk({ manual: true });
    expect(orch.phase).toBe("talking");
    expect(onStopListeningAndTalk).toHaveBeenCalledWith({ manual: true });
  });
});
