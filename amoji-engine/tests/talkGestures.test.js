import { describe, expect, it } from "vitest";
import {
  TALK_GESTURE_STYLES,
  inferTalkGestureFromText,
  nextTalkGestureStyle,
  sampleTalkGesture,
  talkGestureToFaceLiveParams,
  mergeFaceLiveParams,
  createTalkGestureClock,
} from "../engine/face/talkGestures.js";

describe("inferTalkGestureFromText", () => {
  it("maps content cues to Disney-style gesture styles", () => {
    expect(inferTalkGestureFromText("睇下呢個")).toBe("point");
    expect(inferTalkGestureFromText("點解呀？")).toBe("question");
    expect(inferTalkGestureFromText("哈哈好開心！")).toBe("celebrate");
    expect(inferTalkGestureFromText("第一、第二、第三")).toBe("count");
    expect(inferTalkGestureFromText("算啦，冇辦法")).toBe("shrug");
    expect(inferTalkGestureFromText("我諗緊…")).toBe("thinking");
    expect(inferTalkGestureFromText("唉，好傷心")).toBe("soft");
    expect(inferTalkGestureFromText("真係!! 一定要")).toBe("emphasize");
    expect(inferTalkGestureFromText("拜拜")).toBe("wave");
    expect(inferTalkGestureFromText("今日天氣幾好")).toBe("explain");
  });

  it("honors emotion overrides", () => {
    expect(inferTalkGestureFromText("ok", { emotion: "happy" })).toBe(
      "celebrate",
    );
    expect(inferTalkGestureFromText("ok", { emotion: "thinking" })).toBe(
      "thinking",
    );
    expect(inferTalkGestureFromText("ok", { emotion: "sad" })).toBe("soft");
  });
});

describe("sampleTalkGesture", () => {
  it("animates body / hands / fingers per style", () => {
    const point = sampleTalkGesture(0.4, { style: "point", intensity: 1 });
    expect(point.style).toBe("point");
    expect(point.pose.handRPoint).toBeGreaterThan(0.7);
    expect(point.pose.fingerRIndex).toBeGreaterThan(0.8);
    expect(point.pose.fingerRMiddle).toBeLessThan(0.3);
    expect(point.pose.shoulderR).toBeGreaterThan(0.1);
    expect(point.pose.bodyAngleY).not.toBe(0);

    const explainA = sampleTalkGesture(0.1, { style: "explain" });
    const explainB = sampleTalkGesture(0.9, { style: "explain" });
    expect(explainA.pose.armLA).not.toEqual(explainB.pose.armLA);

    const count = sampleTalkGesture(0.2, { style: "count", countDigit: 3 });
    expect(count.pose.fingerRThumb).toBeGreaterThan(0.8);
    expect(count.pose.fingerRIndex).toBeGreaterThan(0.8);
    expect(count.pose.fingerRMiddle).toBeGreaterThan(0.8);
    expect(count.pose.fingerRRing).toBeLessThan(0.2);
  });

  it("maps to Face Live param ids and merges with lip-sync", () => {
    const sample = sampleTalkGesture(0.3, { style: "wave" });
    const params = talkGestureToFaceLiveParams(sample);
    expect(params.some((p) => p.id === "ParamArmRA")).toBe(true);
    expect(params.some((p) => p.id === "ParamFingerRIndex")).toBe(true);

    const merged = mergeFaceLiveParams(
      [{ id: "ParamMouthOpenY", value: 0.5 }],
      params,
      [{ id: "ParamArmRA", value: 0.99 }],
    );
    expect(merged.find((p) => p.id === "ParamMouthOpenY")?.value).toBe(0.5);
    expect(merged.find((p) => p.id === "ParamArmRA")?.value).toBe(0.99);
  });
});

describe("TalkGestureClock", () => {
  it("cycles styles and binds from text", () => {
    expect(nextTalkGestureStyle("explain")).toBe("point");
    expect(TALK_GESTURE_STYLES).toContain("celebrate");

    const clock = createTalkGestureClock();
    expect(clock.setFromText("睇下嗰度")).toBe("point");
    expect(clock.start("拜拜")).toBe("wave");
    expect(clock.active).toBe(true);
    const a = clock.step(0.05, { speechEnergy: 0.8 });
    const b = clock.step(0.05, { speechEnergy: 0.8 });
    expect(b.timeSec).toBeGreaterThan(a.timeSec);
    expect(a.style).toBe("wave");

    clock.setFromText("一、二、三");
    expect(clock.opts.style).toBe("count");
    expect(clock.opts.countDigit).toBe(3);

    clock.stop();
    const soft = clock.step(0.01);
    expect(soft.style).toBe("soft");
  });
});
