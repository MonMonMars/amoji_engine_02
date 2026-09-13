import { describe, expect, it } from "vitest";
import {
  blendBodyPoses,
  inferTalkStyleFromChunk,
  sampleBodyTalkMotion,
  talkGesturePoseToBody,
} from "../engine/companion/companionTalkMotionBridge.js";

describe("companionTalkMotionBridge", () => {
  it("maps talk gesture pose to body channels", () => {
    const body = talkGesturePoseToBody(
      {
        armLA: 0.5,
        armRA: 0.4,
        bodyAngleX: 0.1,
        bodyAngleY: -0.05,
        bodyAngleZ: 0.08,
        shoulderL: 0.2,
        shoulderR: 0.18,
        handLY: 0.3,
        handRY: 0.25,
      },
      { includeArms: true },
    );
    expect(body.armLiftL).toBeGreaterThan(0.15);
    expect(body.armLiftR).toBeGreaterThan(0.12);
    expect(body.leanY).toBeLessThan(0);
  });

  it("omits arm channels unless includeArms is true", () => {
    const body = talkGesturePoseToBody({ armLA: 0.9, armRA: 0.8 });
    expect(body.armLiftL).toBeUndefined();
    expect(body.armLiftR).toBeUndefined();
  });

  it("blends poses with weight", () => {
    const out = blendBodyPoses({ armLiftL: 0.2 }, { armLiftL: 0.8 }, 0.5);
    expect(out.armLiftL).toBeCloseTo(0.5, 2);
  });

  it("samples continuous talk motion without arms by default", () => {
    const a = sampleBodyTalkMotion(0, { style: "wave", speechEnergy: 0.8 });
    const b = sampleBodyTalkMotion(0.5, { style: "wave", speechEnergy: 0.8 });
    expect(a.style).toBe("wave");
    expect(a.body.armLiftL).toBeUndefined();
    expect(b.body.leanY).toBeDefined();
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
