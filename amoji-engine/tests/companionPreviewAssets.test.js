import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import {
  BLACK_LOADER_BYTES,
  TINY_BLACK_PREVIEW_BYTES,
  COMPANION_PREVIEW_FALLBACK,
  companionPreviewImgOnErrorAttr,
  companionPreviewPath,
  isBadPreviewCapture,
  isCompanionPreviewOk,
  isSuspectPreviewCapture,
  SUSPECT_PREVIEW_BYTES,
} from "../engine/companion/companionPreviewAssets.mjs";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";

describe("companionPreviewAssets", () => {
  it("flags black loader captures", () => {
    expect(BLACK_LOADER_BYTES).toBe(333412);
    expect(TINY_BLACK_PREVIEW_BYTES).toBe(61136);
    expect(isBadPreviewCapture("/path/missing.png")).toBe(true);
  });

  it("exposes preview fallback helpers", () => {
    expect(COMPANION_PREVIEW_FALLBACK).toMatch(/companion-girl-ref\.png$/);
    expect(companionPreviewImgOnErrorAttr()).toContain(COMPANION_PREVIEW_FALLBACK);
  });

  it("has valid PNG for every roster id", () => {
    for (const id of CHARACTER_IDS) {
      const path = companionPreviewPath(id);
      expect(existsSync(path), `${id} missing`).toBe(true);
      expect(isCompanionPreviewOk(id), `${id} bad size ${statSync(path).size}`).toBe(true);
    }
  });

  it("flags sparse full-body card captures below suspect threshold", () => {
    expect(SUSPECT_PREVIEW_BYTES).toBeGreaterThan(120000);
    const elioPath = companionPreviewPath("elio");
    if (existsSync(elioPath)) {
      const size = statSync(elioPath).size;
      expect(
        isSuspectPreviewCapture(elioPath),
        `elio card should not be sparse (${size} bytes)`,
      ).toBe(false);
    }
  });
});
