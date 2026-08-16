import { describe, expect, it } from "vitest";
import {
  DEFAULT_CANTONESE_INSTRUCTIONS,
  buildCantoneseRealtimeSession,
  realtimeAuthHeaders,
  realtimeWebSocketUrl,
} from "./cantoneseConfig.js";

describe("cantoneseConfig", () => {
  it("builds a Cantonese-tuned realtime session", () => {
    const session = buildCantoneseRealtimeSession();
    expect(session.instructions).toBe(DEFAULT_CANTONESE_INSTRUCTIONS);
    expect(session.inputAudioTranscription.language).toBe("zh");
    expect(session.turnDetection.type).toBe("server_vad");
    expect(session.inputAudioFormat).toBe("pcm16");
  });

  it("allows session overrides", () => {
    const session = buildCantoneseRealtimeSession({
      voice: "alloy",
      instructions: "Test",
    });
    expect(session.voice).toBe("alloy");
    expect(session.instructions).toBe("Test");
  });

  it("builds realtime websocket URL with model param", () => {
    const url = realtimeWebSocketUrl("gpt-4o-realtime-preview");
    expect(url).toContain("wss://api.openai.com/v1/realtime");
    expect(url).toContain("model=gpt-4o-realtime-preview");
  });

  it("includes required auth headers", () => {
    const headers = realtimeAuthHeaders("sk-test");
    expect(headers.Authorization).toBe("Bearer sk-test");
    expect(headers["OpenAI-Beta"]).toBe("realtime=v1");
  });
});
