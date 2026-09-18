import { describe, expect, it } from "vitest";
import { createCompanionUiAudio } from "../engine/companion/companionUiAudio.js";

describe("companionUiAudio", () => {
  it("creates a procedural sfx player", () => {
    const audio = createCompanionUiAudio({ volume: 0.5, haptics: false });
    expect(audio.schema).toContain("companionUiAudio");
    audio.setReducedMotion(true);
    expect(audio.play("tap")).toBe(false);
    audio.setReducedMotion(false);
    expect(audio.play("send")).toBe(true);
    expect(audio.play("mic-on")).toBe(true);
    audio.setVolume(0);
    expect(audio.play("tap")).toBe(false);
  });
});
