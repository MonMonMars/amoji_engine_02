/**
 * Parse structured secretary tags from LLM replies (Phase 2).
 *
 * Tags:
 *   [mood:happy]
 *   [task:Title|due:tonight]
 *   [task:done:Title] [task:snooze:Title|1h] [task:delete:Title]
 *   [memory:Fact to remember]
 *   [pref:tone:friendly] [pref:helpWith:work] [pref:morningBrief:on]
 *   [draft:Copyable draft text]
 */
import { parseUiIntentTags } from "../companionUiIntent.js";
import { parseDueHint } from "./taskExtract.js";
import { snoozeDurationFromHint } from "./secretaryTagActions.js";

export const SECRETARY_REPLY_PARSER_SCHEMA = "amoji.secretary.replyParser.v1";

const TAG_PATTERN =
  /\[(mood|task|memory|draft|pref):([^\]]+)\]/gi;

/**
 * @param {string | null | undefined} raw
 * @param {{ isEn?: boolean, now?: number }} [opts]
 */
export function parseSecretaryReply(raw, opts = {}) {
  const isEn = Boolean(opts.isEn);
  const now = opts.now ?? Date.now();
  const uiParsed = parseUiIntentTags(raw);
  const text = uiParsed.stripped;
  const tasks = [];
  /** @type {{ action: "done" | "snooze" | "delete", title: string, snoozeMs?: number }[]} */
  const taskActions = [];
  const memories = [];
  /** @type {{ key: string, value: string }[]} */
  const preferences = [];
  const drafts = [];
  let mood = "happy";

  const stripped = text.replace(TAG_PATTERN, (match, kind, payload) => {
    const value = String(payload || "").trim();
    if (!value) return "";
    const key = String(kind).toLowerCase();
    if (key === "mood") {
      mood = value.toLowerCase();
      return "";
    }
    if (key === "task") {
      const parts = value.split("|").map((p) => p.trim());
      const head = parts[0] || "";
      const actionMatch = head.match(/^(done|complete|snooze|delete):(.+)$/i);
      if (actionMatch) {
        const actionKey = actionMatch[1].toLowerCase();
        const title = actionMatch[2].trim();
        const snoozePart = parts.find((p) => /^for:/i.test(p) || /^in:/i.test(p));
        const snoozeHint = snoozePart
          ? snoozePart.replace(/^(for|in):/i, "").trim()
          : "";
        if (title) {
          if (actionKey === "done" || actionKey === "complete") {
            taskActions.push({ action: "done", title });
          } else if (actionKey === "snooze") {
            taskActions.push({
              action: "snooze",
              title,
              snoozeMs: snoozeDurationFromHint(snoozeHint),
            });
          } else if (actionKey === "delete") {
            taskActions.push({ action: "delete", title });
          }
        }
        return "";
      }
      const duePart = parts.find((p) => /^due:/i.test(p));
      const dueHint = duePart ? duePart.replace(/^due:/i, "").trim() : "";
      if (head) {
        tasks.push({
          title: head,
          dueAt: parseDueHint(dueHint || head, isEn, now),
          category: "personal",
        });
      }
      return "";
    }
    if (key === "pref") {
      const prefParts = value.split(":").map((p) => p.trim());
      if (prefParts.length >= 2) {
        preferences.push({
          key: prefParts[0].toLowerCase(),
          value: prefParts.slice(1).join(":").trim(),
        });
      }
      return "";
    }
    if (key === "memory") {
      memories.push(value);
      return "";
    }
    if (key === "draft") {
      drafts.push(value);
      return "";
    }
    return match;
  });

  const reply = stripped
    .replace(/\s*\[mood:\w+\]\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const trailingMood = (text.match(/\[mood:(\w+)\]/i) || [])[1];
  if (trailingMood) mood = trailingMood.toLowerCase();

  return {
    reply,
    mood,
    tasks,
    taskActions,
    memories,
    preferences,
    drafts,
    uiIntents: uiParsed.intents,
  };
}
