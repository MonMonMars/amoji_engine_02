import { describe, expect, it, vi } from "vitest";
import {
  PUSH_TO_TALK_SCHEMA,
  bindPushToTalkPointer,
  createPushToTalk,
} from "../engine/voice/pushToTalk.js";

describe("pushToTalk", () => {
  it("press → release runs talk when held long enough", async () => {
    let t = 1_000;
    const startListening = vi.fn(async () => {});
    const stopListeningAndTalk = vi.fn(async () => {});
    const ptt = createPushToTalk({
      startListening,
      stopListeningAndTalk,
      getTurnExtra: () => ({ useWorker: true }),
      minHoldMs: 50,
      nowMs: () => t,
    });

    expect(ptt.schema).toBe(PUSH_TO_TALK_SCHEMA);
    expect(await ptt.press()).toBe(true);
    expect(ptt.holding).toBe(true);
    expect(startListening).toHaveBeenCalledTimes(1);

    t += 80;
    expect(await ptt.release()).toBe("talked");
    expect(ptt.holding).toBe(false);
    expect(stopListeningAndTalk).toHaveBeenCalledTimes(1);
    expect(stopListeningAndTalk.mock.calls[0][0].source).toBe("push-to-talk");
  });

  it("short hold cancels without talk", async () => {
    let t = 0;
    const stopListeningAndTalk = vi.fn(async () => {});
    const cancelListening = vi.fn(async () => {});
    const ptt = createPushToTalk({
      startListening: async () => {},
      stopListeningAndTalk,
      cancelListening,
      minHoldMs: 100,
      nowMs: () => t,
    });
    await ptt.press();
    t += 40;
    expect(await ptt.release()).toBe("cancelled");
    expect(stopListeningAndTalk).not.toHaveBeenCalled();
    expect(cancelListening).toHaveBeenCalledTimes(1);
  });

  it("cancel drops an active hold", async () => {
    const cancelListening = vi.fn(async () => {});
    const ptt = createPushToTalk({
      startListening: async () => {},
      stopListeningAndTalk: async () => {},
      cancelListening,
    });
    await ptt.press();
    expect(await ptt.cancel()).toBe(true);
    expect(ptt.holding).toBe(false);
    expect(cancelListening).toHaveBeenCalledTimes(1);
    expect(await ptt.release()).toBe("ignored");
  });

  it("bindPushToTalkPointer wires pointer events", async () => {
    const listeners = new Map();
    const el = {
      addEventListener(type, cb) {
        listeners.set(type, cb);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
    };
    const ptt = createPushToTalk({
      startListening: async () => {},
      stopListeningAndTalk: async () => {},
      minHoldMs: 0,
      nowMs: (() => {
        let t = 0;
        return () => {
          t += 100;
          return t;
        };
      })(),
    });
    const unbind = bindPushToTalkPointer(el, ptt);
    await listeners.get("pointerdown")({ button: 0, preventDefault() {} });
    expect(ptt.holding).toBe(true);
    await listeners.get("pointerup")({ preventDefault() {} });
    expect(ptt.holding).toBe(false);
    unbind();
    expect(listeners.size).toBe(0);
  });
});
