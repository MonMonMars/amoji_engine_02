import { describe, expect, it } from "vitest";
import {
  TTS_VOLUME_PRESETS,
  nextTtsVolume,
  normalizeTtsVolume,
  persistTtsVolumePref,
  prevTtsVolume,
  resolveTtsVolumePref,
} from "../engine/lab/ttsVolumePref.js";
import { createTtsPlaybackQueue } from "../engine/voice/browserAudio.js";

describe("ttsVolumePref", () => {
  it("normalizes and cycles soft → normal → loud", () => {
    expect(normalizeTtsVolume("quiet")).toBe("soft");
    expect(normalizeTtsVolume("max")).toBe("loud");
    expect(nextTtsVolume("soft")).toBe("normal");
    expect(nextTtsVolume("loud")).toBe("soft");
    expect(prevTtsVolume("soft")).toBe("loud");
    expect(TTS_VOLUME_PRESETS.loud.gain).toBeGreaterThan(
      TTS_VOLUME_PRESETS.soft.gain,
    );
  });

  it("resolves from query over storage", () => {
    const memory = new Map([["amoji.ttsVolume", "loud"]]);
    const storage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
    };
    const pref = resolveTtsVolumePref({
      search: "?vol=soft",
      storage,
      env: {},
    });
    expect(pref.level).toBe("soft");
    expect(pref.gain).toBe(TTS_VOLUME_PRESETS.soft.gain);
    expect(pref.source).toBe("query");
    expect(memory.get("amoji.ttsVolume")).toBe("soft");

    const persisted = persistTtsVolumePref("loud", { storage });
    expect(persisted.level).toBe("loud");
  });
});

describe("TtsChunkPlayer gain", () => {
  it("setGain updates linear gain without playing", () => {
    const player = createTtsPlaybackQueue({ offline: true, gain: 0.5 });
    expect(player.gain).toBe(0.5);
    expect(player.setGain(1.25)).toBe(1.25);
    expect(player.gain).toBe(1.25);
  });
});
