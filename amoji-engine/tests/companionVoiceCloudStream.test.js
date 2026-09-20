import { describe, expect, it, vi, afterEach } from "vitest";
import { createCompanionVoice } from "../engine/companion/companionVoice.js";

/** Minimal silent MP3 frame (valid enough for blob playback hooks). */
const TINY_MP3_B64 =
  "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

describe("companionVoice cloud stream lip sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call onTalking(false) between cloud stream chunks", async () => {
    const onTalking = vi.fn();
    const blob = await fetch(`data:audio/mpeg;base64,${TINY_MP3_B64}`).then((r) =>
      r.blob(),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => blob,
      })),
    );

    const voice = createCompanionVoice({
      cloudTtsUrl: "https://example.test/tts",
      preferCloudTts: true,
      onTalking,
    });

    voice.beginStreamSpeak("neutral");
    expect(onTalking).toHaveBeenCalledWith(true);
    const afterBegin = onTalking.mock.calls.length;

    const first = voice.pushStreamSpeak("Hi there.", { emotion: "neutral" });
    const second = voice.pushStreamSpeak("Still talking.", { emotion: "neutral" });
    await Promise.all([first, second]);

    const falseDuringStream = onTalking.mock.calls
      .slice(afterBegin)
      .filter(([on]) => on === false);
    expect(falseDuringStream.length).toBe(0);

    await voice.finishStreamSpeak();
    expect(onTalking.mock.calls.at(-1)?.[0]).toBe(false);
  });
});
