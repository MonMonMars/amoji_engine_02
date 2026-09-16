import { describe, expect, it, vi } from "vitest";
import {
  applyUiIntents,
  inferUiIntentFromUserText,
  mergeUiIntents,
  parseUiIntentTags,
  stripUiIntentTags,
} from "../engine/companion/companionUiIntent.js";

describe("companionUiIntent", () => {
  it("parses and strips ui tags", () => {
    const parsed = parseUiIntentTags(
      "好，我幫你睇任務。[ui:tab:tasks] [mood:happy]",
    );
    expect(parsed.intents).toEqual([{ type: "tab", value: "tasks" }]);
    expect(parsed.stripped).not.toMatch(/\[ui:/);
    expect(stripUiIntentTags(parsed.stripped)).not.toMatch(/\[ui:/);
  });

  it("infers navigation from user text", () => {
    expect(inferUiIntentFromUserText("show my tasks", true)).toEqual([
      { type: "tab", value: "tasks" },
    ]);
    expect(inferUiIntentFromUserText("睇下任務", false)).toEqual([
      { type: "tab", value: "tasks" },
    ]);
  });

  it("merges LLM tags over inferred intents of same type", () => {
    const merged = mergeUiIntents(
      [{ type: "tab", value: "chat" }],
      [{ type: "tab", value: "tasks" }],
    );
    expect(merged).toEqual([{ type: "tab", value: "tasks" }]);
  });

  it("applies tab and mode handlers", async () => {
    const switchTab = vi.fn();
    const setMode = vi.fn();
    const { applied } = await applyUiIntents(
      [
        { type: "tab", value: "tasks" },
        { type: "mode", value: "work" },
      ],
      { switchTab, setMode },
    );
    expect(switchTab).toHaveBeenCalledWith("tasks");
    expect(setMode).toHaveBeenCalledWith("work");
    expect(applied).toHaveLength(2);
  });
});
