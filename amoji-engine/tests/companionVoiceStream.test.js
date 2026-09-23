import { describe, expect, it, vi } from "vitest";
import { createCompanionVoice } from "../engine/companion/companionVoice.js";

describe("companionVoice stream lip sync", () => {
  it("keeps talk mode between stream segments and stops after finish", async () => {
    const onTalking = vi.fn();
    const onMouth = vi.fn();
    const voice = createCompanionVoice({
      cloudTtsUrl: null,
      onTalking,
      onMouth,
    });
    voice.setSpeakerOn(false);

    voice.beginStreamSpeak("happy");
    expect(onTalking).toHaveBeenCalledWith(true);

    const first = voice.pushStreamSpeak("Hello!", { emotion: "happy" });
    const second = voice.pushStreamSpeak("How are you?", { emotion: "happy" });

    await Promise.all([first, second]);
    expect(onTalking.mock.calls.at(-1)?.[0]).not.toBe(false);
    const voicedSamples = onMouth.mock.calls.filter(
      ([open]) => Number(open) > 0.04,
    );
    expect(voicedSamples.length).toBeGreaterThan(2);
    const gapResets = onMouth.mock.calls.filter(
      ([open, shape]) => Number(open) === 0 && shape == null,
    );
    expect(gapResets.length).toBeLessThan(voicedSamples.length);

    await voice.finishStreamSpeak();
    expect(onTalking.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("plays all stream segments queued before finishStreamSpeak", async () => {
    const spoken = [];
    const voice = createCompanionVoice({
      cloudTtsUrl: null,
      onSpeakChunk: (unit) => {
        if (unit) spoken.push(unit);
      },
    });
    voice.setSpeakerOn(false);

    voice.beginStreamSpeak("neutral");
    const first = voice.pushStreamSpeak("First sentence here.", { emotion: "neutral" });
    const second = voice.pushStreamSpeak("Second sentence follows.", { emotion: "neutral" });
    const finish = voice.finishStreamSpeak();
    await Promise.all([first, second, finish]);

    expect(spoken.length).toBeGreaterThan(0);
  });
});
