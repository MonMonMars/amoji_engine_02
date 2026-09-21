import { describe, expect, it } from "vitest";
import {
  pokeShakeEnvelope,
  pokeSideBiasFromPoint,
  samplePokeShakePose,
} from "../engine/companion/companionPokeBody.js";

describe("companionPokeBody", () => {
  it("pokeShakeEnvelope peaks then decays", () => {
    expect(pokeShakeEnvelope(-0.1)).toBe(0);
    expect(pokeShakeEnvelope(0.08)).toBeGreaterThan(0.5);
    expect(pokeShakeEnvelope(0.7)).toBe(0);
  });

  it("samplePokeShakePose omits leg channels", () => {
    const pose = samplePokeShakePose(0.12, { strength: 1, sideBias: 1 });
    expect(pose.upperLegL).toBeUndefined();
    expect(Math.abs(pose.spineX || 0)).toBeGreaterThan(0.01);
    expect(Math.abs(pose.headZ || 0)).toBeGreaterThan(0.01);
  });

  it("pokeSideBiasFromPoint picks left vs right of anchor", () => {
    expect(pokeSideBiasFromPoint({ x: 0.2 }, 0)).toBe(1);
    expect(pokeSideBiasFromPoint({ x: -0.2 }, 0)).toBe(-1);
    expect(pokeSideBiasFromPoint({ x: 0.01 }, 0)).toBe(0);
  });
});
