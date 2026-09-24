/**
 * Session reply language — locked at start (picker or menu), not inferred from user text.
 */
export const COMPANION_SESSION_REPLY_LANGUAGE_SCHEMA =
  "amoji.companionSessionReplyLanguage.v1";

/**
 * @param {unknown} value
 * @returns {"en" | "yue"}
 */
export function normalizeReplyLangCode(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "en" || raw.startsWith("en-") || raw === "english") return "en";
  return "yue";
}

/**
 * @param {boolean} isEnglish
 */
export function buildSessionReplyLanguageRule(isEnglish = false) {
  if (isEnglish) {
    return [
      "SESSION REPLY LANGUAGE: English only.",
      "The user may write in Cantonese, Mandarin, or any other language — always answer in natural spoken English.",
      "Never mix English and Chinese in the same reply unless quoting a proper noun.",
    ].join(" ");
  }
  return [
    "SESSION REPLY LANGUAGE: Cantonese (粵語口語) only.",
    "The user may write in English, Mandarin, or any other language — always answer in spoken Hong Kong Cantonese with natural particles.",
    "Never mix Cantonese and English in the same reply unless quoting a proper noun.",
  ].join(" ");
}

/**
 * @param {Record<string, unknown>} [body]
 * @returns {"en" | "yue"}
 */
export function replyLangFromChatBody(body = {}) {
  if (body.replyLang != null) return normalizeReplyLangCode(body.replyLang);
  if (body.langCode != null) return normalizeReplyLangCode(body.langCode);
  if (body.lang != null) return normalizeReplyLangCode(body.lang);
  return "yue";
}

/**
 * @param {string} systemPrompt
 * @returns {"en" | "yue"}
 */
export function inferReplyLangFromSystemPrompt(systemPrompt) {
  const sys = String(systemPrompt || "");
  if (/SESSION REPLY LANGUAGE: English/i.test(sys)) return "en";
  if (/personalityEn|spoken English|English only/i.test(sys) && !/粵語口語/.test(sys)) {
    return "en";
  }
  if (/用粵語口語|粵語口語回覆|Cantonese \(粵語口語\)/.test(sys)) return "yue";
  return "yue";
}
