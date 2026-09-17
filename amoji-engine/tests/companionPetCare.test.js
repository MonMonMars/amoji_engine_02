import { describe, expect, it } from "vitest";
import {
  PET_CHAT_COINS,
  PET_DAILY_COINS,
  PET_FULL_AT,
  PET_HUNGRY_BELOW,
  PET_HUNGER_PER_HOUR,
  PET_START_HUNGER,
  PET_TAP_COINS,
  needPips,
  needTone,
  applyChatCare,
  applyFeedCare,
  applyPetCare,
  canFeedCare,
  checkInCare,
  claimDailyCoins,
  dailyYmd,
  isFull,
  isHungry,
  tickCare,
  tryFeedTreat,
} from "../engine/companion/companionPetCare.js";
import { getTreatItem } from "../engine/companion/companionTreatCatalog.js";
import {
  bagCount,
  consumeTreat,
  defaultTreatState,
  normalizeTreatState,
} from "../engine/companion/companionTreatStore.js";

describe("companion pet care loop", () => {
  it("starts a bit hungry so the first feed matters", () => {
    const state = defaultTreatState(1_700_000_000_000);
    expect(state.hunger).toBe(PET_START_HUNGER);
    expect(state.hunger).toBeLessThan(70);
    expect(state.hearts).toBeGreaterThan(50);
    expect(isHungry(state)).toBe(false);
    expect(isFull(state)).toBe(false);
  });

  it("decays hunger over real time like Pou (~6h to empty)", () => {
    const t0 = 1_700_000_000_000;
    const afterHour = tickCare({ hunger: 80, hearts: 80, lastTickMs: t0 }, t0 + 3_600_000);
    expect(afterHour.hunger).toBeCloseTo(80 - PET_HUNGER_PER_HOUR, 5);
    const empty = tickCare({ hunger: 80, hearts: 80, lastTickMs: t0 }, t0 + 6 * 3_600_000);
    expect(empty.hunger).toBe(0);
    expect(empty.hearts).toBeGreaterThanOrEqual(0);
  });

  it("meals fill hunger, desserts fill hearts", () => {
    const t0 = 1_700_000_000_000;
    const care = { hunger: 40, hearts: 50, lastTickMs: t0 };
    const bento = applyFeedCare(care, getTreatItem("bento"), t0);
    expect(bento.ok).toBe(true);
    expect(bento.care.hunger).toBe(78);
    const cake = applyFeedCare({ hunger: 40, hearts: 50, lastTickMs: t0 }, getTreatItem("cake"), t0);
    expect(cake.care.hearts).toBe(78);
    expect(cake.care.hunger).toBe(54);
  });

  it("refuses food when full and keeps the bag item", () => {
    const t0 = 1_700_000_000_000;
    const state = {
      ...defaultTreatState(t0),
      hunger: PET_FULL_AT,
      lastTickMs: t0,
      bag: { cake: 1 },
    };
    expect(canFeedCare(state, "cake", t0).reason).toBe("full");
    const result = tryFeedTreat(state, "cake", consumeTreat, t0);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("full");
    expect(bagCount(result.state, "cake")).toBe(1);
  });

  it("refuses the same snack again while not hungry", () => {
    const t0 = 1_700_000_000_000;
    const first = applyFeedCare(
      { hunger: 60, hearts: 50, lastTickMs: t0 },
      getTreatItem("cookie"),
      t0,
    );
    expect(first.ok).toBe(true);
    const again = canFeedCare(first.care, "cookie", t0 + 10_000);
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("same");
    const hungryAgain = canFeedCare(
      { ...first.care, hunger: 20 },
      "cookie",
      t0 + 10_000,
    );
    expect(hungryAgain.ok).toBe(true);
  });

  it("pays daily coins once per calendar day", () => {
    const t0 = Date.parse("2026-09-17T08:00:00.000Z");
    const first = claimDailyCoins({ lastTickMs: t0, lastDailyYmd: "" }, 10, t0);
    expect(first.claimed).toBe(true);
    expect(first.coins).toBe(10 + PET_DAILY_COINS);
    expect(first.care.lastDailyYmd).toBe(dailyYmd(t0));
    const second = claimDailyCoins(first.care, first.coins, t0 + 60_000);
    expect(second.claimed).toBe(false);
    expect(second.coins).toBe(first.coins);
  });

  it("chat and petting earn coins and restore hearts", () => {
    const t0 = 1_700_000_000_000;
    const chat = applyChatCare({ hunger: 40, hearts: 40, lastTickMs: t0 }, 10, t0);
    expect(chat.earned).toBe(PET_CHAT_COINS);
    expect(chat.coins).toBe(13);
    expect(chat.care.hearts).toBeGreaterThan(40);
    const pet = applyPetCare(chat.care, chat.coins, t0);
    expect(pet.earned).toBe(PET_TAP_COINS);
    expect(pet.care.hearts).toBeGreaterThan(chat.care.hearts);
  });

  it("check-in asks for food when hungry", () => {
    const t0 = 1_700_000_000_000;
    const check = checkInCare(
      { hunger: PET_HUNGRY_BELOW - 4, hearts: 70, lastTickMs: t0, lastDailyYmd: dailyYmd(t0) },
      20,
      { isEnglish: true, now: t0 },
    );
    expect(check.mood).toBe("hungry");
    expect(check.line).toMatch(/hungry/i);
    expect(check.claimedDaily).toBe(false);
  });

  it("migrates old treat saves into care fields", () => {
    const next = normalizeTreatState({ coins: 12, bag: { cookie: 2 } }, 1_700_000_000_000);
    expect(next.coins).toBe(12);
    expect(next.bag).toEqual({ cookie: 2 });
    expect(next.hunger).toBe(PET_START_HUNGER);
    expect(next.hearts).toBeGreaterThan(0);
    expect(next.lastTickMs).toBe(1_700_000_000_000);
  });

  it("maps needs to Tamagotchi pips and Pou color bands", () => {
    expect(needPips(0)).toBe(0);
    expect(needPips(40)).toBe(2);
    expect(needPips(100)).toBe(5);
    expect(needTone(18, "hunger")).toBe("low");
    expect(needTone(40, "hunger")).toBe("mid");
    expect(needTone(80, "hearts")).toBe("ok");
  });
});
