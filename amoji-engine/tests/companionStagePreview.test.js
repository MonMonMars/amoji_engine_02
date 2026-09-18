import { describe, expect, it } from "vitest";
import { createCompanionStagePreview } from "../engine/companion/companionStagePreview.js";

describe("companionStagePreview", () => {
  it("shows and hides a portrait on the stage", () => {
    if (typeof document === "undefined") return;
    const stage = document.createElement("div");
    stage.className = "stage";
    const preview = createCompanionStagePreview(stage);
    expect(preview.show("/prototypes/assets/companion-char-nova.png")).toBe(true);
    const img = stage.querySelector(".avatar-stage-preview");
    expect(img?.hidden).toBe(false);
    expect(stage.classList.contains("has-stage-preview")).toBe(true);
    preview.hide();
    expect(stage.classList.contains("has-stage-preview")).toBe(false);
    preview.destroy();
  });
});
