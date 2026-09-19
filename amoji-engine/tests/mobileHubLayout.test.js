import { describe, expect, it } from "vitest";
import {
  mobileHubCardDefs,
  orderHubCardsForRole,
} from "../engine/mobile/mobileHubLayout.js";

describe("mobileHubLayout", () => {
  it("puts pet first when role preset hubPrimary is pet", () => {
    const cards = mobileHubCardDefs(true, {
      role: "pet",
      chaseHighScore: 0,
      chaseStreakDays: 0,
    });
    const ordered = orderHubCardsForRole(cards, "pet");
    expect(ordered[0]?.screen).toBe("pet");
  });

  it("includes character picker card with pick=1", () => {
    const cards = mobileHubCardDefs(true, {
      role: "girlfriend",
      chaseHighScore: 10,
      chaseStreakDays: 2,
    });
    const picker = cards.find((c) => c.id === "pick-character");
    expect(picker?.pick).toBe("1");
    expect(picker?.screen).toBe("companion");
  });
});
