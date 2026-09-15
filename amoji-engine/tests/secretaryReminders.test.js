import { describe, expect, it, beforeEach } from "vitest";
import {
  fireDueReminders,
  listTasksNeedingReminder,
  readReminderPrefs,
  saveReminderPrefs,
} from "../engine/companion/secretary/reminders.js";
import { createTask } from "../engine/companion/secretary/taskStore.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary reminders", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("lists overdue tasks needing reminder", () => {
    const now = new Date("2026-09-15T12:00:00Z").getTime();
    createTask(
      { title: "Late report", dueAt: now - 3600_000 },
      { storage, now },
    );
    const due = listTasksNeedingReminder({ storage, now, leadMs: 60_000 });
    expect(due).toHaveLength(1);
    expect(due[0].title).toMatch(/Late report/);
  });

  it("fires notifications when enabled", () => {
    const now = new Date("2026-09-15T12:00:00Z").getTime();
    saveReminderPrefs(true, storage);
    createTask(
      { title: "Call mom", dueAt: now - 1000 },
      { storage, now },
    );
    const fired = [];
    const count = fireDueReminders({
      storage,
      now,
      notify: (title, opts) => fired.push({ title, body: opts?.body }),
    });
    expect(count).toBe(1);
    expect(fired[0].body).toMatch(/Call mom/);
    expect(readReminderPrefs(storage).enabled).toBe(true);
  });
});
