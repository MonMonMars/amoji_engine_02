import { describe, expect, it, vi } from "vitest";
import { AmojiOrchestrator } from "./orchestrator.js";
import { startMockFaceLiveBridge } from "../face-live/mockBridge.js";

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

    await orchestrator.stop();
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
    await orchestrator.stop();
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
          type: "response.output_audio_transcript.done",
          transcript: "你好呀！有咩可以幫你？",
        },
      ]),
    });

    orchestrator.on("transcript", (t) => transcripts.push(t));
    await orchestrator.start();

    await vi.waitFor(() => {
      expect(transcripts.length).toBeGreaterThanOrEqual(1);
    });

    await orchestrator.stop();
  });

  it("returns to listening after response.done", async () => {
    const phases: string[] = [];
    const handlers: { message?: MockWsHandler } = {};
    const createWebSocket = () => {
      const socket = {
        readyState: 0,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: (type: string, listener: MockWsHandler) => {
          if (type === "message") handlers.message = listener;
          if (type === "open") {
            queueMicrotask(() => {
              (socket as { readyState: number }).readyState = 1;
              listener({});
              handlers.message?.({
                data: JSON.stringify({
                  type: "session.created",
                  session: { id: "sess_done" },
                }),
              });
            });
          }
        },
        removeEventListener: () => {},
      };
      return socket;
    };

    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      voiceOnly: true,
      createWebSocket,
    });
    orchestrator.on("phase", (p) => phases.push(p));
    await orchestrator.start();

    handlers.message?.({
      data: JSON.stringify({
        type: "response.output_audio.delta",
        delta: Buffer.from(new Int16Array([1, 2, 3, 4]).buffer).toString(
          "base64",
        ),
      }),
    });
    handlers.message?.({
      data: JSON.stringify({ type: "response.done" }),
    });

    await vi.waitFor(() => {
      expect(phases).toContain("speaking");
      expect(orchestrator.currentPhase).toBe("listening");
    });

    await orchestrator.stop();
  });

  it("wires Face Live via mock bridge", async () => {
    const bridge = await startMockFaceLiveBridge();
    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      faceLiveUrl: bridge.url,
      createWebSocket: createMockWebSocketFactory(),
      idlePresenceIntervalMs: 0, // manual ticks in this test
    });

    await orchestrator.start();
    expect(orchestrator.faceLiveDriver.isAuthenticated).toBe(true);
    expect(orchestrator.faceLiveDriver.expression).toBe("neutral");

    const before = bridge.injected.length;
    orchestrator.tickIdlePresence(0.2);
    await vi.waitFor(() => {
      expect(bridge.injected.length).toBeGreaterThan(before);
    });
    expect(
      bridge.injected.some((p) => p.id === "ParamMouthOpenY"),
    ).toBe(true);
    expect(orchestrator.idlePresenceClock.timeSec).toBeGreaterThan(0);

    await orchestrator.stop();
    await bridge.close();
  });

  it("skips idle presence ticks while speaking", async () => {
    const bridge = await startMockFaceLiveBridge();
    const handlers: { message?: MockWsHandler } = {};
    const createWebSocket = () => {
      const socket = {
        readyState: 0,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: (type: string, listener: MockWsHandler) => {
          if (type === "message") handlers.message = listener;
          if (type === "open") {
            queueMicrotask(() => {
              (socket as { readyState: number }).readyState = 1;
              listener({});
              handlers.message?.({
                data: JSON.stringify({
                  type: "session.created",
                  session: { id: "sess_idle" },
                }),
              });
            });
          }
        },
        removeEventListener: () => {},
      };
      return socket;
    };

    const orchestrator = new AmojiOrchestrator({
      openAiApiKey: "sk-test",
      faceLiveUrl: bridge.url,
      createWebSocket,
      idlePresenceIntervalMs: 0,
    });
    await orchestrator.start();

    handlers.message?.({
      data: JSON.stringify({
        type: "response.output_audio.delta",
        delta: Buffer.from(new Int16Array([1, 2, 3, 4]).buffer).toString(
          "base64",
        ),
      }),
    });
    await vi.waitFor(() => {
      expect(orchestrator.currentPhase).toBe("speaking");
    });

    const before = bridge.injected.length;
    const t0 = orchestrator.idlePresenceClock.timeSec;
    orchestrator.tickIdlePresence(0.5);
    expect(orchestrator.idlePresenceClock.timeSec).toBe(t0);
    expect(bridge.injected.length).toBe(before);

    await orchestrator.stop();
    await bridge.close();
  });
});
