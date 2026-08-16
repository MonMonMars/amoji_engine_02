import { describe, expect, it } from "vitest";
import { EMOJIS } from "./emojiData";
import {
  addToComposition,
  countByCategory,
  emptyComposition,
  MAX_COMPOSITION_SLOTS,
  removeFromComposition,
  renderComposition,
  scoreEmoji,
  searchEmojis,
} from "./engine";

const fire = EMOJIS.find((e) => e.char === "🔥")!;

describe("scoreEmoji", () => {
  it("gives every emoji a positive score for an empty query", () => {
    expect(scoreEmoji(fire, "")).toBeGreaterThan(0);
  });

  it("ranks exact name matches above partial keyword matches", () => {
    const exact = scoreEmoji(fire, "fire");
    const partial = scoreEmoji(fire, "fi");
    expect(exact).toBeGreaterThan(partial);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreEmoji(fire, "spreadsheet")).toBe(0);
  });

  it("matches on a literal emoji character", () => {
    expect(scoreEmoji(fire, "🔥")).toBeGreaterThan(0);
  });
});

describe("searchEmojis", () => {
  it("returns the whole catalog for an empty query", () => {
    expect(searchEmojis("")).toHaveLength(EMOJIS.length);
  });

  it("finds emojis by keyword", () => {
    const results = searchEmojis("love");
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((e) => e.char)).toContain("❤️");
  });

  it("respects the category filter", () => {
    const results = searchEmojis("", { category: "food" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.category === "food")).toBe(true);
  });

  it("honors the result limit", () => {
    expect(searchEmojis("", { limit: 3 })).toHaveLength(3);
  });

  it("returns an empty array for no matches", () => {
    expect(searchEmojis("zzzznotanemoji")).toEqual([]);
  });

  it("orders the best match first", () => {
    const results = searchEmojis("rocket");
    expect(results[0]?.char).toBe("🚀");
  });
});

describe("countByCategory", () => {
  it("totals to the full catalog size", () => {
    const total = countByCategory().reduce((sum, c) => sum + c.count, 0);
    expect(total).toBe(EMOJIS.length);
  });
});

describe("composition", () => {
  it("adds and renders emojis in order", () => {
    let comp = emptyComposition();
    comp = addToComposition(comp, "🔥");
    comp = addToComposition(comp, "🚀");
    expect(renderComposition(comp)).toBe("🔥🚀");
  });

  it("caps the composition at the maximum slot count", () => {
    let comp = emptyComposition();
    for (let i = 0; i < MAX_COMPOSITION_SLOTS + 5; i++) {
      comp = addToComposition(comp, "⭐");
    }
    expect(comp.slots).toHaveLength(MAX_COMPOSITION_SLOTS);
  });

  it("removes an emoji by index", () => {
    let comp = emptyComposition();
    comp = addToComposition(comp, "🔥");
    comp = addToComposition(comp, "🚀");
    comp = removeFromComposition(comp, 0);
    expect(renderComposition(comp)).toBe("🚀");
  });

  it("ignores out-of-range removals", () => {
    let comp = emptyComposition();
    comp = addToComposition(comp, "🔥");
    comp = removeFromComposition(comp, 9);
    expect(renderComposition(comp)).toBe("🔥");
  });
});
