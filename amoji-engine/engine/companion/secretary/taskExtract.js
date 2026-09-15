/**
 * Heuristic task extraction from chat messages (Phase 1 — no extra LLM call).
 */
/**
 * @typedef {{
 *   title: string,
 *   dueAt?: number | null,
 *   category?: "work" | "life" | "personal",
 * }} ExtractedTaskDraft
 * @typedef {{
 *   task?: ExtractedTaskDraft,
 *   confidence: number,
 *   reason?: string,
 * }} TaskExtractionResult
 */

const EN_PATTERNS = [
  {
    re: /^(?:please\s+)?remind me to (.+?)(?:\s+(?:at|on|by)\s+(.+))?\.?$/i,
    group: 1,
    dueGroup: 2,
  },
  {
    re: /^(?:add\s+)?todo[:\s]+(.+)$/i,
    group: 1,
  },
  {
    re: /^task[:\s]+(.+)$/i,
    group: 1,
  },
  {
    re: /^remember to (.+)$/i,
    group: 1,
  },
];

const YUE_PATTERNS = [
  {
    re: /^(?:請)?提醒我(.+?)(?:[，,]\s*(.+))?$/i,
    group: 1,
    dueGroup: 2,
  },
  {
    re: /^記得(.+)$/i,
    group: 1,
  },
  {
    re: /^(?:加|新增)(?:任務|todo)[：:\s]*(.+)$/i,
    group: 1,
  },
  {
    re: /^幫我記低[：:\s]*(.+)$/i,
    group: 1,
  },
];

/**
 * @param {string} chunk
 * @param {boolean} isEn
 * @param {number} [now]
 */
export function parseDueHint(chunk, isEn, now = Date.now()) {
  const text = String(chunk || "").trim().toLowerCase();
  if (!text) return null;

  const base = new Date(now);

  if (/tomorrow|明日|聽日/.test(text)) {
    base.setDate(base.getDate() + 1);
    base.setHours(9, 0, 0, 0);
    return base.getTime();
  }
  if (/tonight|今晚/.test(text)) {
    base.setHours(20, 0, 0, 0);
    if (base.getTime() < now) base.setDate(base.getDate() + 1);
    return base.getTime();
  }
  if (/today|今日/.test(text)) {
    base.setHours(18, 0, 0, 0);
    if (base.getTime() < now) base.setHours(23, 0, 0, 0);
    return base.getTime();
  }

  const hm = text.match(/(\d{1,2})\s*(?::|點|時)\s*(\d{2})?/);
  if (hm) {
    const h = Number.parseInt(hm[1], 10);
    const m = hm[2] ? Number.parseInt(hm[2], 10) : 0;
    base.setHours(h, m, 0, 0);
    if (base.getTime() < now) base.setDate(base.getDate() + 1);
    return base.getTime();
  }

  if (isEn && /next week/.test(text)) {
    base.setDate(base.getDate() + 7);
    base.setHours(9, 0, 0, 0);
    return base.getTime();
  }

  return null;
}

/**
 * @param {string} message
 * @param {{ isEn?: boolean, now?: number, mode?: string }} [opts]
 */
export function extractTaskFromMessage(message, opts = {}) {
  const isEn = Boolean(opts.isEn);
  const now = opts.now ?? Date.now();
  const text = String(message || "").trim();
  if (!text || text.length < 4) {
    return { confidence: 0 };
  }

  const patterns = isEn ? EN_PATTERNS : YUE_PATTERNS;
  for (const pattern of patterns) {
    const match = text.match(pattern.re);
    if (!match) continue;
    const title = String(match[pattern.group] || "").trim();
    if (!title || title.length < 2) continue;
    const dueChunk = pattern.dueGroup ? match[pattern.dueGroup] : "";
    const dueAt = parseDueHint(dueChunk || title, isEn, now);
    const category =
      opts.mode === "life" || /mom|grocery|buy|食|買/.test(title)
        ? "life"
        : opts.mode === "work" || /email|meeting|report|會|報告/.test(title)
          ? "work"
          : "personal";
    return {
      confidence: 0.82,
      reason: "pattern",
      task: {
        title: title.replace(/\s+(?:at|on|by)\s+.+$/i, "").trim(),
        dueAt,
        category,
      },
    };
  }

  if (/^(?:幫我|help me)\s*(?:記|track|add).{3,}/i.test(text)) {
    const stripped = text
      .replace(/^(?:幫我|help me)\s*(?:記|track|add)\s*/i, "")
      .trim();
    if (stripped.length >= 3) {
      return {
        confidence: 0.55,
        reason: "soft-intent",
        task: {
          title: stripped,
          dueAt: parseDueHint(stripped, isEn, now),
          category: "personal",
        },
      };
    }
  }

  return { confidence: 0 };
}
