/**
 * Apply secretary LLM tag side-effects (tasks, prefs, filters).
 */
import { saveReminderPrefs } from "./reminders.js";
import { savePreferences } from "./memoryStore.js";
import {
  completeTask,
  deleteTask,
  snoozeTask,
} from "./taskStore.js";
import { removePriorityIfPresent } from "./prioritiesStore.js";
import { findActiveTaskByTitleHint } from "./taskMatch.js";

export const SECRETARY_TAG_ACTIONS_SCHEMA = "amoji.secretary.tagActions.v1";

/**
 * @typedef {{
 *   action: "done" | "snooze" | "delete",
 *   title: string,
 *   snoozeMs?: number,
 * }} TaskAction
 * @typedef {{
 *   key: string,
 *   value: string,
 * }} PrefAction
 */

const SNOOZE_MS = {
  "1h": 3600_000,
  "2h": 7200_000,
  tonight: 4 * 3600_000,
  tomorrow: 24 * 3600_000,
};

/**
 * @param {string} hint
 */
function parseSnoozeMs(hint) {
  const raw = String(hint || "").trim().toLowerCase();
  if (!raw) return SNOOZE_MS["1h"];
  if (SNOOZE_MS[raw]) return SNOOZE_MS[raw];
  const h = raw.match(/^(\d+)\s*h/);
  if (h) return Number(h[1]) * 3600_000;
  return SNOOZE_MS["1h"];
}

/**
 * @param {TaskAction[]} actions
 * @param {{ storage?: Storage | null, isEn?: boolean }} [opts]
 */
export function applyTaskActions(actions = [], opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const isEn = Boolean(opts.isEn);
  /** @type {{ ok: boolean, title: string, action: string }[]} */
  const results = [];

  for (const item of actions) {
    const task = findActiveTaskByTitleHint(item.title, { storage });
    if (!task) {
      results.push({ ok: false, title: item.title, action: item.action });
      continue;
    }
    if (item.action === "done") {
      completeTask(task.id, { storage });
      removePriorityIfPresent(task.id, { storage });
      results.push({ ok: true, title: task.title, action: "done" });
    } else if (item.action === "snooze") {
      const until = Date.now() + (item.snoozeMs ?? SNOOZE_MS["1h"]);
      snoozeTask(task.id, until, { storage });
      results.push({ ok: true, title: task.title, action: "snooze" });
    } else if (item.action === "delete") {
      deleteTask(task.id, { storage });
      removePriorityIfPresent(task.id, { storage });
      results.push({ ok: true, title: task.title, action: "delete" });
    }
  }

  return {
    results,
    label: (r) => {
      if (!r.ok) {
        return isEn
          ? `Task not found: ${r.title}`
          : `搵唔到任務：${r.title}`;
      }
      if (r.action === "done") {
        return isEn ? `Done: ${r.title}` : `完成：${r.title}`;
      }
      if (r.action === "snooze") {
        return isEn ? `Snoozed: ${r.title}` : `延後：${r.title}`;
      }
      return isEn ? `Removed: ${r.title}` : `已刪除：${r.title}`;
    },
  };
}

/**
 * @param {PrefAction[]} prefs
 * @param {{ storage?: Storage | null, onRemindersChange?: (enabled: boolean) => void }} [opts]
 */
export function applyPreferenceActions(prefs = [], opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  /** @type {Record<string, string>} */
  const patch = {};

  for (const pref of prefs) {
    const key = String(pref.key || "").trim();
    const value = String(pref.value || "").trim();
    if (!key || !value) continue;
    if (key === "tone" && ["professional", "friendly", "playful"].includes(value)) {
      patch.tone = value;
    }
    if (key === "helpwith" && ["work", "life", "both", "chat"].includes(value)) {
      patch.helpWith = value;
    }
    if (key === "morningbrief") {
      patch.morningBrief = value === "on" || value === "true" || value === "1";
    }
    if (key === "reminders") {
      const on = value === "on" || value === "true" || value === "1";
      saveReminderPrefs(on, storage);
      opts.onRemindersChange?.(on);
    }
  }

  if (Object.keys(patch).length) {
    savePreferences(patch, { storage });
  }

  return patch;
}

/**
 * @param {string} snoozeHint
 */
export function snoozeDurationFromHint(snoozeHint) {
  return parseSnoozeMs(snoozeHint);
}
