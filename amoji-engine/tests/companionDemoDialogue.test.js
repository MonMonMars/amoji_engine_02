import { describe, expect, it } from "vitest";
import {
  buildDemoBootReplyEn,
  DEMO_CONVERSATION_SCENES,
  DEMO_DIALOGUE_SCHEMA,
  DEMO_PROACTIVE_LINES,
  DEMO_STARTER_PROMPTS,
  demoStarterPrompts,
  pickDemoProactiveLine,
  pickTutorialStarterPrompts,
  TUTORIAL_STARTER_PROMPTS,
} from "../engine/companion/companionDemoDialogue.mjs";

describe("companionDemoDialogue", () => {
  it("exports schema and rich pools", () => {
    expect(DEMO_DIALOGUE_SCHEMA).toMatch(/demoDialogue/i);
    expect(DEMO_STARTER_PROMPTS.nova.en.length).toBeGreaterThanOrEqual(6);
    expect(TUTORIAL_STARTER_PROMPTS.length).toBeGreaterThanOrEqual(40);
    expect(DEMO_PROACTIVE_LINES.nova.en.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_CONVERSATION_SCENES.length).toBeGreaterThanOrEqual(3);
  });

  it("returns tutorial starter prompts with category variety", () => {
    const chips = pickTutorialStarterPrompts("alicia", true, { max: 8, seed: "test-a" });
    expect(chips).toHaveLength(8);
    expect(chips.some((c) => c.tutorial)).toBe(true);
    const cats = new Set(chips.map((c) => c.cat));
    expect(cats.size).toBeGreaterThanOrEqual(4);
  });

  it("varies prompts by character and login seed", () => {
    const nova = demoStarterPrompts("nova", true, 8, "user:1|visit-a");
    const kizuna = demoStarterPrompts("kizuna", true, 8, "user:1|visit-a");
    const novaOtherLogin = demoStarterPrompts("nova", true, 8, "user:2|visit-b");
    expect(nova.join("|")).not.toBe(kizuna.join("|"));
    expect(nova.join("|")).not.toBe(novaOtherLogin.join("|"));
  });

  it("returns eight starter prompt strings for featured characters", () => {
    expect(demoStarterPrompts("alicia", true)).toHaveLength(8);
    expect(demoStarterPrompts("ember", false)).toHaveLength(8);
    expect(demoStarterPrompts("unknown", true).join(" ")).toMatch(
      /What can you do|How do I use|Say hi|voice|tap|camera/i,
    );
  });

  it("picks varied proactive lines", () => {
    const a = pickDemoProactiveLine("kizuna", true);
    const b = pickDemoProactiveLine("kizuna", true, {
      avoid: new Set([a]),
    });
    expect(a).not.toBe(b);
  });

  it("handles boot demo replies in English", () => {
    expect(buildDemoBootReplyEn("hello")).toMatch(/loading/i);
    expect(buildDemoBootReplyEn("tell me a joke")).toMatch(/punchline/i);
    expect(buildDemoBootReplyEn("I'm bored")).toMatch(/story/i);
  });
});
