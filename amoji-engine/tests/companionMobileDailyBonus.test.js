import { describe, expect, it } from "vitest";
import {
  PREMIUM_DAILY_CLAIM_KEY,
  tryClaimPremiumDailyCoins,
} from "../engine/mobile/companionMobileDailyBonus.js";

describe("companionMobileDailyBonus", () => {
  it("grants coins once per day for premium users", () => {
    const storage = {
      data: {},
      getItem(k) {
        return this.data[k] ?? null;
      },
      setItem(k, v) {
        this.data[k] = v;
      },
    };
    const treats = { coins: 10, hearts: 50, bag: {} };
    const first = tryClaimPremiumDailyCoins(
      { premium: true, dailyBonusCoins: 40 },
      treats,
      storage,
    );
    expect(first.claimed).toBe(true);
    expect(first.state.coins).toBe(50);
    const second = tryClaimPremiumDailyCoins(
      { premium: true, dailyBonusCoins: 40 },
      first.state,
      storage,
    );
    expect(second.claimed).toBe(false);
    expect(storage.data[PREMIUM_DAILY_CLAIM_KEY]).toBeTruthy();
  });
});
