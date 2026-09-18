import { describe, expect, it } from "vitest";
import {
  canStartStreamSpeakEarly,
  createStreamSpeakPlanner,
  hasCompleteMoodTag,
  shouldFlushStreamSpeak,
  stripMoodTagForSpeak,
  stripReplyTagsForSpeak,
} from "../engine/companion/companionStreamSpeak.js";

describe("companionStreamSpeak", () => {
  it("detects complete mood tags in streamed raw reply", () => {
    expect(hasCompleteMoodTag("你好呀！[mood:happy]")).toBe(true);
    expect(hasCompleteMoodTag("你好呀！[mood:hap")).toBe(false);
    expect(hasCompleteMoodTag("你好呀！")).toBe(false);
  });

  it("allows early stream speak after first sentence without mood tag", () => {
    expect(canStartStreamSpeakEarly("你好呀！")).toBe(true);
    expect(canStartStreamSpeakEarly("你好")).toBe(false);
    expect(shouldFlushStreamSpeak("你好呀！我係 Amoji")).toBe(true);
    expect(shouldFlushStreamSpeak("你好呀！[mood:happy]")).toBe(true);
  });

  it("strips mood tags for TTS", () => {
    expect(stripMoodTagForSpeak("你好呀！[mood:happy]")).toBe("你好呀！");
    expect(stripMoodTagForSpeak("嗯[mood:thi")).toBe("嗯");
  });

  it("strips action and mood tags for stream speak offsets", () => {
    expect(stripReplyTagsForSpeak("你好！[action:wave] 我係 Amoji。[mood:happy]")).toBe(
      "你好！ 我係 Amoji。",
    );
  });

  it("emits sentence chunks as text grows", () => {
    const planner = createStreamSpeakPlanner();
    expect(planner.feed("你好")).toEqual([]);
    const first = planner.feed("你好呀！");
    expect(first).toEqual(["你好呀！"]);
    const second = planner.feed("你好呀！我係 Amoji。");
    expect(second).toEqual(["我係 Amoji。"]);
  });

  it("holds a sentence until terminal punctuation instead of commas", () => {
    const planner = createStreamSpeakPlanner();
    expect(planner.feed("Sure, I'd love to help")).toEqual([]);
    expect(
      planner.feed("Sure, I'd love to help you plan your day today"),
    ).toEqual([]);
    expect(
      planner.feed("Sure, I'd love to help you plan your day today."),
    ).toEqual(["Sure, I'd love to help you plan your day today."]);
  });

  it("does not emit at 42 characters mid-sentence", () => {
    const planner = createStreamSpeakPlanner();
    const partial =
      "I would really love to walk you through a calm morning routine with";
    expect(partial.length).toBeGreaterThan(42);
    expect(planner.feed(partial)).toEqual([]);
    expect(planner.feed(`${partial} tea.`)).toEqual([`${partial} tea.`]);
  });

  it("flushes remaining tail", () => {
    const planner = createStreamSpeakPlanner();
    planner.feed("前半句，");
    const tail = planner.flush("前半句，後半句");
    expect(tail.join(" ")).toContain("後半句");
  });
});
