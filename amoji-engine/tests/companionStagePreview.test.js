import { describe, expect, it } from "vitest";
import { createCompanionStagePreview } from "../engine/companion/companionStagePreview.js";

describe("companionStagePreview", () => {
  it("does not show a full-screen portrait while 3D loads", () => {
    if (typeof document === "undefined") return;
    const stage = document.createElement("div");
    stage.className = "stage";
    const preview = createCompanionStagePreview(stage);
    expect(preview.show("/prototypes/assets/companion-char-nova.png")).toBe(false);
    const img = stage.querySelector(".avatar-stage-preview");
    expect(img?.hidden).toBe(true);
    expect(stage.classList.contains("has-stage-preview")).toBe(false);
    preview.destroy();
  });
});
