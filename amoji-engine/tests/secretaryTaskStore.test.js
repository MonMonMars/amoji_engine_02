import { describe, expect, it, beforeEach } from "vitest";
import {
  completeTask,
  createTask,
  listActiveTasks,
  listTasksDueToday,
  snoozeTask,
} from "../engine/companion/secretary/taskStore.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary taskStore", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("creates and completes tasks", () => {
    const task = createTask(
      { title: "Email Alex", category: "work", source: "chat" },
      { storage },
    );
    expect(task.title).toBe("Email Alex");
    expect(listActiveTasks({ storage })).toHaveLength(1);
    completeTask(task.id, { storage });
    expect(listActiveTasks({ storage })).toHaveLength(0);
  });

  it("lists tasks due today", () => {
    const now = new Date("2026-09-15T10:00:00Z").getTime();
    createTask(
      { title: "Today task", dueAt: now + 3600_000 },
      { storage, now },
    );
    createTask(
      { title: "Later", dueAt: now + 86_400_000 * 3 },
      { storage, now },
    );
    expect(listTasksDueToday({ storage, now })).toHaveLength(1);
  });

  it("snoozes tasks until later", () => {
    const now = Date.now();
    const task = createTask({ title: "Snooze me" }, { storage, now });
    snoozeTask(task.id, now + 60_000, { storage });
    expect(listActiveTasks({ storage, now })).toHaveLength(0);
    expect(listActiveTasks({ storage, now: now + 120_000 })).toHaveLength(1);
  });
});
