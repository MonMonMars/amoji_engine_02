import { describe, expect, it } from "vitest";
import {
  learnPhaseForProgress,
  pickLearnPhrase,
  pickNextLearnPhrase,
  resolveWaitDialoguePhase,
} from "../engine/companion/companionLearnDialogue.js";

describe("companionLearnDialogue", () => {
  it("picks learning phrases in Cantonese and English", () => {
    expect(pickLearnPhrase("learning", false).length).toBeGreaterThan(4);
    const dl = pickLearnPhrase("downloading", true);
    expect(typeof dl).toBe("string");
    expect(dl.trim().length).toBeGreaterThan(4);
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

  it("resolves wait-specific dialogue phases", () => {
    expect(resolveWaitDialoguePhase("avatar-load", "connecting", 0.1)).toBe(
      "avatar-load",
    );
    expect(resolveWaitDialoguePhase("idle", "idle", 0)).toBe("idle");
    expect(resolveWaitDialoguePhase("thinking", "thinking", 0)).toBe(
      "thinking-wait",
    );
    expect(pickLearnPhrase("avatar-load", false).length).toBeGreaterThan(6);
  });
});
