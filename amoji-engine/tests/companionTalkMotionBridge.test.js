import { describe, expect, it } from "vitest";
import {
  blendBodyPoses,
  inferTalkStyleFromChunk,
  sampleBodyTalkMotion,
  talkGesturePoseToBody,
} from "../engine/companion/companionTalkMotionBridge.js";

describe("companionTalkMotionBridge", () => {
  it("maps talk gesture pose to body channels", () => {
    const body = talkGesturePoseToBody({
      armLA: 0.5,
      armRA: 0.4,
      bodyAngleX: 0.1,
      bodyAngleY: -0.05,
      bodyAngleZ: 0.08,
      shoulderL: 0.2,
      shoulderR: 0.18,
      handLY: 0.3,
      handRY: 0.25,
    });
    expect(body.armLiftL).toBeGreaterThan(0.4);
    expect(body.armLiftR).toBeGreaterThan(0.35);
    expect(body.leanY).toBeLessThan(0);
  });

  it("blends poses with weight", () => {
    const out = blendBodyPoses({ armLiftL: 0.2 }, { armLiftL: 0.8 }, 0.5);
    expect(out.armLiftL).toBeCloseTo(0.5, 2);
  });

  it("samples continuous talk motion", () => {
    const a = sampleBodyTalkMotion(0, { style: "wave", speechEnergy: 0.8 });
    const b = sampleBodyTalkMotion(0.5, { style: "wave", speechEnergy: 0.8 });
    expect(a.style).toBe("wave");
    expect(b.body.handWaveR).toBeDefined();
    expect(Math.abs((b.body.handWaveR ?? 0) - (a.body.handWaveR ?? 0))).toBeGreaterThan(
      0.01,
    );
  });

  it("infers style from speech chunk", () => {
    expect(inferTalkStyleFromChunk("你好呀！", { emotion: "happy" })).toBe(
      "celebrate",
    );
    expect(inferTalkStyleFromChunk("點解呀？", { emotion: "neutral" })).toBe(
      "question",
    );
  });
});
