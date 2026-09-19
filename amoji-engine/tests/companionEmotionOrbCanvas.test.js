import { describe, expect, it } from "vitest";
import {
  buildSpectrumLevels,
  clamp,
  drawEmotionOrbFrame,
  drawOrbRobotFace,
  EMOTION_ORB_FACE_PROFILES,
  lerpHue,
  normalizeOrbEmotion,
  prefersReducedMotion,
  resolveCloudOrbPalette,
  resolveOrbFaceProfile,
  sampleOrganicBlobRadius,
  smoothStep,
} from "../engine/companion/companionEmotionOrbCanvas.js";

/** Minimal canvas ctx stub for draw tests. */
function mockOrbCtx() {
  const ops = [];
  return {
    ops,
    clearRect() {
      ops.push("clear");
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "",
    beginPath() {
      ops.push("path");
    },
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {
      ops.push("arc");
    },
    ellipse() {
      ops.push("ellipse");
    },
    fill() {},
    stroke() {
      ops.push("stroke");
    },
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
    globalCompositeOperation: "source-over",
  };
}

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

  it("maps gel hues to airy cloud palette when idle", () => {
    const cloud = resolveCloudOrbPalette(38, 88, 58, { live: false });
    expect(cloud.light).toBeGreaterThan(80);
    expect(cloud.sat).toBeLessThan(50);
    expect(cloud.mistLight).toBeGreaterThan(cloud.light);
  });

  it("keeps richer saturation in live ChatGPT mode", () => {
    const live = resolveCloudOrbPalette(212, 72, 50, { live: true, emotion: "happy" });
    const idle = resolveCloudOrbPalette(212, 72, 50, { live: false });
    expect(live.sat).toBeGreaterThan(idle.sat);
    expect(live.coreLight).toBeGreaterThan(80);
  });

  it("normalizes emotions and exposes face profiles", () => {
    expect(normalizeOrbEmotion("joy")).toBe("happy");
    expect(resolveOrbFaceProfile("sad").blobSkewY).toBeGreaterThan(0);
    expect(EMOTION_ORB_FACE_PROFILES.surprised.eyeSize).toBeGreaterThan(
      EMOTION_ORB_FACE_PROFILES.neutral.eyeSize,
    );
  });

  it("deforms blob radius with volume and emotion", () => {
    const quiet = sampleOrganicBlobRadius(0, { volume: 0.05, emotion: "neutral" });
    const loud = sampleOrganicBlobRadius(0, { volume: 0.9, emotion: "happy" });
    expect(loud).toBeGreaterThan(quiet);
    const sad = sampleOrganicBlobRadius(Math.PI / 2, { emotion: "sad", volume: 0.3 });
    const happy = sampleOrganicBlobRadius(Math.PI / 2, { emotion: "happy", volume: 0.3 });
    expect(sad).not.toBe(happy);
  });

  it("draws orb frame with robot face without throwing", () => {
    const ctx = mockOrbCtx();
    drawEmotionOrbFrame(ctx, 120, 120, {
      time: 0.5,
      volume: 0.6,
      hue: 38,
      sat: 80,
      light: 58,
      state: "speaking",
      emotion: "happy",
      live: true,
      face: true,
    });
    expect(ctx.ops).toContain("clear");
    expect(ctx.ops).toContain("ellipse");
  });

  it("clips the compact chip orb to a circle", () => {
    const ctx = mockOrbCtx();
    drawEmotionOrbFrame(ctx, 36, 36, {
      time: 0.8,
      volume: 0.7,
      hue: 212,
      sat: 72,
      light: 50,
      state: "listening",
      emotion: "neutral",
      compact: true,
      squash: 1.08,
      spin: 0.4,
      live: true,
      face: true,
    });
    expect(ctx.ops).toContain("clip");
    expect(ctx.ops.indexOf("clip")).toBeGreaterThan(ctx.ops.indexOf("save"));
    expect(ctx.ops).toContain("restore");
  });

  it("draws standalone robot face layer", () => {
    const ctx = mockOrbCtx();
    drawOrbRobotFace(ctx, 24, 24, 20, {
      emotion: "surprised",
      volume: 0.75,
      state: "speaking",
      time: 0.3,
      compact: true,
    });
    expect(ctx.ops.filter((o) => o === "ellipse").length).toBeGreaterThanOrEqual(2);
  });

  it("reads the reduced-motion preference", () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });
});
