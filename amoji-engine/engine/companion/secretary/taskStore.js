/**
 * Local task store for secretary MVP (localStorage).
 */
export const TASK_STORE_SCHEMA = "amoji.secretary.tasks.v1";
export const TASK_STORE_KEY = TASK_STORE_SCHEMA;

/**
 * @typedef {"work" | "life" | "personal"} TaskCategory
 * @typedef {"manual" | "chat"} TaskSource
 * @typedef {{
 *   id: string,
 *   title: string,
 *   notes?: string,
 *   createdAt: number,
 *   dueAt?: number | null,
 *   completedAt?: number | null,
 *   snoozedUntil?: number | null,
 *   category: TaskCategory,
 *   source: TaskSource,
 * }} SecretaryTask
 */

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readTaskStore(storage = globalThis.localStorage) {
  if (!storage) return { tasks: [] };
  try {
    const raw = storage.getItem(TASK_STORE_KEY);
    if (!raw) return { tasks: [] };
    const parsed = JSON.parse(raw);
    return {
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
    };
  } catch {
    return { tasks: [] };
  }
}

/**
 * @param {{ tasks: SecretaryTask[] }} store
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function writeTaskStore(store, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(TASK_STORE_KEY, JSON.stringify(store));
}

/**
 * @param {Partial<SecretaryTask> & { title: string }} input
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function createTask(input, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const store = readTaskStore(storage);
  const task = {
    id: `task_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: String(input.title || "").trim(),
    notes: input.notes ? String(input.notes).trim() : "",
    createdAt: now,
    dueAt: input.dueAt ?? null,
    completedAt: null,
    snoozedUntil: input.snoozedUntil ?? null,
    category: input.category || "personal",
    source: input.source || "manual",
  };
  if (!task.title) {
    throw new Error("task title required");
  }
  store.tasks.unshift(task);
  writeTaskStore(store, storage);
  return task;
}

/**
 * @param {string} id
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function completeTask(id, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const store = readTaskStore(storage);
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.completedAt = now;
  writeTaskStore(store, storage);
  return task;
}

/**
 * @param {string} id
 * @param {number} untilMs
 * @param {{ storage?: Storage | null }} [opts]
 */
export function snoozeTask(id, untilMs, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const store = readTaskStore(storage);
  const task = store.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.snoozedUntil = untilMs;
  writeTaskStore(store, storage);
  return task;
}

/**
 * @param {string} id
 * @param {{ storage?: Storage | null }} [opts]
 */
export function deleteTask(id, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const store = readTaskStore(storage);
  const next = store.tasks.filter((t) => t.id !== id);
  if (next.length === store.tasks.length) return false;
  writeTaskStore({ tasks: next }, storage);
  return true;
}

/**
 * @param {SecretaryTask} task
 * @param {number} [now]
 */
export function isTaskActive(task, now = Date.now()) {
  if (!task || task.completedAt) return false;
  if (task.snoozedUntil && task.snoozedUntil > now) return false;
  return true;
}

/**
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function listActiveTasks(opts = {}) {
  const now = opts.now ?? Date.now();
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  return readTaskStore(storage).tasks.filter((t) => isTaskActive(t, now));
}

/**
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function listTasksDueToday(opts = {}) {
  const now = opts.now ?? Date.now();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return listActiveTasks(opts).filter((task) => {
    if (!task.dueAt) return false;
    return task.dueAt >= startMs && task.dueAt < endMs;
  });
}

/**
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function listOverdueTasks(opts = {}) {
  const now = opts.now ?? Date.now();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return listActiveTasks(opts).filter(
    (task) => task.dueAt != null && task.dueAt < startMs,
  );
}
