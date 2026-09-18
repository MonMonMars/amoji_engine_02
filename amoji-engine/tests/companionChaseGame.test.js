import { describe, expect, it } from "vitest";
import {
  applyChaseResult,
  chaseDifficultyConfig,
  defaultChaseSave,
  normalizeChaseSave,
  rollDailyChase,
  simulateChaseRound,
} from "../engine/mobile/companionChaseGame.js";

describe("companionChaseGame", () => {
  it("normalizes save defaults", () => {
    const save = normalizeChaseSave(null);
    expect(save.highScore).toBe(0);
    expect(save.unlockedVariants).toContain("default");
  });

  it("rolls daily counters on new day", () => {
    const save = defaultChaseSave(Date.parse("2026-09-17T12:00:00Z"));
    const next = rollDailyChase({ ...save, dailyCatches: 4 }, Date.parse("2026-09-18T12:00:00Z"));
    expect(next.dailyCatches).toBe(0);
  });

  it("applies chase rewards and unlocks runner variant", () => {
    let save = defaultChaseSave();
    save = applyChaseResult(save, { catches: 3, score: 420, coins: 55 });
    expect(save.totalCatches).toBe(3);
    expect(save.highScore).toBe(420);
    expect(save.unlockedVariants).toContain("runner");
  });

  it("simulates a round with deterministic rng", () => {
    let i = 0;
    const rng = () => (i++ % 10) / 10;
    const result = simulateChaseRound({ rng, durationMs: 5000, tickMs: 100 });
    expect(result.catches).toBeGreaterThanOrEqual(0);
    expect(result.coins).toBeGreaterThanOrEqual(0);
  });

  it("exposes difficulty configs", () => {
    expect(chaseDifficultyConfig("hard").catchGoal).toBeGreaterThan(chaseDifficultyConfig("easy").catchGoal);
  });
});
