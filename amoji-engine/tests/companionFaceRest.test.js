import { describe, expect, it } from "vitest";
import {
  clampRestFaceBlend,
  IDLE_HAPPY_MAX,
  mouthVisemeWeight,
  TALK_HAPPY_MAX,
} from "../engine/companion/companionFaceRest.js";

describe("companionFaceRest", () => {
  it("closes visemes when not talking", () => {
    expect(mouthVisemeWeight(false, 0.9)).toBe(0);
    expect(mouthVisemeWeight(true, 0.01)).toBe(0);
    expect(mouthVisemeWeight(true, 0.6)).toBeCloseTo(0.6);
  });

  it("drops Relaxed so idle lids stay open", () => {
    const clamped = clampRestFaceBlend(
      { Relaxed: 0.6, Happy: 0.98, Sad: 0.2 },
      { talking: false },
    );
    expect(clamped.Relaxed).toBeUndefined();
    expect(clamped.Happy).toBeLessThanOrEqual(IDLE_HAPPY_MAX);
    expect(clamped.Sad).toBeCloseTo(0.2);
  });

  it("caps Happy while talking so visemes can move the jaw", () => {
    const clamped = clampRestFaceBlend({ Happy: 0.98, Surprised: 0.48 }, {
      talking: true,
    });
    expect(clamped.Happy).toBeLessThanOrEqual(TALK_HAPPY_MAX);
    expect(clamped.Surprised).toBeLessThanOrEqual(0.28);
  });
});
