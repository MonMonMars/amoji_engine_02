import { describe, expect, it } from "vitest";
import {
  createStreamSpeakPlanner,
  stripMoodTagForSpeak,
} from "../engine/companion/companionStreamSpeak.js";

describe("companionStreamSpeak", () => {
  it("strips mood tags for TTS", () => {
    expect(stripMoodTagForSpeak("你好呀！[mood:happy]")).toBe("你好呀！");
    expect(stripMoodTagForSpeak("嗯[mood:thi")).toBe("嗯");
  });

  it("emits sentence chunks as text grows", () => {
    const planner = createStreamSpeakPlanner();
    expect(planner.feed("你好")).toEqual([]);
    const first = planner.feed("你好呀！");
    expect(first).toEqual(["你好呀！"]);
    const second = planner.feed("你好呀！我係 Amoji。");
    expect(second).toEqual(["我係 Amoji。"]);
  });

  it("flushes remaining tail", () => {
    const planner = createStreamSpeakPlanner();
    planner.feed("前半句，");
    const tail = planner.flush("前半句，後半句");
    expect(tail.join(" ")).toContain("後半句");
  });
});
