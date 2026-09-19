import { describe, expect, it } from "vitest";
import {
  COMPANION_PREVIEW_FALLBACK,
  isMostlyBlackPreviewImage,
} from "../engine/companion/companionPreviewFallback.js";

describe("companionPreviewFallback", () => {
  it("detects mostly black preview images in browser", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, 64, 64);
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    return new Promise((resolve) => {
      img.onload = () => {
        expect(isMostlyBlackPreviewImage(img)).toBe(true);
        resolve();
      };
    });
  });

  it("keeps normal preview images", () => {
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, "#8b7cf8");
    grad.addColorStop(1, "#5eead4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/png");
    return new Promise((resolve) => {
      img.onload = () => {
        expect(isMostlyBlackPreviewImage(img)).toBe(false);
        resolve();
      };
    });
  });

  it("exports fallback path", () => {
    expect(COMPANION_PREVIEW_FALLBACK).toMatch(/companion-girl-ref\.png$/);
  });
});
