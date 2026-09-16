/**
 * Match active tasks by title hint (conversation / LLM tags).
 */
import { listActiveTasks } from "./taskStore.js";

export const TASK_MATCH_SCHEMA = "amoji.secretary.taskMatch.v1";

/**
 * @param {string} hint
 * @param {{ storage?: Storage | null, now?: number }} [opts]
 */
export function findActiveTaskByTitleHint(hint, opts = {}) {
  const q = String(hint || "").trim().toLowerCase();
  if (!q) return null;
  const tasks = listActiveTasks(opts);
  const exact = tasks.find((t) => t.title.toLowerCase() === q);
  if (exact) return exact;
  const includes = tasks.find(
    (t) =>
      t.title.toLowerCase().includes(q) || q.includes(t.title.toLowerCase()),
  );
  return includes || null;
}
