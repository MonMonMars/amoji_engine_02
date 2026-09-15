import { describe, expect, it, beforeEach } from "vitest";
import { buildTodayBriefing, greetingLine } from "../engine/companion/secretary/briefing.js";
import { createTask } from "../engine/companion/secretary/taskStore.js";
import { saveLastChatSummary } from "../engine/companion/secretary/memoryStore.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary briefing", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("returns morning greeting in English", () => {
    const now = new Date("2026-09-15T08:00:00Z").getTime();
    expect(greetingLine(true, now)).toBe("Good morning");
  });

  it("includes due today count in briefing", () => {
    const now = new Date("2026-09-15T10:00:00Z").getTime();
    createTask(
      { title: "Standup prep", dueAt: now + 1800_000 },
      { storage, now },
    );
    saveLastChatSummary("We talked about the launch plan.", storage);
    const briefing = buildTodayBriefing({ isEn: true, storage, now });
    expect(briefing.dueToday).toHaveLength(1);
    expect(briefing.lines.join(" ")).toMatch(/due today/i);
    expect(briefing.lines.join(" ")).toMatch(/Last chat/i);
  });
});
