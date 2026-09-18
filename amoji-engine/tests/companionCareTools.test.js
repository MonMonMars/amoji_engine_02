import { describe, expect, it } from "vitest";
import {
  careToolsPlacementHints,
  defaultCareToolsPosition,
} from "../engine/companion/companionCareTools.js";

describe("companionCareTools", () => {
  it("places care tools bottom-right above composer on phones", () => {
    const pos = defaultCareToolsPosition(390, 844, 44, 44, { minimalChrome: true });
    expect(pos.x).toBeGreaterThan(300);
    expect(pos.y).toBeGreaterThan(560);
    expect(pos.y).toBeLessThan(760);
  });

  it("keeps default bottom-right placement outside minimal chrome", () => {
    const pos = defaultCareToolsPosition(390, 844, 44, 44, { minimalChrome: false });
    expect(pos.x).toBeGreaterThan(300);
  });

  it("flips menu below when the toggle sits near the top", () => {
    const hints = careToolsPlacementHints(320, 120, 390, 844, 44);
    expect(hints.menuBelow).toBe(true);
    expect(hints.nearRight).toBe(true);
  });
});
