import { describe, expect, it } from "vitest";
import {
  buildDemoBootReplyEn,
  DEMO_CONVERSATION_SCENES,
  DEMO_DIALOGUE_SCHEMA,
  DEMO_PROACTIVE_LINES,
  DEMO_STARTER_PROMPTS,
  demoStarterPrompts,
  pickDemoProactiveLine,
} from "../engine/companion/companionDemoDialogue.mjs";

describe("companionDemoDialogue", () => {
  it("exports schema and rich pools", () => {
    expect(DEMO_DIALOGUE_SCHEMA).toMatch(/demoDialogue/i);
    expect(DEMO_STARTER_PROMPTS.nova.en.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_PROACTIVE_LINES.nova.en.length).toBeGreaterThanOrEqual(8);
    expect(DEMO_CONVERSATION_SCENES.length).toBeGreaterThanOrEqual(3);
  });

  it("returns six starter prompts for featured characters", () => {
    expect(demoStarterPrompts("alicia", true)).toHaveLength(6);
    expect(demoStarterPrompts("ember", false)).toHaveLength(6);
    expect(demoStarterPrompts("unknown", true)[0]).toMatch(/Say hi|hi/i);
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
