import { describe, expect, it } from "vitest";
import {
  buildShopChromeLabels,
  formatProductPrice,
  COMPANION_WEB_SHOP_SCHEMA,
} from "../engine/companion/companionWebShop.js";

describe("companionWebShop", () => {
  it("exports schema", () => {
    expect(COMPANION_WEB_SHOP_SCHEMA).toMatch(/amoji\.companionWebShop/);
  });

  it("builds bilingual shop labels", () => {
    expect(buildShopChromeLabels(true).sectionTitle).toContain("Shop");
    expect(buildShopChromeLabels(false).buy).toBe("購買");
  });

  it("formats USD prices", () => {
    expect(formatProductPrice({ priceUsd: 6.99 })).toBe("$6.99");
  });
});
