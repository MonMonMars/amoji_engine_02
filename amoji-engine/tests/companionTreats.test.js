import { describe, expect, it } from "vitest";
import {
  TREAT_ITEMS,
  getTreatItem,
  treatActionId,
  treatThanksLine,
} from "../engine/companion/companionTreatCatalog.js";
import {
  TREAT_START_COINS,
  bagCount,
  buyTreat,
  consumeTreat,
  defaultTreatState,
  normalizeTreatState,
} from "../engine/companion/companionTreatStore.js";
import {
  companionMouthPoint,
  isDropOnCompanion,
  startTreatPerformance,
  TREAT_FEED_DURATION_MS,
} from "../engine/companion/companionTreatInteract.js";

describe("companion treats", () => {
  it("lists food and drinks with eat/drink actions", () => {
    expect(TREAT_ITEMS.length).toBeGreaterThanOrEqual(6);
    expect(getTreatItem("cake")?.emoji).toBe("🍰");
    expect(treatActionId(getTreatItem("cake"))).toBe("eat");
    expect(treatActionId(getTreatItem("milk-tea"))).toBe("drink");
    expect(treatThanksLine(getTreatItem("cake"), false)).toContain("蛋糕");
  });

  it("starts with coins and a cake in the bag", () => {
    const state = defaultTreatState();
    expect(state.coins).toBe(TREAT_START_COINS);
    expect(bagCount(state, "cake")).toBe(1);
  });

  it("buys into the bag and rejects a broke wallet", () => {
    const bought = buyTreat(defaultTreatState(), "cookie");
    expect(bought.ok).toBe(true);
    expect(bought.state.coins).toBe(TREAT_START_COINS - 8);
    expect(bagCount(bought.state, "cookie")).toBe(1);

    const broke = buyTreat({ coins: 2, bag: {} }, "cake");
    expect(broke.ok).toBe(false);
    expect(broke.reason).toBe("broke");
  });

  it("consumes a bag item for feeding", () => {
    const after = consumeTreat(defaultTreatState(), "cake");
    expect(after.ok).toBe(true);
    expect(bagCount(after.state, "cake")).toBe(0);
    expect(consumeTreat(after.state, "cake").reason).toBe("empty");
  });

  it("normalizes junk persisted state", () => {
    const next = normalizeTreatState({ coins: -4, bag: { cake: 2.8, nope: 9 } });
    expect(next.coins).toBe(0);
    expect(next.bag).toEqual({ cake: 3 });
  });

  it("hits the companion drop ellipse and misses the corners", () => {
    const rect = { left: 0, top: 0, width: 400, height: 800 };
    expect(isDropOnCompanion(200, 300, rect)).toBe(true);
    expect(isDropOnCompanion(12, 12, rect)).toBe(false);
    const mouth = companionMouthPoint(rect);
    expect(mouth.x).toBe(200);
    expect(mouth.y).toBeGreaterThan(200);
    expect(mouth.y).toBeLessThan(320);
  });

  it("lists restoratives on every snack", () => {
    for (const item of TREAT_ITEMS) {
      expect(item.hunger).toBeGreaterThan(0);
      expect(item.hearts).toBeGreaterThan(0);
    }
    expect(getTreatItem("bento").hunger).toBeGreaterThan(getTreatItem("cookie").hunger);
  });

  it("plays the stored eat/drink action on the avatar", () => {
    const calls = [];
    const avatar = {
      currentAction: "eat",
      setEmotion(v) {
        calls.push(["emotion", v]);
      },
      setEating(v) {
        calls.push(["eating", v]);
      },
      attachTreatProp(item) {
        calls.push(["prop", item?.id]);
      },
      detachTreatProp() {
        calls.push(["prop-off"]);
      },
      playAction(id, opts) {
        calls.push(["play", id, opts.loop]);
      },
      stopAction() {
        calls.push(["stop"]);
      },
    };
    const stop = startTreatPerformance(avatar, getTreatItem("cake"), {
      durationMs: 1,
    });
    expect(calls).toEqual([
      ["emotion", "happy"],
      ["eating", true],
      ["prop", "cake"],
      ["play", "eat", true],
    ]);
    expect(TREAT_FEED_DURATION_MS).toBeGreaterThan(2000);
    stop();
    expect(calls).toContainEqual(["prop-off"]);
    expect(calls).toContainEqual(["emotion", "neutral"]);
    expect(calls.at(-1)).toEqual(["emotion", "neutral"]);
  });
});
