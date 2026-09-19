import { describe, expect, it } from "vitest";
import {
  ACTION_COMBOS,
  IDLE_LIFE_CLIP_POOL,
  IDLE_LIFE_CLIP_POOL_CORE,
  idleLifeClipPoolForGender,
  idlePlantedLifeClipPoolForGender,
  IDLE_LEG_HEAVY_ACTIONS,
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

  it("filters stride and full-body clips from planted ambient idle pool", () => {
    const planted = idlePlantedLifeClipPoolForGender("female");
    for (const id of IDLE_LEG_HEAVY_ACTIONS) {
      if (idleLifeClipPoolForGender("female").includes(id)) {
        expect(planted).not.toContain(id);
      }
    }
    expect(planted).toContain("nod");
    expect(planted).not.toContain("moonwalk");
  });

  it("keeps idle life on quiet clips with expanded gender pools", () => {
    const female = idleLifeClipPoolForGender("female");
    const male = idleLifeClipPoolForGender("male");
    expect(IDLE_LIFE_CLIP_POOL.length).toBeGreaterThan(female.length);
    expect(female.length).toBeGreaterThanOrEqual(20);
    expect(male.length).toBeGreaterThanOrEqual(20);
    expect(IDLE_LIFE_CLIP_POOL_CORE).toContain("nod");
    expect(female).toContain("shy");
    expect(female).toContain("curtsy");
    expect(male).toContain("handshake");
    expect(female).not.toContain("walk");
    expect(female).not.toContain("jump");
    expect(male).toContain("jump");
    expect(IDLE_LIFE_CLIP_POOL_CORE).not.toContain("celebrate");
    const first = pickIdleShowcase(null, female, "female");
    const second = pickIdleShowcase(first, female, "female");
    expect(female).toContain(first);
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
