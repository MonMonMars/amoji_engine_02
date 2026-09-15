/**
 * Today tab briefing — greeting, due tasks, proactive companion line.
 */
import { listActiveTasks, listOverdueTasks, listTasksDueToday } from "./taskStore.js";
import { getPreferences, readLastChatSummary } from "./memoryStore.js";
import { modeLabel, readSecretaryMode } from "./modePresets.js";
import { listTodayPriorities } from "./prioritiesStore.js";

/**
 * @param {number} [now]
 */
export function timeOfDayBucket(now = Date.now()) {
  const hour = new Date(now).getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * @param {boolean} isEn
 * @param {number} [now]
 */
export function greetingLine(isEn, now = Date.now()) {
  const bucket = timeOfDayBucket(now);
  if (isEn) {
    if (bucket === "morning") return "Good morning";
    if (bucket === "afternoon") return "Good afternoon";
    return "Good evening";
  }
  if (bucket === "morning") return "早晨";
  if (bucket === "afternoon") return "午安";
  return "晚上好";
}

/**
 * @param {{
 *   isEn?: boolean,
 *   storage?: Storage | null,
 *   now?: number,
 * }} [opts]
 */
export function buildTodayBriefing(opts = {}) {
  const isEn = Boolean(opts.isEn);
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const now = opts.now ?? Date.now();
  const prefs = getPreferences({ storage });
  const mode = readSecretaryMode(storage);
  const dueToday = listTasksDueToday({ storage, now });
  const overdue = listOverdueTasks({ storage, now });
  const active = listActiveTasks({ storage, now });
  const priorityIds = listTodayPriorities({ storage, now });
  const priorityTasks = priorityIds
    .map((id) => active.find((t) => t.id === id))
    .filter(Boolean);
  const lastSummary = readLastChatSummary(storage);

  const greet = greetingLine(isEn, now);
  const headline = isEn
    ? `${greet} — I'm your Amoji secretary (${modeLabel(mode, true)} mode).`
    : `${greet} — 我係你嘅 Amoji 秘書（${modeLabel(mode, false)}模式）。`;

  const lines = [headline];

  if (priorityTasks.length) {
    const titles = priorityTasks.map((t) => t.title).join(isEn ? "; " : "；");
    lines.push(
      isEn
        ? `Today's top ${priorityTasks.length}: ${titles}`
        : `今日 Top ${priorityTasks.length}：${titles}`,
    );
  }

  if (prefs.morningBrief) {
    if (overdue.length) {
      lines.push(
        isEn
          ? `You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}.`
          : `你有 ${overdue.length} 項過期任務。`,
      );
    }
    if (dueToday.length) {
      lines.push(
        isEn
          ? `${dueToday.length} due today — want to tackle the first one together?`
          : `今日有 ${dueToday.length} 項任務 — 要一齊處理第一項嗎？`,
      );
    } else if (!overdue.length && active.length) {
      lines.push(
        isEn
          ? `${active.length} open task${active.length > 1 ? "s" : ""} on your list.`
          : `清單上有 ${active.length} 項未完成任務。`,
      );
    } else if (!active.length) {
      lines.push(
        isEn
          ? "No tasks yet — tell me one thing to track."
          : "暫時未有任務 — 同我講一件想跟進嘅事啦。",
      );
    }
  }

  if (lastSummary) {
    const clipped =
      lastSummary.length > 120 ? `${lastSummary.slice(0, 117)}…` : lastSummary;
    lines.push(
      isEn ? `Last chat: “${clipped}”` : `上次傾計：「${clipped}」`,
    );
  }

  const proactive = isEn
    ? "Tap Chat to talk, or add a task below."
    : "按「傾計」同我講，或者喺下面加任務。";

  return {
    greeting: greet,
    headline,
    lines,
    proactive,
    dueToday,
    overdue,
    activeCount: active.length,
    priorityTasks,
    mode,
  };
}
