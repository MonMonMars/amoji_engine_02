import { describe, expect, it } from "vitest";
import {
  FINGER_DIGITS,
  FINGER_JOINTS,
  listFingerTipParamIds,
  inferTalkGestureFromText,
  sampleTalkGesture,
  setFingerChain,
  talkGestureToFaceLiveParams,
  createTalkGestureClock,
} from "./talkGestures.js";

describe("talkGestures (TS)", () => {
  it("infers styles and samples fingertip chains", () => {
    expect(inferTalkGestureFromText("睇下呢個")).toBe("point");
    const point = sampleTalkGesture(0.4, { style: "point", intensity: 1 });
    expect(point.pose.fingerRIndexTip).toBeGreaterThan(0.8);
    expect(point.pose.fingerRIndexMid).toBeGreaterThan(0.7);
    expect(point.pose.fingerRMiddleTip).toBeLessThan(0.3);

    for (const side of ["L", "R"] as const) {
      for (const digit of FINGER_DIGITS) {
        for (const joint of FINGER_JOINTS) {
          expect(point.pose[`finger${side}${digit}${joint}`]).toBeTypeOf(
            "number",
          );
        }
      }
    }

    const tips = listFingerTipParamIds();
    expect(tips).toHaveLength(10);
    const params = talkGestureToFaceLiveParams(point);
    expect(params.some((p) => p.id === "ParamFingerRIndexTip")).toBe(true);
  });

  it("cascades tip ahead of mid/prox", () => {
    const pose: Record<string, number> = {};
    setFingerChain(pose, "R", "Index", 0.9, { tipBias: 1.1 });
    expect(pose.fingerRIndexTip!).toBeGreaterThan(pose.fingerRIndexMid!);
    expect(pose.fingerRIndexMid!).toBeGreaterThan(pose.fingerRIndexProx!);
  });

  it("clock binds from text", () => {
    const clock = createTalkGestureClock();
    expect(clock.start("拜拜")).toBe("wave");
    const a = clock.step(0.05);
    expect(a.style).toBe("wave");
    expect(a.fingerTips.fingerRIndexTip).toBeTypeOf("number");
  });
});
