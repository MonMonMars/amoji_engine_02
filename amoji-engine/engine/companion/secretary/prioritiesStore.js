/**
 * Daily Top 3 priorities — pin up to 3 active tasks for today.
 */
export const PRIORITIES_STORE_SCHEMA = "amoji.secretary.priorities.v1";
export const PRIORITIES_STORE_KEY = PRIORITIES_STORE_SCHEMA;

const MAX_PRIORITIES = 3;

/**
 * @param {number} [now]
 */
export function dateKeyForNow(now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readPrioritiesStore(storage = globalThis.localStorage) {
  if (!storage) return { date: dateKeyForNow(), taskIds: [] };
  try {
    const raw = storage.getItem(PRIORITIES_STORE_KEY);
    if (!raw) return { date: dateKeyForNow(), taskIds: [] };
    const parsed = JSON.parse(raw);
    return {
      date: String(parsed?.date || dateKeyForNow()),
      taskIds: Array.isArray(parsed?.taskIds)
        ? parsed.taskIds.map(String)
        : [],
    };
  } catch {
    return { date: dateKeyForNow(), taskIds: [] };
  }
}

/**
 * @param {{ date: string, taskIds: string[] }} store
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function writePrioritiesStore(store, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(PRIORITIES_STORE_KEY, JSON.stringify(store));
}

/**
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function listTodayPriorities(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const today = dateKeyForNow(now);
  const store = readPrioritiesStore(storage);
  if (store.date !== today) {
    return [];
  }
  return store.taskIds.slice(0, MAX_PRIORITIES);
}

/**
 * @param {string} taskId
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function togglePriority(taskId, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const today = dateKeyForNow(now);
  const store = readPrioritiesStore(storage);
  const ids =
    store.date === today ? [...store.taskIds] : [];
  const idx = ids.indexOf(taskId);
  if (idx >= 0) {
    ids.splice(idx, 1);
  } else if (ids.length < MAX_PRIORITIES) {
    ids.push(taskId);
  } else {
    return { ok: false, reason: "full", taskIds: ids };
  }
  writePrioritiesStore({ date: today, taskIds: ids }, storage);
  return { ok: true, taskIds: ids };
}

/**
 * @param {string} taskId
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function isPriorityTask(taskId, opts = {}) {
  return listTodayPriorities(opts).includes(taskId);
}

/**
 * @param {string} taskId
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function removePriorityIfPresent(taskId, opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const today = dateKeyForNow(now);
  const store = readPrioritiesStore(storage);
  if (store.date !== today) return false;
  const next = store.taskIds.filter((id) => id !== taskId);
  if (next.length === store.taskIds.length) return false;
  writePrioritiesStore({ date: today, taskIds: next }, storage);
  return true;
}
