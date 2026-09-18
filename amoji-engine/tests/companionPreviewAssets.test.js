import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import {
  BLACK_LOADER_BYTES,
  companionPreviewPath,
  isBadPreviewCapture,
  isCompanionPreviewOk,
} from "../engine/companion/companionPreviewAssets.mjs";
import { CHARACTER_IDS } from "../engine/companion/companionCharacterCatalog.js";

describe("companionPreviewAssets", () => {
  it("flags black loader captures", () => {
    expect(BLACK_LOADER_BYTES).toBe(333412);
    expect(isBadPreviewCapture("/path/missing.png")).toBe(true);
  });

  it("has valid PNG for every roster id", () => {
    for (const id of CHARACTER_IDS) {
      const path = companionPreviewPath(id);
      expect(existsSync(path), `${id} missing`).toBe(true);
      expect(isCompanionPreviewOk(id), `${id} bad size ${statSync(path).size}`).toBe(true);
    }
  });
});
