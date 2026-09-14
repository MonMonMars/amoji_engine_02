import { describe, expect, it } from "vitest";
import {
  PLAYABLE_ACTIONS,
  inferActionFromCatalogText,
  resolveAction,
} from "../engine/companion/companionActionCatalog.js";
import {
  inferActionFromUserText,
  sampleActionBodyPose,
} from "../engine/companion/companionActionMotion.js";

describe("companionActionCatalog", () => {
  it("lists many playable actions", () => {
    expect(PLAYABLE_ACTIONS.length).toBeGreaterThan(20);
    expect(PLAYABLE_ACTIONS).toContain("dance");
    expect(PLAYABLE_ACTIONS).toContain("bow");
    expect(PLAYABLE_ACTIONS).toContain("clap");
  });

  it("resolves aliases and fuzzy tags", () => {
    expect(resolveAction("dancing")).toBe("dance");
    expect(resolveAction("martialarts")).toBe("kungfu");
    expect(resolveAction("backflip")).toBe("spin");
    expect(resolveAction("applause")).toBe("clap");
  });

  it("infers actions from Cantonese and English user text", () => {
    expect(inferActionFromCatalogText("跳一下")).toBe("jump");
    expect(inferActionFromCatalogText("please bow to me")).toBe("bow");
    expect(inferActionFromCatalogText("拍手")).toBe("clap");
    expect(inferActionFromCatalogText("做瑜伽")).toBe("yoga");
    expect(inferActionFromUserText("moonwalk please")).toBe("moonwalk");
  });

  it("samples non-empty poses for new actions", () => {
    for (const id of ["dance", "bow", "clap", "sit", "angry", "hug"]) {
      const pose = sampleActionBodyPose(id, 0.5, 0.8);
      expect(Object.keys(pose).length).toBeGreaterThan(0);
    }
  });
});
