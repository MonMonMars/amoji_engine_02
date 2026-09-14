import { describe, expect, it } from "vitest";
import {
  learnPhaseForProgress,
  pickLearnPhrase,
  pickNextLearnPhrase,
} from "../engine/companion/companionLearnDialogue.js";

describe("companionLearnDialogue", () => {
  it("picks learning phrases in Cantonese and English", () => {
    expect(pickLearnPhrase("learning", false).length).toBeGreaterThan(4);
    const dl = pickLearnPhrase("downloading", true);
    expect(dl).toMatch(/download|pull|motion file/i);
  });

  it("cycles learn phrases without immediate repeat", () => {
    const first = pickNextLearnPhrase("learning", false, -1);
    const second = pickNextLearnPhrase("learning", false, first.index);
    expect(second.phrase).toBeTruthy();
    expect(second.index).not.toBe(first.index);
  });

  it("maps progress to dialogue phases", () => {
    expect(learnPhaseForProgress(0.02)).toBe("connecting");
    expect(learnPhaseForProgress(0.4)).toBe("downloading");
    expect(learnPhaseForProgress(0.7)).toBe("learning");
    expect(learnPhaseForProgress(0.98)).toBe("ready");
  });

  it("interpolates download progress", () => {
    const phrase = pickLearnPhrase("progress", false, { pct: 42 });
    expect(phrase).toContain("42");
  });
});
