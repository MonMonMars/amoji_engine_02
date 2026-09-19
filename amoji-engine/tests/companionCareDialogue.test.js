import { describe, expect, it } from "vitest";
import {
  buildCareDisabledPromptFragment,
  filterCareDialogueLines,
  shouldFilterCareDialogueLine,
} from "../engine/companion/companionCareDialogue.js";
import { buildCharacterSystemPrompt } from "../engine/companion/companionCharacterCatalog.js";
import { pickDemoProactiveLine } from "../engine/companion/companionDemoDialogue.mjs";
import { demoStarterPrompts } from "../engine/companion/companionDemoDialogue.mjs";
import { buildUnifiedSessionPrompt } from "../engine/companion/companionUnifiedApp.js";
import { COMPANION_CARE_ENABLED } from "../engine/companion/companionFeatureFlags.js";

describe("companionCareDialogue", () => {
  it("keeps care disabled globally", () => {
    expect(COMPANION_CARE_ENABLED).toBe(false);
  });

  it("filters pet hunger ask lines", () => {
    expect(shouldFilterCareDialogueLine("我肚餓呀…有冇嘢食？")).toBe(true);
    expect(shouldFilterCareDialogueLine("I'm hungry… got a snack for me?")).toBe(true);
    expect(shouldFilterCareDialogueLine("How was your day?")).toBe(false);
  });

  it("filters casual food-topic proactive lines when care is off", () => {
    expect(shouldFilterCareDialogueLine("What should we eat tonight?")).toBe(true);
    expect(shouldFilterCareDialogueLine("今晚食咩好？")).toBe(true);
    expect(shouldFilterCareDialogueLine("What are you craving right now — food or fun?")).toBe(
      true,
    );
    expect(filterCareDialogueLines(["Tell me about your day", "今晚食咩好？"])).toEqual([
      "Tell me about your day",
    ]);
  });

  it("adds care-disabled rules to character system prompts", () => {
    const prompt = buildCharacterSystemPrompt("yuki", true);
    expect(prompt).toMatch(/FEEDING MODE IS OFF/i);
    expect(prompt).toMatch(/Supported actions only:.*yoga\./);
    expect(prompt).not.toMatch(/Supported actions only:.*\beat,/);
  });

  it("avoids food proactive lines for yuki and sky while care is off", () => {
    for (let i = 0; i < 24; i += 1) {
      const yuki = pickDemoProactiveLine("yuki", true, { bucket: "greeting" });
      expect(yuki).not.toMatch(/food|craving|eat/i);
      const sky = pickDemoProactiveLine("sky", false, { bucket: "idle" });
      expect(sky).not.toMatch(/food|食/i);
    }
  });

  it("drops food starter chips for yuki while care is off", () => {
    const starters = demoStarterPrompts("yuki", false, 8, "care-off-test");
    expect(starters.join("|")).not.toMatch(/食咩/);
  });

  it("uses chat-only pet role copy when care is off", () => {
    const prompt = buildUnifiedSessionPrompt({
      characterPrompt: "You are Amoji.",
      role: "pet",
      isEnglish: true,
      uiRules: "",
      motionExtra: "",
      storage: null,
    });
    expect(prompt).toMatch(/no feeding or hunger mechanics/i);
    expect(prompt).not.toMatch(/Virtual pet companion/i);
  });
});
