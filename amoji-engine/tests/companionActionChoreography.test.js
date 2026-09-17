import { describe, expect, it } from "vitest";
import {
  ACTION_COMBOS,
  IDLE_LIFE_CLIP_POOL,
  buildActionSequence,
  buildShowcaseSequence,
  isShowcaseRequest,
  pickIdleShowcase,
  shouldChainAction,
} from "../engine/companion/companionActionChoreography.js";

describe("companionActionChoreography", () => {
  it("builds multi-move combos for dance and kungfu", () => {
    expect(buildActionSequence("dance")).toEqual(ACTION_COMBOS.dance);
    expect(buildActionSequence("kungfu").length).toBeGreaterThan(1);
  });

  it("detects showcase requests in English and Cantonese", () => {
    expect(isShowcaseRequest("show me some moves")).toBe(true);
    expect(isShowcaseRequest("做幾個動作")).toBe(true);
    expect(isShowcaseRequest("hello")).toBe(false);
  });

  it("chains looping and combo actions", () => {
    expect(shouldChainAction("dance")).toBe(true);
    expect(shouldChainAction("wave")).toBe(true);
    expect(shouldChainAction("shy")).toBe(false);
  });

  it("keeps default idle life on the calm library set, not kungfu showcase", () => {
    expect(IDLE_LIFE_CLIP_POOL.length).toBeGreaterThanOrEqual(10);
    expect(IDLE_LIFE_CLIP_POOL).toContain("wave");
    expect(IDLE_LIFE_CLIP_POOL).toContain("thinking");
    expect(IDLE_LIFE_CLIP_POOL).toContain("stretch");
    expect(IDLE_LIFE_CLIP_POOL).not.toContain("spin");
    expect(IDLE_LIFE_CLIP_POOL).not.toContain("kungfu");
    expect(IDLE_LIFE_CLIP_POOL).not.toContain("zombie");
    const first = pickIdleShowcase(null, IDLE_LIFE_CLIP_POOL);
    const second = pickIdleShowcase(first, IDLE_LIFE_CLIP_POOL);
    expect(IDLE_LIFE_CLIP_POOL).toContain(first);
    expect(second).not.toBe(first);
  });

  it("avoids repeating the same idle showcase move", () => {
    const first = pickIdleShowcase(null);
    const second = pickIdleShowcase(first);
    expect(second).not.toBe(first);
  });

  it("builds showcase sequences with optional seed", () => {
    const seq = buildShowcaseSequence({ seedAction: "dance", count: 5 });
    expect(seq.length).toBe(5);
    expect(seq[0]).toBe("dance");
  });
});
