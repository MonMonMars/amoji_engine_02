import { describe, expect, it, vi } from "vitest";
import {
  resolveMotionBridgeConfig,
  persistMotionBridgeUrl,
  MOTION_BRIDGE_URL_STORAGE_KEY,
} from "../engine/lab/motionBridgeUrl.js";
import { createMotionBridgeClient } from "../engine/robot/motionBridgeClient.js";
import { createRobotMotionDispatcher } from "../engine/robot/motionDispatcher.js";
import { buildRobotMotionPackage } from "../engine/robot/talkMotion.js";
import { buildLabShareUrl } from "../engine/lab/clipboard.js";

describe("motionBridgeUrl pref", () => {
  it("resolves from query and persists", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] ?? null;
      },
      setItem(k, v) {
        this.data[k] = String(v);
      },
      removeItem(k) {
        delete this.data[k];
      },
    };
    const cfg = resolveMotionBridgeConfig({
      search: "?motionBridge=http://127.0.0.1:7891",
      storage,
      env: {},
    });
    expect(cfg.bridgeUrl).toBe("http://127.0.0.1:7891");
    expect(cfg.mode).toBe("http");
    expect(cfg.source).toBe("query");
    expect(storage.data[MOTION_BRIDGE_URL_STORAGE_KEY]).toBe(
      "http://127.0.0.1:7891",
    );
    expect(persistMotionBridgeUrl("off", { storage })).toBe(null);
    expect(storage.data[MOTION_BRIDGE_URL_STORAGE_KEY]).toBeUndefined();
  });

  it("treats off/none as disabled", () => {
    const cfg = resolveMotionBridgeConfig({
      search: "?motionBridge=off",
      storage: null,
      env: {},
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.mode).toBe("off");
  });
});

describe("motionBridgeClient + dispatcher forward", () => {
  it("posts begin/frame/end and counts forwards", async () => {
    const posts = [];
    const fetchImpl = vi.fn(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      posts.push({ url: String(url), method: init?.method, body });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, received: true }),
      };
    });
    const client = createMotionBridgeClient({
      bridgeUrl: "http://127.0.0.1:7891",
      fetchImpl,
    });
    expect(client.mode).toBe("http");

    const pkg = buildRobotMotionPackage({
      text: "拜拜",
      vendor: "softbank",
    });
    const disp = createRobotMotionDispatcher({ bridge: client });
    disp.begin(pkg, { source: "test", annotatedReply: "^start(x)" });
    await new Promise((r) => setTimeout(r, 20));
    disp.frame(
      { ...pkg, frame: true, timeSec: 0.2, vendor: "softbank" },
      { source: "raf" },
    );
    await new Promise((r) => setTimeout(r, 20));
    disp.end({ reason: "done" });
    await new Promise((r) => setTimeout(r, 20));

    expect(posts.length).toBeGreaterThanOrEqual(3);
    expect(posts.some((p) => p.url.endsWith("/motion/begin"))).toBe(true);
    expect(posts.some((p) => p.url.endsWith("/motion/frame"))).toBe(true);
    expect(posts.some((p) => p.url.endsWith("/motion/end"))).toBe(true);
    expect(disp.bridgeForwarded).toBeGreaterThanOrEqual(1);
    const json = disp.toJSON();
    expect(json.schema).toContain("robotMotionDispatch");
    expect(json.length).toBe(3);
  });

  it("skips when mode is off", async () => {
    const fetchImpl = vi.fn();
    const client = createMotionBridgeClient({
      bridgeUrl: null,
      fetchImpl,
    });
    const res = await client.begin({ vendor: "sakura" });
    expect(res.skipped).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("share URL includes motionBridge", () => {
    const url = buildLabShareUrl({
      href: "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html",
      motion: "reachy",
      motionBridge: "http://127.0.0.1:7891",
    });
    expect(url).toContain("motion=reachy");
    expect(url).toContain("motionBridge=http%3A%2F%2F127.0.0.1%3A7891");
  });
});
