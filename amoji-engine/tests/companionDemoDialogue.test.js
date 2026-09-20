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
  PROACTIVE_NEW_TOPIC_LINES,
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

  it("returns four starter prompt strings for featured characters", () => {
    expect(demoStarterPrompts("alicia", true)).toHaveLength(4);
    expect(demoStarterPrompts("ember", false)).toHaveLength(4);
    const unknownPool = demoStarterPrompts("unknown", true, 4, "tutorial-pool-check");
    expect(unknownPool.join(" ").length).toBeGreaterThan(12);
    expect(unknownPool.some((p) => p.length > 4)).toBe(true);
  });

  it("varies tutorial chips across reload seeds", () => {
    const a = pickTutorialStarterPrompts("nova", true, {
      max: 4,
      seed: "guest|nova|en|load-a",
    });
    const b = pickTutorialStarterPrompts("nova", true, {
      max: 4,
      seed: "guest|nova|en|load-b",
    });
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(4);
    expect(a.map((c) => c.text).join("|")).not.toBe(b.map((c) => c.text).join("|"));
  });

  it("picks varied proactive lines", () => {
    const a = pickDemoProactiveLine("kizuna", true);
    const b = pickDemoProactiveLine("kizuna", true, {
      avoid: new Set([a]),
    });
    expect(a).not.toBe(b);
  });

  it("prefers fresh topic openers when idle", () => {
    expect(PROACTIVE_NEW_TOPIC_LINES.sky.en.length).toBeGreaterThanOrEqual(6);
    const idle = pickDemoProactiveLine("mio", true, { bucket: "idle" });
    expect(idle.length).toBeGreaterThan(5);
    const follow = pickDemoProactiveLine("mio", true, { bucket: "followup" });
    expect(follow.length).toBeGreaterThan(5);
  });

  it("has starter and proactive pools for all curated characters", () => {
    for (const id of ["sky", "yuki", "hina", "mio"]) {
      expect(demoStarterPrompts(id, true).length).toBeGreaterThanOrEqual(4);
      expect(pickDemoProactiveLine(id, true)).toBeTruthy();
    }
  });

  it("handles boot demo replies in English", () => {
    expect(buildDemoBootReplyEn("hello")).toMatch(/loading/i);
    expect(buildDemoBootReplyEn("tell me a joke")).toMatch(/punchline/i);
    expect(buildDemoBootReplyEn("I'm bored")).toMatch(/story/i);
  });
});
