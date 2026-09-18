import { describe, expect, it } from "vitest";
import { spawnUiParticles } from "../engine/companion/companionUiParticles.js";

describe("companionUiParticles", () => {
  it("spawns sparkle nodes at a screen point", () => {
    if (typeof document === "undefined") return;
    const before = document.querySelectorAll(".ui-fx-particle-layer").length;
    const count = spawnUiParticles({ x: 120, y: 240, count: 6 });
    expect(count).toBe(6);
    expect(document.querySelectorAll(".ui-fx-particle-layer").length).toBe(before + 1);
    expect(document.querySelectorAll(".ui-fx-particle").length).toBeGreaterThanOrEqual(6);
  });
});
