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

    await voice.finishStreamSpeak();
    expect(onTalking.mock.calls.at(-1)?.[0]).toBe(false);
  });
});
