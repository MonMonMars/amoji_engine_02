/**
 * Heuristic memory extraction from user chat (Phase 2).
 */
/**
 * @typedef {{ text: string, category?: string }} MemoryDraft
 * @typedef {{ memory?: MemoryDraft, confidence: number, reason?: string }} MemoryExtractionResult
 */

const EN_PATTERNS = [
  { re: /^remember that (.+)$/i, group: 1, category: "general" },
  { re: /^remember[:\s]+(.+)$/i, group: 1, category: "general" },
  { re: /^my (.+?) is (.+)$/i, combine: true, category: "preference" },
  { re: /^i (?:prefer|like|love|hate) (.+)$/i, group: 1, category: "preference" },
];

const YUE_PATTERNS = [
  { re: /^記住我(.+)$/i, group: 1, category: "general" },
  { re: /^記低[：:\s]*(.+)$/i, group: 1, category: "general" },
  { re: /^我(?:鍾意|喜歡|唔鍾意|讨厌)(.+)$/i, group: 1, category: "preference" },
  { re: /^我(.+?)係(.+)$/i, combine: true, category: "preference" },
];

/**
 * @param {string} message
 * @param {{ isEn?: boolean }} [opts]
 */
export function extractMemoryFromMessage(message, opts = {}) {
  const isEn = Boolean(opts.isEn);
  const text = String(message || "").trim();
  if (!text || text.length < 4) {
    return { confidence: 0 };
  }

  const patterns = isEn ? EN_PATTERNS : YUE_PATTERNS;
  for (const pattern of patterns) {
    const match = text.match(pattern.re);
    if (!match) continue;
    let factText = "";
    if (pattern.combine && match[2]) {
      factText = isEn
        ? `My ${match[1]} is ${match[2]}`
        : `我${match[1]}係${match[2]}`;
    } else {
      factText = String(match[pattern.group] || "").trim();
    }
    if (!factText || factText.length < 3) continue;
    return {
      confidence: 0.8,
      reason: "pattern",
      memory: {
        text: factText,
        category: pattern.category || "general",
      },
    };
  }

  if (/^(?:記住|remember)\b/i.test(text) && text.length >= 8) {
    const stripped = text.replace(/^(?:記住|remember)\s*/i, "").trim();
    if (stripped.length >= 4) {
      return {
        confidence: 0.55,
        reason: "soft-intent",
        memory: { text: stripped, category: "general" },
      };
    }
  }

  return { confidence: 0 };
}
