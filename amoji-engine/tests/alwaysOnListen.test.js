import { describe, expect, it, vi } from "vitest";
import {
  ALWAYS_ON_LISTEN_SCHEMA,
  AlwaysOnListenController,
  createAlwaysOnListen,
  createUtteranceDetector,
  frameEnergy,
  resolveAlwaysOnListenOptions,
} from "../engine/voice/alwaysOnListen.js";

function loudFrame(n = 480) {
  return new Int16Array(n).fill(12_000);
}

function silentFrame(n = 480) {
  return new Int16Array(n);
}

describe("ALWAYS_ON_LISTEN_SCHEMA", () => {
  it("exposes defaults for VAD options", () => {
    expect(ALWAYS_ON_LISTEN_SCHEMA.energyThreshold.default).toBe(0.02);
    expect(ALWAYS_ON_LISTEN_SCHEMA.trailingSilenceMs.default).toBe(500);
    expect(resolveAlwaysOnListenOptions().minSpeechMs).toBe(120);
  });

  it("rejects invalid overrides", () => {
    expect(() =>
      resolveAlwaysOnListenOptions({ energyThreshold: 2 }),
    ).toThrow(/above max/);
  });
});

describe("frameEnergy", () => {
  it("is near zero for silence and high for loud PCM16", () => {
    expect(frameEnergy(silentFrame())).toBe(0);
    expect(frameEnergy(loudFrame())).toBeGreaterThan(0.3);
  });
});

describe("createUtteranceDetector", () => {
  it("transitions idle → speaking → trailing → ended", () => {
    const states = [];
    const detector = createUtteranceDetector({
      energyThreshold: 0.05,
      minSpeechMs: 20,
      trailingSilenceMs: 40,
      sampleRateHz: 1000, // 1 sample = 1ms for easy math
      frameSamples: 20,
      onStateChange: (state) => states.push(state),
    });

    expect(detector.state).toBe("idle");

    // 20ms speech
    expect(detector.pushFrame(loudFrame(20))).toBe("speaking");
    // another 20ms speech so minSpeechMs is met
    expect(detector.pushFrame(loudFrame(20))).toBe("speaking");
    // first silence → trailing
    expect(detector.pushFrame(silentFrame(20))).toBe("trailing");
    // more silence → ended
    expect(detector.pushFrame(silentFrame(20))).toBe("ended");

    expect(states).toEqual(["speaking", "trailing", "ended"]);
    expect(detector.endedInfo?.speechMs).toBeGreaterThanOrEqual(20);
    detector.reset();
    expect(detector.state).toBe("idle");
  });

  it("returns to speaking if energy resumes during trailing", () => {
    const detector = createUtteranceDetector({
      energyThreshold: 0.05,
      minSpeechMs: 20,
      trailingSilenceMs: 80,
      sampleRateHz: 1000,
      frameSamples: 20,
    });

    detector.pushFrame(loudFrame(20));
    detector.pushFrame(loudFrame(20));
    expect(detector.pushFrame(silentFrame(20))).toBe("trailing");
    expect(detector.pushFrame(loudFrame(20))).toBe("speaking");
  });
});

describe("AlwaysOnListenController", () => {
  it("loops stopListeningAndTalk → startListening with getTurnExtra", async () => {
    const frames = [];
    let frameCb = null;
    const mic = {
      onFrame: (cb) => {
        frameCb = cb;
        return () => {
          frameCb = null;
        };
      },
    };

    const startListening = vi.fn(async () => {});
    const stopListeningAndTalk = vi.fn(async () => {});
    const getTurnExtra = vi.fn(async () => ({ mood: "curious" }));

    const controller = createAlwaysOnListen({
      mic,
      startListening,
      stopListeningAndTalk,
      getTurnExtra,
      energyThreshold: 0.05,
      minSpeechMs: 20,
      trailingSilenceMs: 40,
      sampleRateHz: 1000,
      frameSamples: 20,
    });

    expect(controller).toBeInstanceOf(AlwaysOnListenController);
    await controller.start();
    expect(startListening).toHaveBeenCalledTimes(1);
    expect(controller.active).toBe(true);

    // speech then silence → end of utterance
    frameCb(loudFrame(20));
    frameCb(loudFrame(20));
    frameCb(silentFrame(20));
    frameCb(silentFrame(20));

    await vi.waitFor(() => {
      expect(stopListeningAndTalk).toHaveBeenCalledTimes(1);
    });

    expect(getTurnExtra).toHaveBeenCalledTimes(1);
    expect(stopListeningAndTalk).toHaveBeenCalledWith({ mood: "curious" });

    await vi.waitFor(() => {
      expect(startListening).toHaveBeenCalledTimes(2);
    });

    expect(controller.detectorState).toBe("idle");
    await controller.stop();
    expect(controller.active).toBe(false);
    expect(frameCb).toBeNull();
    expect(frames).toEqual([]);
  });

  it("requires mic.onFrame and talk hooks", () => {
    expect(
      () =>
        new AlwaysOnListenController({
          mic: {},
          startListening: () => {},
          stopListeningAndTalk: () => {},
        }),
    ).toThrow(/mic.onFrame/);
  });
});
