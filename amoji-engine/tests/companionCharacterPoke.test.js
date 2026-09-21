import { describe, expect, it } from "vitest";
import { pickCharacterPokeReaction } from "../engine/companion/companionCharacterPoke.js";

describe("companionCharacterPoke", () => {
  it("returns a short blip and follow-up for each character", () => {
    const { blip, followUp } = pickCharacterPokeReaction("kizuna", true);
    expect(blip.length).toBeLessThan(12);
    expect(followUp.length).toBeGreaterThan(3);
  });

  it("uses character-specific blips when defined", () => {
    const samples = new Set();
    for (let i = 0; i < 12; i += 1) {
      samples.add(pickCharacterPokeReaction("nova", true).blip);
    }
    expect(samples.has("Oh.")).toBe(true);
  });

  it("supports Cantonese poke lines", () => {
    const { blip, followUp } = pickCharacterPokeReaction("mei", false);
    expect(blip).toMatch(/[\u4e00-\u9fff！？～]/);
    expect(followUp).toMatch(/[\u4e00-\u9fff！？～]/);
  });
});
