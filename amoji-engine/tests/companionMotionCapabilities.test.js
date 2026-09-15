import { describe, expect, it } from "vitest";
import {
  buildMotionCapabilityPromptFragment,
  formatMotionCapabilitySummary,
  SHOWCASE_MOTION_IDS,
} from "../engine/companion/companionMotionCapabilities.js";

describe("companionMotionCapabilities", () => {
  it("lists at least ten showcase motions", () => {
    expect(SHOWCASE_MOTION_IDS.length).toBeGreaterThanOrEqual(10);
  });

  it("formats bilingual capability summary", () => {
    const en = formatMotionCapabilitySummary(true, SHOWCASE_MOTION_IDS);
    expect(en.headline).toMatch(/learned/i);
    expect(en.examples).toMatch(/wave/i);
    const yue = formatMotionCapabilitySummary(false, SHOWCASE_MOTION_IDS);
    expect(yue.headline).toMatch(/學識/);
  });

  it("builds LLM motion capability fragment", () => {
    const frag = buildMotionCapabilityPromptFragment(true, SHOWCASE_MOTION_IDS);
    expect(frag).toMatch(/wave/);
    expect(frag).toMatch(/\[action:/);
  });
});
