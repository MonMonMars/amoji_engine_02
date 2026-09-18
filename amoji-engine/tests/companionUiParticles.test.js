import { describe, expect, it } from "vitest";
import { spawnUiParticles, spawnUiRingBurst } from "../engine/companion/companionUiParticles.js";

describe("companionUiParticles", () => {
  it("spawns sparkle nodes at a screen point", () => {
    if (typeof document === "undefined") return;
    const before = document.querySelectorAll(".ui-fx-particle-layer").length;
    const count = spawnUiParticles({ x: 120, y: 240, count: 6 });
    expect(count).toBe(6);
    expect(document.querySelectorAll(".ui-fx-particle-layer").length).toBe(before + 1);
    expect(document.querySelectorAll(".ui-fx-particle").length).toBeGreaterThanOrEqual(6);
  });

  it("spawns ring burst centered on an element", () => {
    if (typeof document === "undefined") return;
    const el = document.createElement("button");
    el.getBoundingClientRect = () => ({ left: 100, top: 80, width: 40, height: 40 });
    document.body.appendChild(el);
    const before = document.querySelectorAll(".ui-fx-particle-layer").length;
    spawnUiRingBurst(el, { hue: 258 });
    expect(document.querySelectorAll(".ui-fx-particle-layer").length).toBe(before + 1);
    el.remove();
  });
});
