import { describe, expect, it } from "vitest";
import {
  isLearnThinkingSound,
  isLoadingLearnPhase,
  LEARN_DIALOGUE,
  LEARN_SPEAK_COOLDOWN_MS,
  LEARN_SPEAK_DELAY_MS,
  LEARN_SPEAK_MIN_PROGRESS,
  LEARN_SPEAK_NEAR_DONE,
  LEARN_SPEAK_STALL_MS,
  LEARN_SPEAK_WORDS_MS,
  LOADING_WAIT_WORDS,
  learnPhaseForProgress,
  pickLearnPhrase,
  pickNextLearnPhrase,
  resolveWaitDialoguePhase,
  shouldSpeakLearnFill,
  shouldUseLearnWords,
} from "../engine/companion/companionLearnDialogue.js";

describe("companionLearnDialogue", () => {
  it("picks thinking-sound fillers for loading phases", () => {
    expect(isLearnThinkingSound(pickLearnPhrase("learning", false))).toBe(true);
    const dl = pickLearnPhrase("downloading", true);
    expect(isLearnThinkingSound(dl)).toBe(true);
    expect(dl).toMatch(/um|amm|hmm|uh|mm|ah/i);
  });

  it("cycles learn phrases without immediate repeat", () => {
    const first = pickNextLearnPhrase("learning", false, -1);
    const second = pickNextLearnPhrase("learning", false, first.index);
    expect(second.phrase).toBeTruthy();
    expect(second.index).not.toBe(first.index);
  });

  it("maps progress across many loading phases", () => {
    expect(learnPhaseForProgress(0.02)).toBe("connecting");
    expect(learnPhaseForProgress(0.08)).toBe("waking");
    expect(learnPhaseForProgress(0.15)).toBe("searching");
    expect(learnPhaseForProgress(0.22)).toBe("assembling");
    expect(learnPhaseForProgress(0.35)).toBe("downloading");
    expect(learnPhaseForProgress(0.45)).toBe("warming");
    expect(learnPhaseForProgress(0.55)).toBe("learning");
    expect(learnPhaseForProgress(0.68)).toBe("installing");
    expect(learnPhaseForProgress(0.78)).toBe("settling");
    expect(learnPhaseForProgress(0.88)).toBe("almost");
    expect(learnPhaseForProgress(0.98)).toBe("ready");
  });

  it("keeps loading phrases as hums instead of percent copy", () => {
    const phrase = pickLearnPhrase("progress", true, { pct: 42 });
    expect(phrase).not.toContain("42");
    expect(isLearnThinkingSound(phrase)).toBe(true);
  });

  it("resolves wait-specific dialogue phases", () => {
    expect(resolveWaitDialoguePhase("avatar-load", "connecting", 0.1)).toBe(
      "avatar-load",
    );
    expect(resolveWaitDialoguePhase("avatar-load", "connecting", 0.35)).toBe(
      "downloading",
    );
    expect(resolveWaitDialoguePhase("idle", "idle", 0)).toBe("idle");
    expect(resolveWaitDialoguePhase("thinking", "thinking", 0)).toBe(
      "thinking-wait",
    );
    expect(isLearnThinkingSound(pickLearnPhrase("avatar-load", false))).toBe(
      true,
    );
  });

  it("does not speak loading fillers immediately", () => {
    expect(
      shouldSpeakLearnFill({
        elapsedMs: 0,
        progress: 0,
        phase: "avatar-load",
        kind: "avatar-load",
      }),
    ).toBe(false);
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_DELAY_MS - 1,
        progress: 0.9,
        phase: "almost",
        kind: "avatar-load",
      }),
    ).toBe(false);
  });

  it("speaks later, or when loading is almost done", () => {
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_DELAY_MS,
        progress: LEARN_SPEAK_NEAR_DONE,
        phase: "almost",
        kind: "motion",
      }),
    ).toBe(true);
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_DELAY_MS,
        progress: LEARN_SPEAK_MIN_PROGRESS,
        phase: "installing",
        kind: "download",
      }),
    ).toBe(true);
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_STALL_MS,
        progress: 0.1,
        spokenCount: 0,
        phase: "avatar-load",
        kind: "avatar-load",
      }),
    ).toBe(true);
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_STALL_MS,
        progress: 0.1,
        spokenCount: 1,
        sinceLastSpeakMs: LEARN_SPEAK_COOLDOWN_MS,
        phase: "searching",
        kind: "avatar-load",
      }),
    ).toBe(false);
  });

  it("switches to real words when loading takes too long", () => {
    expect(
      shouldUseLearnWords({
        elapsedMs: LEARN_SPEAK_WORDS_MS - 1,
        phase: "avatar-load",
        kind: "avatar-load",
      }),
    ).toBe(false);
    expect(
      shouldUseLearnWords({
        elapsedMs: LEARN_SPEAK_WORDS_MS,
        phase: "downloading",
        kind: "motion",
      }),
    ).toBe(true);
    expect(
      shouldSpeakLearnFill({
        elapsedMs: LEARN_SPEAK_WORDS_MS,
        progress: 0.2,
        spokenCount: 1,
        sinceLastSpeakMs: LEARN_SPEAK_COOLDOWN_MS,
        phase: "downloading",
        kind: "motion",
      }),
    ).toBe(true);

    const en = pickLearnPhrase("avatar-load", true, { useWords: true });
    const yue = pickLearnPhrase("avatar-load", false, { useWords: true });
    expect(isLearnThinkingSound(en)).toBe(false);
    expect(isLearnThinkingSound(yue)).toBe(false);
    expect(en.length).toBeGreaterThan(12);
    expect(yue.length).toBeGreaterThan(6);
    const seen = new Set();
    let last = -1;
    for (let i = 0; i < 8; i += 1) {
      const next = pickNextLearnPhrase("downloading", true, last, {
        useWords: true,
        pct: 42,
      });
      seen.add(next.phrase);
      last = next.index;
    }
    expect([...seen].some((line) => line.includes("42"))).toBe(true);
    expect([...seen].every((line) => !line.includes("{pct}"))).toBe(true);
  });

  it("lets idle lines speak without the loading delay", () => {
    expect(
      shouldSpeakLearnFill({
        elapsedMs: 0,
        progress: 0,
        phase: "idle",
        kind: "idle",
      }),
    ).toBe(true);
    expect(isLoadingLearnPhase("idle")).toBe(false);
  });

  it("ships many loading-phase hum buckets", () => {
    const loading = [
      "connecting",
      "waking",
      "searching",
      "assembling",
      "downloading",
      "warming",
      "learning",
      "installing",
      "settling",
      "almost",
      "avatar-load",
    ];
    expect(loading.every((phase) => LEARN_DIALOGUE[phase]?.en.length >= 6)).toBe(
      true,
    );
    expect(
      loading.every((phase) =>
        LEARN_DIALOGUE[phase].en.every((line) => isLearnThinkingSound(line)),
      ),
    ).toBe(true);
    expect(
      loading.every((phase) =>
        LEARN_DIALOGUE[phase].yue.every((line) => isLearnThinkingSound(line)),
      ),
    ).toBe(true);
  });
});
