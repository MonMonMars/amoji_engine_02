import { describe, expect, it, vi } from "vitest";
import { AmojiOrchestrator } from "./orchestrator.js";

type MockWsHandler = (event: unknown) => void;

function createMockWebSocketFactory(responses: object[] = []) {
  return (_url: string, _headers: Record<string, string>) => {
    const handlers = new Map<string, MockWsHandler>();
    let responseIndex = 0;

    const socket = {
      readyState: 0,
      send: vi.fn(),
      close: vi.fn(() => {
        handlers.get("close")?.({ code: 1000, reason: "test" });
      }),
      addEventListener: (type: string, listener: MockWsHandler) => {
        handlers.set(type, listener);
        if (type === "open") {
          queueMicrotask(() => {
            (socket as { readyState: number }).readyState = 1;
            listener({});
            for (const msg of responses) {
              queueMicrotask(() => {
                handlers.get("message")?.({ data: JSON.stringify(msg) });
              });
            }
            if (responses.length === 0 && responseIndex < 1) {
              responseIndex++;
              queueMicrotask(() => {
                handlers.get("message")?.({
                  data: JSON.stringify({
                    type: "session.created",
                    session: { id: "sess_test" },
                  }),
                });
              });
            }
          });
        }
      },
      removeEventListener: () => {},
    };

    return socket;
  };
}

describe("AmojiOrchestrator", () => {
  it("starts in voice-only mode without Face Live", async () => {
    const phases: string[] = [];
    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      voiceOnly: true,
      createWebSocket: createMockWebSocketFactory(),
    });

    orchestrator.on("phase", (p) => phases.push(p));
    await orchestrator.start();

    expect(orchestrator.currentPhase).toBe("listening");
    expect(phases).toContain("listening");
    expect(orchestrator.realtimeClient.connected).toBe(true);

    orchestrator.stop();
  });

  it("routes mic audio through the voice bridge", async () => {
    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      voiceOnly: true,
      createWebSocket: createMockWebSocketFactory(),
    });

    await orchestrator.start();
    orchestrator.pushMicAudio(new Int16Array(480).fill(100));

    expect(orchestrator.bridge.getStats().framesSent).toBeGreaterThan(0);
    orchestrator.stop();
  });

  it("emits transcripts from realtime events", async () => {
    const transcripts: Array<{ role: string; text: string }> = [];
    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      voiceOnly: true,
      createWebSocket: createMockWebSocketFactory([
        {
          type: "session.created",
          session: { id: "sess_1" },
        },
        {
          type: "conversation.item.input_audio_transcription.completed",
          transcript: "你好",
        },
        {
          type: "response.audio_transcript.done",
          transcript: "你好呀！有咩可以幫你？",
        },
      ]),
    });

    orchestrator.on("transcript", (t) => transcripts.push(t));
    await orchestrator.start();

    await vi.waitFor(() => {
      expect(transcripts.length).toBeGreaterThanOrEqual(1);
    });

    orchestrator.stop();
  });
});
