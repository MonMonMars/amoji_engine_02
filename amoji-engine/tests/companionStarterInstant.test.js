import { describe, expect, it } from "vitest";
import {
  buildStarterInstantPack,
  buildTutorialStarterReply,
  starterPromptLookupKey,
  TUTORIAL_CAT_INSTANT_REPLIES,
} from "../engine/companion/companionStarterInstant.mjs";

describe("companionStarterInstant", () => {
  it("builds a reply for each visible starter chip", () => {
    const pack = buildStarterInstantPack("nova", true, { max: 4, seed: "test-seed" });
    expect(pack.length).toBe(4);
    for (const row of pack) {
      expect(row.question.length).toBeGreaterThan(2);
      expect(row.reply.length).toBeGreaterThan(8);
      expect(row.key).toBe(starterPromptLookupKey(row.question));
    }
  });

  it("uses category instant copy for tutorial intro chips", () => {
    const reply = buildTutorialStarterReply("What can you do?", {
      isEnglish: true,
      cat: "intro",
    });
    expect(reply).toBe(TUTORIAL_CAT_INSTANT_REPLIES.intro.en);
  });

  it("lookup key ignores punctuation", () => {
    expect(starterPromptLookupKey("Hello!")).toBe(starterPromptLookupKey("hello"));
  });
});
