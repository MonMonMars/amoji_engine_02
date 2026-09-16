import { describe, expect, it, beforeEach } from "vitest";
import {
  applyPreferenceActions,
  applyTaskActions,
  snoozeDurationFromHint,
} from "../engine/companion/secretary/secretaryTagActions.js";
import {
  createTask,
  listActiveTasks,
} from "../engine/companion/secretary/taskStore.js";
import { getPreferences } from "../engine/companion/secretary/memoryStore.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary tag actions", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("completes tasks from action tags", () => {
    createTask({ title: "Call mom" }, { storage });
    const { results } = applyTaskActions(
      [{ action: "done", title: "Call mom" }],
      { storage, isEn: true },
    );
    expect(results[0].ok).toBe(true);
    expect(listActiveTasks({ storage })).toHaveLength(0);
  });

  it("parses snooze durations", () => {
    expect(snoozeDurationFromHint("2h")).toBe(7200_000);
    expect(snoozeDurationFromHint("")).toBe(3600_000);
  });

  it("applies preference patches", () => {
    const patch = applyPreferenceActions(
      [
        { key: "tone", value: "playful" },
        { key: "helpwith", value: "life" },
        { key: "morningbrief", value: "on" },
      ],
      { storage },
    );
    expect(patch).toEqual({
      tone: "playful",
      helpWith: "life",
      morningBrief: true,
    });
    const prefs = getPreferences({ storage });
    expect(prefs.tone).toBe("playful");
    expect(prefs.helpWith).toBe("life");
    expect(prefs.morningBrief).toBe(true);
  });
});
