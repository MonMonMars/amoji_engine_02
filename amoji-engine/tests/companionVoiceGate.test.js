import { describe, expect, it } from "vitest";
import { createCompanionVoiceGate } from "../engine/companion/companionVoiceGate.js";

describe("companionVoiceGate", () => {
  it("allows barge on meaningful interim STT", () => {
    const gate = createCompanionVoiceGate();
    const result = gate.shouldBarge({
      source: "interim-speech",
      text: "喂你好",
    });
    expect(result.allow).toBe(true);
    expect(result.reason).toBe("stt-interim");
  });

  it("rejects punctuation-only interim", () => {
    const gate = createCompanionVoiceGate();
    const result = gate.shouldBarge({
      source: "interim",
      text: "…",
    });
    expect(result.allow).toBe(false);
  });

  it("requires sustained energy before energy barge", () => {
    const gate = createCompanionVoiceGate({ minSpeechMs: 100 });
    for (let i = 0; i < 20; i += 1) {
      gate.observeEnergy(0.006);
    }
    const brief = gate.shouldBarge({
      source: "mic-energy",
      rms: 0.05,
      speechMs: 40,
    });
    expect(brief.allow).toBe(false);

    const sustained = gate.shouldBarge({
      source: "mic-energy",
      rms: 0.055,
      speechMs: 180,
    });
    expect(sustained.allow).toBe(true);
  });

  it("honors cooldown between barges", () => {
    const gate = createCompanionVoiceGate({ cooldownMs: 500 });
    gate.shouldBarge({ source: "interim-speech", text: "stop now" });
    const blocked = gate.shouldBarge({ source: "interim-speech", text: "again please" });
    expect(blocked.allow).toBe(false);
    expect(blocked.reason).toBe("cooldown");
  });
});
