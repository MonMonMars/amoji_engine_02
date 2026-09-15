/**
 * Parse structured secretary tags from LLM replies (Phase 2).
 *
 * Tags:
 *   [mood:happy]
 *   [task:Title|due:tonight]
 *   [memory:Fact to remember]
 *   [draft:Copyable draft text]
 */
import { parseDueHint } from "./taskExtract.js";

export const SECRETARY_REPLY_PARSER_SCHEMA = "amoji.secretary.replyParser.v1";

const TAG_PATTERN =
  /\[(mood|task|memory|draft):([^\]]+)\]/gi;

/**
 * @param {string | null | undefined} raw
 * @param {{ isEn?: boolean, now?: number }} [opts]
 */
export function parseSecretaryReply(raw, opts = {}) {
  const isEn = Boolean(opts.isEn);
  const now = opts.now ?? Date.now();
  const text = String(raw || "");
  const tasks = [];
  const memories = [];
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
      const title = parts[0] || "";
      const duePart = parts.find((p) => /^due:/i.test(p));
      const dueHint = duePart ? duePart.replace(/^due:/i, "").trim() : "";
      if (title) {
        tasks.push({
          title,
          dueAt: parseDueHint(dueHint || title, isEn, now),
          category: "personal",
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
    memories,
    drafts,
  };
}
