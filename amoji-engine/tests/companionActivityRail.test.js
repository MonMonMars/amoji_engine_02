import { describe, expect, it } from "vitest";
import {
  activityFromIntent,
  buildTaskProcessTemplate,
  uiIntentIcon,
} from "../engine/companion/companionActivityRail.js";

describe("companionActivityRail", () => {
  it("maps intents to icons", () => {
    expect(uiIntentIcon({ type: "tab", value: "tasks" })).toBe("✅");
    expect(uiIntentIcon({ type: "mode", value: "chill" })).toBe("😌");
    expect(uiIntentIcon({ type: "task" })).toBe("📋");
  });

  it("builds activity labels from intents", () => {
    const activity = activityFromIntent({ type: "tab", value: "tasks" }, true);
    expect(activity).toEqual({ icon: "✅", label: "Tasks", kind: "tab" });
  });

  it("builds task process steps", () => {
    const steps = buildTaskProcessTemplate(true);
    expect(steps.map((s) => s.id)).toEqual([
      "hear",
      "think",
      "task",
      "save",
      "show",
    ]);
  });
});
