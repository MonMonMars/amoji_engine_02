import { describe, expect, it } from "vitest";
import {
  createCompanionVoiceGate,
  isLikelyAssistantEcho,
  meaningfulSpeechLength,
  normalizeSpeechForCompare,
} from "../engine/companion/companionVoiceGate.js";

describe("companionVoiceGate", () => {
  it("ignores interim STT to avoid echo barge during TTS", () => {
    const gate = createCompanionVoiceGate();
    const result = gate.shouldBarge({
      source: "interim-speech",
      text: "喂你好",
    });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe("ignore-interim");
  });

  it("allows barge on final STT with enough meaningful speech", () => {
    const gate = createCompanionVoiceGate({ minFinalChars: 3 });
    const result = gate.shouldBarge({
      source: "final-speech",
      text: "stop please",
    });
    expect(result.allow).toBe(true);
    expect(result.reason).toBe("stt-final");
  });

  it("rejects punctuation-only interim", () => {
    const gate = createCompanionVoiceGate();
    const result = gate.shouldBarge({
      source: "interim",
      text: "…",
    });
    expect(result.allow).toBe(false);
  });

  it("rejects energy-only barge by default", () => {
    const gate = createCompanionVoiceGate();
    for (let i = 0; i < 20; i += 1) {
      gate.observeEnergy(0.006);
    }
    const result = gate.shouldBarge({
      source: "energy-barge",
      rms: 0.08,
      speechMs: 400,
    });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe("energy-barge-disabled");
  });

  it("requires sustained energy before energy barge when enabled", () => {
    const gate = createCompanionVoiceGate({
      allowEnergyBarge: true,
      minSpeechMs: 100,
    });
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
      speechMs: 220,
    });
    expect(sustained.allow).toBe(true);
  });

  it("honors cooldown between barges", () => {
    const gate = createCompanionVoiceGate({ cooldownMs: 500, minFinalChars: 3 });
    gate.shouldBarge({ source: "final-speech", text: "stop now" });
    const blocked = gate.shouldBarge({ source: "final-speech", text: "again please" });
    expect(blocked.allow).toBe(false);
    expect(blocked.reason).toBe("cooldown");
  });

  it("rejects assistant echo picked up by STT", () => {
    const gate = createCompanionVoiceGate({ minFinalChars: 3 });
    gate.setAssistantEchoContext([
      "今日天氣好好，我哋出去行下街，順便買啲嘢食。",
    ]);
    const echo = gate.shouldBarge({
      source: "final-speech",
      text: "出去行下街",
    });
    expect(echo.allow).toBe(false);
    expect(echo.reason).toBe("assistant-echo");
  });

  it("accepts distinct user speech while assistant is talking", () => {
    const gate = createCompanionVoiceGate({ minFinalChars: 3 });
    gate.setAssistantEchoContext([
      "今日天氣好好，我哋出去行下街，順便買啲嘢食。",
    ]);
    const user = gate.shouldBarge({
      source: "final-speech",
      text: "等等我想問你",
    });
    expect(user.allow).toBe(true);
    expect(user.reason).toBe("stt-final");
  });
});

describe("companionVoiceGate helpers", () => {
  it("normalizes speech for echo compare", () => {
    expect(normalizeSpeechForCompare("Hello, world!")).toBe("helloworld");
    expect(meaningfulSpeechLength("…  hi! ")).toBe(2);
  });

  it("detects likely assistant echo fragments", () => {
    const assistant = "Let me explain how this companion works in detail.";
    expect(isLikelyAssistantEcho("companion works", [assistant])).toBe(true);
    expect(isLikelyAssistantEcho("totally different question", [assistant])).toBe(
      false,
    );
  });
});
