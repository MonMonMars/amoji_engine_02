import { describe, expect, it } from "vitest";
import {
  resolveMotionVendorPref,
  persistMotionVendorPref,
  nextMotionVendorPref,
  MOTION_VENDOR_PREF_STORAGE_KEY,
} from "../engine/lab/motionVendorPref.js";
import {
  sampleVendorMotionFrame,
  createRobotMotionAdapter,
} from "../engine/robot/talkMotion.js";
import { createRobotMotionDispatcher } from "../engine/robot/motionDispatcher.js";
import { createVoiceRobotBridge } from "../engine/voice/voiceRobotBridge.js";
import { buildLabShareUrl } from "../engine/lab/clipboard.js";

describe("motionVendorPref", () => {
  it("resolves from query and persists", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] ?? null;
      },
      setItem(k, v) {
        this.data[k] = String(v);
      },
    };
    const pref = resolveMotionVendorPref({
      search: "?motion=reachy",
      storage,
      env: {},
    });
    expect(pref.vendor).toBe("reachy");
    expect(pref.source).toBe("query");
    expect(storage.data[MOTION_VENDOR_PREF_STORAGE_KEY]).toBe("reachy");
    expect(persistMotionVendorPref("softbank", { storage })).toBe("softbank");
    expect(nextMotionVendorPref("softbank")).toBe("furhat");
  });
});

describe("sampleVendorMotionFrame + dispatcher", () => {
  it("animates Reachy joints over time and logs dispatches", () => {
    const a = sampleVendorMotionFrame(0.1, {
      style: "wave",
      vendor: "reachy",
      intensity: 1,
    });
    const b = sampleVendorMotionFrame(0.6, {
      style: "wave",
      vendor: "reachy",
      intensity: 1,
    });
    expect(a.reachy.r_arm).toHaveLength(7);
    expect(a.frame).toBe(true);
    expect(a.reachy.r_arm[5]).not.toEqual(b.reachy.r_arm[5]);

    const disp = createRobotMotionDispatcher();
    const begin = disp.begin(a, { source: "test" });
    expect(begin.event).toBe("begin");
    expect(disp.active).toBe(true);
    disp.frame(b);
    expect(disp.length).toBe(2);
    disp.end({ reason: "done" });
    expect(disp.active).toBe(false);
    expect(disp.formatHud()).toContain("idle");
  });

  it("SoftBank turns expose annotated ALAnimatedSpeech reply on sakura begin", async () => {
    const robot = createVoiceRobotBridge({ motionVendor: "softbank" });
    /** @type {object | null} */
    let sakuraPayload = null;
    robot.on("sakura", (p) => {
      sakuraPayload = p;
    });
    const turn = await robot.runTurn("早晨", { forceReply: "早晨呀！" });
    expect(turn.motion.vendor).toBe("softbank");
    expect(turn.annotatedReply).toContain("^start(");
    expect(turn.annotatedReply).toContain("Hey_1");
    expect(sakuraPayload?.annotatedReply).toBe(turn.annotatedReply);
    expect(sakuraPayload?.motion?.softbank?.tag).toBeTruthy();

    const adapter = createRobotMotionAdapter({ vendor: "unitree_g1" });
    adapter.fromStyle("point");
    const f1 = adapter.sampleFrame(0.05, { speechEnergy: 0.7 });
    const f2 = adapter.sampleFrame(0.05, { speechEnergy: 0.7 });
    expect(f1.unitree_g1.joints.right_shoulder_pitch).toBeTypeOf("number");
    expect(f2.timeSec).toBeGreaterThan(f1.timeSec);
  });

  it("dispatcher begin forwards SoftBank annotatedReply via bridge", async () => {
    const posts = [];
    const bridge = {
      mode: "http",
      begin(pkg, meta) {
        posts.push({ pkg, meta });
        return { ok: true };
      },
    };
    const disp = createRobotMotionDispatcher({ bridge });
    const robot = createVoiceRobotBridge({ motionVendor: "softbank" });
    const pkg = robot.fromMotionStyle("wave", { text: "拜拜" });
    disp.begin(pkg, {
      source: "demo",
      annotatedReply: pkg.softbank.annotatedSay,
    });
    expect(posts).toHaveLength(1);
    expect(posts[0].meta.annotatedReply).toContain("^start(");
    expect(posts[0].pkg.vendor).toBe("softbank");
  });

  it("Motion demo streams Reachy frames and Furhat sayText on begin", async () => {
    const frames = [];
    const begins = [];
    const bridge = {
      mode: "http",
      begin(pkg, meta) {
        begins.push({ pkg, meta });
        return { ok: true };
      },
      frame(pkg) {
        frames.push(pkg);
        return { ok: true };
      },
    };
    const robot = createVoiceRobotBridge({ motionVendor: "reachy" });
    const pkg = robot.fromMotionStyle("wave", { text: "拜拜" });
    const disp = createRobotMotionDispatcher({ bridge });
    disp.begin(pkg, { source: "demo" });
    disp.frame(robot.sampleMotionFrame(0.08, { speechEnergy: 0.55 }), {
      source: "demo-raf",
    });
    disp.frame(robot.sampleMotionFrame(0.08, { speechEnergy: 0.55 }), {
      source: "demo-raf",
    });
    expect(frames.length).toBe(2);
    expect(frames[0].vendor).toBe("reachy");
    expect(frames[0].reachy.r_arm).toHaveLength(7);
    expect(frames[1].timeSec).toBeGreaterThan(frames[0].timeSec);

    robot.setMotionVendor("furhat");
    const furhat = robot.fromMotionStyle("point", { text: "睇下呢個！" });
    expect(furhat.furhat.say).toBe("睇下呢個！");
    disp.begin(furhat, {
      source: "demo",
      sayText: furhat.furhat.say,
    });
    expect(begins.at(-1).meta.sayText).toBe("睇下呢個！");

    const turn = await createVoiceRobotBridge({
      motionVendor: "furhat",
    }).runTurn("你好", { forceReply: "你好呀！" });
    expect(turn.sayText).toBe("你好呀！");
    expect(turn.motion.furhat.say).toBe("你好呀！");
  });

  it("share URL includes motion vendor", () => {
    const url = buildLabShareUrl({
      href: "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html",
      motion: "unitree_g1",
      lang: "yue",
    });
    expect(url).toContain("motion=unitree_g1");
    expect(url).toContain("lang=yue");
  });
});
