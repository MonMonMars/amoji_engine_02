import { describe, expect, it, beforeEach } from "vitest";
import {
  isPriorityTask,
  listTodayPriorities,
  togglePriority,
} from "../engine/companion/secretary/prioritiesStore.js";
import { createTask } from "../engine/companion/secretary/taskStore.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary prioritiesStore", () => {
  /** @type {Storage} */
  let storage;
  const now = new Date("2026-09-15T10:00:00Z").getTime();

  beforeEach(() => {
    storage = mockStorage();
  });

  it("pins up to three tasks for today", () => {
    const a = createTask({ title: "A" }, { storage, now });
    const b = createTask({ title: "B" }, { storage, now });
    togglePriority(a.id, { storage, now });
    togglePriority(b.id, { storage, now });
    expect(listTodayPriorities({ storage, now })).toEqual([a.id, b.id]);
    expect(isPriorityTask(a.id, { storage, now })).toBe(true);
  });

  it("refuses a fourth pin", () => {
    const tasks = [1, 2, 3, 4].map((n) =>
      createTask({ title: `T${n}` }, { storage, now }),
    );
    for (const t of tasks.slice(0, 3)) {
      togglePriority(t.id, { storage, now });
    }
    const fourth = togglePriority(tasks[3].id, { storage, now });
    expect(fourth.ok).toBe(false);
    expect(listTodayPriorities({ storage, now }).length).toBe(3);
  });
});
