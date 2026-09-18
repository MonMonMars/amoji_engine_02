import { describe, expect, it } from "vitest";
import {
  buildSpectrumLevels,
  clamp,
  drawEmotionOrbFrame,
  lerpHue,
  prefersReducedMotion,
  resolveCloudOrbPalette,
  smoothStep,
} from "../engine/companion/companionEmotionOrbCanvas.js";

describe("companionEmotionOrbCanvas", () => {
  it("clamps and smooths volume", () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(smoothStep(0, 1, 0.5)).toBe(0.5);
    expect(lerpHue(10, 350, 0.5)).toBeCloseTo(0, 5);
    expect(lerpHue(350, 10, 1)).toBeCloseTo(10, 5);
  });

  it("builds spectrum bar levels from volume", () => {
    const levels = buildSpectrumLevels([], 0.8, 1.2, 8);
    expect(levels).toHaveLength(8);
    expect(levels.every((v) => v >= 0.06 && v <= 0.82)).toBe(true);
  });

  it("maps gel hues to airy cloud palette", () => {
    const cloud = resolveCloudOrbPalette(38, 88, 58);
    expect(cloud.light).toBeGreaterThan(80);
    expect(cloud.sat).toBeLessThan(50);
    expect(cloud.mistLight).toBeGreaterThan(cloud.light);
  });

  it("draws orb frame without throwing", () => {
    const calls = [];
    const ctx = {
      clearRect() {
        calls.push("clear");
      },
      createRadialGradient() {
        return {
          addColorStop() {},
        };
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      beginPath() {
        calls.push("path");
      },
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      fill() {},
      stroke() {},
      save() {},
      restore() {},
      clip() {},
      rotate() {},
      scale() {},
      translate() {},
    };
    drawEmotionOrbFrame(ctx, 120, 120, {
      time: 0.5,
      volume: 0.6,
      hue: 38,
      sat: 80,
      light: 58,
      state: "speaking",
    });
    expect(calls.length).toBeGreaterThan(0);
    const compactCalls = [];
    const compactCtx = {
      ...ctx,
      beginPath() {
        compactCalls.push("path");
      },
      clearRect() {
        compactCalls.push("clear");
      },
    };
    drawEmotionOrbFrame(compactCtx, 48, 48, {
      time: 0.5,
      volume: 0.6,
      hue: 38,
      sat: 80,
      light: 58,
      state: "speaking",
      compact: true,
    });
    expect(compactCalls).toContain("clear");
  });

  it("clips the compact chip orb to a circle", () => {
    const ops = [];
    const ctx = {
      clearRect() {
        ops.push("clear");
      },
      createRadialGradient() {
        return { addColorStop() {} };
      },
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      beginPath() {
        ops.push("path");
      },
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {
        ops.push("arc");
      },
      ellipse() {},
      fill() {},
      stroke() {},
      save() {
        ops.push("save");
      },
      restore() {
        ops.push("restore");
      },
      clip() {
        ops.push("clip");
      },
      rotate() {},
      scale() {},
      translate() {},
    };
    drawEmotionOrbFrame(ctx, 36, 36, {
      time: 0.8,
      volume: 0.7,
      hue: 38,
      sat: 88,
      light: 58,
      state: "speaking",
      compact: true,
      squash: 1.08,
      spin: 0.4,
    });
    expect(ops).toContain("clip");
    expect(ops.indexOf("clip")).toBeGreaterThan(ops.indexOf("save"));
    expect(ops).toContain("restore");
  });

  it("reads the reduced-motion preference", () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
});
