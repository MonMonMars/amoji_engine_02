import { describe, expect, it, vi } from "vitest";
import { base64ToInt16, int16ToBase64, RealtimeChatClient } from "./realtimeClient.js";

describe("realtimeClient audio codec helpers", () => {
  it("round-trips PCM16 through base64", () => {
    const original = new Int16Array([0, 1000, -2000, 32767, -32768]);
    const encoded = int16ToBase64(original);
    const decoded = base64ToInt16(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("handles empty buffers", () => {
    const empty = new Int16Array(0);
    expect(base64ToInt16(int16ToBase64(empty)).length).toBe(0);
  });
});

describe("RealtimeChatClient session wire", () => {
  it("sends GA session.update on connect", async () => {
    let sent: Record<string, unknown>[] = [];
    const createWebSocket = () => {
      const handlers = new Map<string, (event: unknown) => void>();
      const socket = {
        readyState: 0,
        send: (data: string) => {
          sent.push(JSON.parse(data) as Record<string, unknown>);
        },
        close: vi.fn(),
        addEventListener: (type: string, listener: (event: unknown) => void) => {
          handlers.set(type, listener);
          if (type === "open") {
            queueMicrotask(() => {
              (socket as { readyState: number }).readyState = 1;
              listener({});
            });
          }
        },
        removeEventListener: () => {},
      };
      return socket;
    };

    const client = new RealtimeChatClient({
      apiKey: "sk-test",
      createWebSocket,
    });
    await client.connect();

    await vi.waitFor(() => {
      expect(sent.some((m) => m.type === "session.update")).toBe(true);
    });

    const update = sent.find((m) => m.type === "session.update") as {
      session: { type: string; audio: { input: { format: unknown } } };
    };
    expect(update.session.type).toBe("realtime");
    expect(update.session.audio.input.format).toEqual({
      type: "audio/pcm",
      rate: 24_000,
    });

    client.disconnect();
  });
});
