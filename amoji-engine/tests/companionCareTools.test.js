import { describe, expect, it } from "vitest";
import { defaultCareToolsPosition } from "../engine/companion/companionCareTools.js";

describe("companionCareTools", () => {
  it("places care tools bottom-left in minimal chrome to avoid menu overlap", () => {
    const pos = defaultCareToolsPosition(390, 844, 44, 44, { minimalChrome: true });
    expect(pos.x).toBeLessThan(100);
    expect(pos.y).toBeGreaterThan(600);
  });

  it("keeps default bottom-right placement outside minimal chrome", () => {
    const pos = defaultCareToolsPosition(390, 844, 44, 44, { minimalChrome: false });
    expect(pos.x).toBeGreaterThan(300);
  });
});
