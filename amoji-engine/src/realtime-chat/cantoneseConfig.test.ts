import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANTONESE_INSTRUCTIONS,
  buildCantoneseRealtimeSession,
  realtimeAuthHeaders,
  realtimeWebSocketUrl,
  toRealtimeSessionWire,
} from "./cantoneseConfig.js";

describe("cantoneseConfig", () => {
  it("builds a Cantonese-tuned realtime session", () => {
    const session = buildCantoneseRealtimeSession();
    expect(session.instructions).toBe(DEFAULT_CANTONESE_INSTRUCTIONS);
    expect(session.inputAudioTranscription.language).toBe("zh");
    expect(session.turnDetection.type).toBe("server_vad");
    expect(session.inputAudioFormat).toBe("pcm16");
    expect(session.turnDetection.createResponse).toBe(true);
  });

  it("allows session overrides", () => {
    const session = buildCantoneseRealtimeSession({
      voice: "alloy",
      instructions: "Test",
      turnDetection: {
        type: "server_vad",
        createResponse: false,
        silenceDurationMs: 700,
      },
    });
    expect(session.voice).toBe("alloy");
    expect(session.instructions).toBe("Test");
    expect(session.turnDetection.createResponse).toBe(false);
    expect(session.turnDetection.silenceDurationMs).toBe(700);
  });

  it("converts domain config to GA wire payload", () => {
    const wire = toRealtimeSessionWire(buildCantoneseRealtimeSession());
    expect(wire.type).toBe("realtime");
    expect(wire.audio.input.format).toEqual({
      type: "audio/pcm",
      rate: 24_000,
    });
    expect(wire.audio.input.transcription.language).toBe("zh");
    expect(wire.audio.input.turn_detection.prefix_padding_ms).toBe(300);
    expect(wire.audio.input.turn_detection.create_response).toBe(true);
    expect(wire.audio.output.voice).toBe("shimmer");
    expect(wire.output_modalities).toEqual(["audio"]);
  });

  it("builds realtime websocket URL with model param", () => {
    const url = realtimeWebSocketUrl("gpt-realtime");
    expect(url).toContain("wss://api.openai.com/v1/realtime");
    expect(url).toContain("model=gpt-realtime");
  });

  it("includes required auth headers without beta header", () => {
    const headers = realtimeAuthHeaders("sk-test");
    expect(headers.Authorization).toBe("Bearer sk-test");
    expect(headers["OpenAI-Beta"]).toBeUndefined();
  });
});
