import { describe, expect, it } from "vitest";
import { listCompanionCharacters } from "../engine/companion/companionCharacterCatalog.js";
import { companionCardInnerHtml } from "../engine/companion/companionCharacterPicker.js";

describe("companion start picker", () => {
  it("renders compact card html without tagline block", () => {
    const html = companionCardInnerHtml(
      {
        id: "amoji",
        name: "Amoji",
        tagline: "Playful friend",
        traits: ["warm", "witty"],
        previewImage: "/prototypes/assets/amoji-preview.png",
        accent: "#7fd4cf",
        badge: null,
      },
      { compact: true, selectedId: "amoji" },
    );
    expect(html).toContain("companion-card-portrait");
    expect(html).toContain("Amoji");
    expect(html).not.toContain("companion-card-tagline");
  });

  it("lists enough characters for the start grid", () => {
    const list = listCompanionCharacters("en");
    expect(list.length).toBeGreaterThanOrEqual(4);
    const html = companionCardInnerHtml(list[0], {
      compact: true,
      selectedId: list[0].id,
    });
    expect(html).toContain(list[0].name);
  });
});
