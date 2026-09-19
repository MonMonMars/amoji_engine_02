import { describe, expect, it } from "vitest";
import {
  idleLifeClipPoolForGender,
  idleShowcasePoolForGender,
  pickIdleShowcase,
} from "../engine/companion/companionActionChoreography.js";
import {
  idleGenderBodyProfile,
  normalizeIdleGender,
  PROCEDURAL_IDLE_BEAT_POOL_FEMALE,
  PROCEDURAL_IDLE_BEAT_POOL_MALE,
  proceduralIdleBeatPoolForGender,
  pickRandomProceduralIdleBeat,
} from "../engine/companion/companionIdleGender.js";
import {
  pickProceduralIdleBeat,
  sampleIdleBodyMotion,
} from "../engine/companion/companionIdleMotion.js";

describe("companionIdleGender", () => {
  it("normalizes gender keys", () => {
    expect(normalizeIdleGender("male")).toBe("male");
    expect(normalizeIdleGender("boy")).toBe("male");
    expect(normalizeIdleGender("female")).toBe("female");
    expect(normalizeIdleGender(undefined)).toBe("female");
  });

  it("uses different procedural beat pools for male and female", () => {
    expect(proceduralIdleBeatPoolForGender("female")).toEqual(
      PROCEDURAL_IDLE_BEAT_POOL_FEMALE,
    );
    expect(proceduralIdleBeatPoolForGender("male")).toEqual(
      PROCEDURAL_IDLE_BEAT_POOL_MALE,
    );
    expect(PROCEDURAL_IDLE_BEAT_POOL_FEMALE).toContain("hair");
    expect(PROCEDURAL_IDLE_BEAT_POOL_MALE).toContain("pocket");
    expect(pickProceduralIdleBeat(5, "female")).toBe("tilt");
    expect(pickProceduralIdleBeat(5, "male")).toBe("pocket");
  });

  it("samples different idle sway for male vs female", () => {
    const female = sampleIdleBodyMotion(1.4, { gender: "female" });
    const male = sampleIdleBodyMotion(1.4, { gender: "male" });
    expect(Math.abs(female.headZ)).toBeGreaterThan(Math.abs(male.headZ));
    expect(female.upperLegL).toBeLessThan(male.upperLegL);
  });

  it("rotates gender-specific idle life clips", () => {
    const femalePool = idleLifeClipPoolForGender("female");
    const malePool = idleLifeClipPoolForGender("male");
    expect(femalePool).toContain("curtsy");
    expect(femalePool).toContain("fingerheart");
    expect(malePool).toContain("handshake");
    expect(malePool).toContain("superhero");
    expect(femalePool.length).toBeGreaterThan(20);
    expect(malePool.length).toBeGreaterThan(20);

    const femalePick = pickIdleShowcase(null, femalePool, "female");
    const malePick = pickIdleShowcase(null, malePool, "male");
    expect(femalePool).toContain(femalePick);
    expect(malePool).toContain(malePick);
  });

  it("keeps expanded gender showcase pools", () => {
    expect(idleShowcasePoolForGender("female").length).toBeGreaterThan(40);
    expect(idleShowcasePoolForGender("male").length).toBeGreaterThan(40);
  });

  it("picks random beats only from the gender pool", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(PROCEDURAL_IDLE_BEAT_POOL_MALE).toContain(
        pickRandomProceduralIdleBeat("male"),
      );
      expect(PROCEDURAL_IDLE_BEAT_POOL_FEMALE).toContain(
        pickRandomProceduralIdleBeat("female"),
      );
    }
  });

  it("tunes male body profile for wider stance", () => {
    const male = idleGenderBodyProfile("male");
    const female = idleGenderBodyProfile("female");
    expect(male.legSpread).toBeGreaterThan(female.legSpread);
    expect(male.swayMul).toBeLessThan(female.swayMul);
  });
});
