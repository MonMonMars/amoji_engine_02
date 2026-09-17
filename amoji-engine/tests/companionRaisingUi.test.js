import { describe, expect, it } from "vitest";
import {
  ACTIVITY_COMMANDS,
  BOND_RANKS,
  DAILY_GOAL_DEFS,
  adviceLineForAction,
  applySnackCare,
  applyWalkCare,
  bumpRaisingProgress,
  extractMemoryCandidate,
  formatDailyGoalLine,
  formatStatDelta,
  normalizeRaisingState,
  pickDailyGoalDef,
  resolveBondRank,
  updatePinnedMemories,
} from "../engine/companion/companionRaisingUi.js";

describe("companionRaisingUi", () => {
  it("exposes raising-game constants", () => {
    expect(DAILY_GOAL_DEFS.length).toBeGreaterThanOrEqual(5);
    expect(BOND_RANKS.length).toBe(5);
    expect(ACTIVITY_COMMANDS.map((c) => c.kind)).toEqual(["snack", "talk", "walk"]);
  });

  it("picks a stable daily goal per day and character", () => {
    const a = pickDailyGoalDef("nova", "2026-09-17");
    const b = pickDailyGoalDef("nova", "2026-09-17");
    const c = pickDailyGoalDef("sora", "2026-09-17");
    expect(a.id).toBe(b.id);
    expect(a.id).toBeTruthy();
    expect(c.id).toBeTruthy();
  });

  it("resolves bond ranks from hearts", () => {
    expect(resolveBondRank(10, true).en).toBe("New face");
    expect(resolveBondRank(45, true).en).toBe("Friend");
    expect(resolveBondRank(85, false).yue).toBe("知心");
  });

  it("formats daily goal progress lines", () => {
    const when = Date.parse("2026-09-17T12:00:00Z");
    let state = normalizeRaisingState({}, "nova", when);
    state = bumpRaisingProgress(state, "chat", { now: when });
    const line = formatDailyGoalLine(state, true, when);
    expect(line).toMatch(/Today ·/);
    if (state.goalId === "chat") {
      expect(line).toMatch(/\(1\/3\)/);
    } else {
      expect(line).toMatch(/done!|\/\d+\)/);
    }
  });

  it("bumps progress for matching goal events", () => {
    const goal = pickDailyGoalDef("amoji", "2026-09-17");
    const base = normalizeRaisingState({}, "amoji", Date.parse("2026-09-17T12:00:00Z"));
    const next =
      goal.id === "chat"
        ? bumpRaisingProgress(base, "chat", { hearts: 70, now: Date.parse("2026-09-17T12:00:00Z") })
        : bumpRaisingProgress(base, goal.id, { hearts: 70, now: Date.parse("2026-09-17T12:00:00Z") });
    expect(next.counts[goal.id === "hearts" ? "feed" : goal.id] ?? next.goalProgress).toBeTruthy();
    expect(next.goalProgress).toBeGreaterThanOrEqual(1);
  });

  it("applies walk and snack care boosts", () => {
    const t0 = 1_700_000_000_000;
    const care = { hunger: 40, hearts: 50, lastTickMs: t0 };
    const walk = applyWalkCare(care, 10, t0);
    expect(walk.heartsDelta).toBeGreaterThan(0);
    expect(walk.care.hearts).toBeGreaterThan(care.hearts);
    const snack = applySnackCare(care, 10, t0);
    expect(snack.care.hunger).toBeGreaterThan(care.hunger);
  });

  it("extracts memory candidates from user text", () => {
    expect(extractMemoryCandidate("My name is Alex", true)).toContain("Alex");
    expect(extractMemoryCandidate("我叫阿明")).toContain("阿明");
    expect(extractMemoryCandidate("I like bubble tea", true)).toContain("bubble tea");
    expect(extractMemoryCandidate("hello")).toBe("");
  });

  it("pins up to three unique memories", () => {
    const next = updatePinnedMemories(["A"], "B");
    expect(next).toEqual(["B", "A"]);
    const capped = updatePinnedMemories(["a", "b", "c"], "d");
    expect(capped).toHaveLength(3);
    expect(capped[0]).toBe("d");
  });

  it("formats stat deltas and advice lines", () => {
    expect(formatStatDelta({ hearts: 6 })).toContain("+6");
    expect(adviceLineForAction("pet", {}, true)).toContain("Headpats");
    expect(adviceLineForAction("feed", { refused: true }, false)).toContain("遲啲");
  });
});
