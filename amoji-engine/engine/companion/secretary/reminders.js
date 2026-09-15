/**
 * Browser reminders for due / overdue secretary tasks (Phase 2).
 */
import { listActiveTasks, listOverdueTasks, listTasksDueToday } from "./taskStore.js";

export const REMINDERS_SCHEMA = "amoji.secretary.reminders.v1";
export const REMINDERS_PREFS_KEY = "amoji.secretary.reminders.prefs.v1";
export const REMINDERS_FIRED_KEY = "amoji.secretary.reminders.fired.v1";

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readReminderPrefs(storage = globalThis.localStorage) {
  if (!storage) return { enabled: false };
  try {
    const raw = storage.getItem(REMINDERS_PREFS_KEY);
    if (!raw) return { enabled: false };
    const parsed = JSON.parse(raw);
    return { enabled: Boolean(parsed?.enabled) };
  } catch {
    return { enabled: false };
  }
}

/**
 * @param {boolean} enabled
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function saveReminderPrefs(enabled, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(REMINDERS_PREFS_KEY, JSON.stringify({ enabled: Boolean(enabled) }));
}

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
function readFiredIds(storage = globalThis.localStorage) {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(REMINDERS_FIRED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    const day = dateKey();
    if (parsed?.date !== day) return new Set();
    return new Set(Array.isArray(parsed?.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

/**
 * @param {Set<string>} ids
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
function writeFiredIds(ids, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(
    REMINDERS_FIRED_KEY,
    JSON.stringify({ date: dateKey(), ids: [...ids] }),
  );
}

function dateKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * @param {{
 *   storage?: Storage | null,
 *   now?: number,
 *   leadMs?: number,
 * }} [opts]
 */
export function listTasksNeedingReminder(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const leadMs = opts.leadMs ?? 15 * 60_000;
  const fired = readFiredIds(storage);
  const candidates = [
    ...listOverdueTasks({ storage, now }),
    ...listTasksDueToday({ storage, now }),
  ];
  const seen = new Set();
  const out = [];

  for (const task of candidates) {
    if (seen.has(task.id) || fired.has(task.id)) continue;
    seen.add(task.id);
    if (!task.dueAt) continue;
    if (task.dueAt <= now + leadMs) {
      out.push(task);
    }
  }
  return out;
}

/**
 * @param {boolean} [isEn]
 */
export function reminderNotificationBody(task, isEn = false) {
  if (!task?.dueAt) {
    return isEn ? task.title : task.title;
  }
  const when = new Date(task.dueAt).toLocaleTimeString(isEn ? "en-HK" : "zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return isEn ? `${task.title} — due ${when}` : `${task.title} — ${when} 到期`;
}

/**
 * @param {{
 *   storage?: Storage | null,
 *   now?: number,
 *   isEn?: boolean,
 *   notify?: (title: string, options?: NotificationOptions) => void,
 * }} [opts]
 * @returns {number} count fired
 */
export function fireDueReminders(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const prefs = readReminderPrefs(storage);
  if (!prefs.enabled) return 0;

  const isEn = Boolean(opts.isEn);
  const tasks = listTasksNeedingReminder(opts);
  if (!tasks.length) return 0;

  const fired = readFiredIds(storage);
  const notify =
    opts.notify ||
    ((title, options) => {
      if (typeof Notification === "undefined") return;
      new Notification(title, options);
    });

  for (const task of tasks) {
    notify(isEn ? "Amoji reminder" : "Amoji 提醒", {
      body: reminderNotificationBody(task, isEn),
      tag: `amoji-task-${task.id}`,
    });
    fired.add(task.id);
  }
  writeFiredIds(fired, storage);
  return tasks.length;
}

/**
 * Request notification permission when user enables reminders.
 */
export async function requestReminderPermission() {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

/**
 * @param {{
 *   storage?: Storage | null,
 *   isEn?: boolean,
 *   intervalMs?: number,
 *   onFire?: (count: number) => void,
 * }} opts
 */
export function startReminderLoop(opts = {}) {
  const intervalMs = opts.intervalMs ?? 60_000;
  const tick = () => {
    const count = fireDueReminders({
      storage: opts.storage,
      isEn: opts.isEn,
    });
    if (count > 0) opts.onFire?.(count);
  };
  tick();
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}
