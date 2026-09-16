import { describe, expect, it, beforeEach } from "vitest";
import { createTask } from "../engine/companion/secretary/taskStore.js";
import { findActiveTaskByTitleHint } from "../engine/companion/secretary/taskMatch.js";

function mockStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
}

describe("secretary taskMatch", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it("finds tasks by exact title", () => {
    const task = createTask({ title: "Call mom" }, { storage });
    expect(findActiveTaskByTitleHint("Call mom", { storage })?.id).toBe(task.id);
  });

  it("finds tasks by partial title hint", () => {
    createTask({ title: "Email Alex about contract" }, { storage });
    expect(
      findActiveTaskByTitleHint("alex", { storage })?.title,
    ).toMatch(/Alex/);
  });

  it("returns null when no match", () => {
    createTask({ title: "Buy milk" }, { storage });
    expect(findActiveTaskByTitleHint("call mom", { storage })).toBeNull();
  });
});
