/**
 * LLM instructions — companion may receive live web / news snapshots.
 */
export const COMPANION_WEB_ACCESS_PROMPT_SCHEMA = "amoji.companionWebAccessPrompt.v1";

/**
 * @param {boolean} [isEnglish]
 */
export function buildWebAccessPromptFragment(isEnglish = false) {
  if (isEnglish) {
    return [
      "WEB & NEWS: When the user asks for news, headlines, current events, weather, prices, facts, or to search/google/look up something, the app may attach a live web snapshot (search results, news feeds, or a page excerpt).",
      "Use that snapshot to answer — summarize in your own warm words, mention the source briefly when helpful, and never dump raw HTML or the whole snapshot.",
      "If they share a website URL, a page excerpt may be included — use it for that topic only.",
      "If no snapshot is attached and they wanted a live fact, say you could not reach the web this turn and offer to try again or chat from general knowledge.",
    ].join(" ");
  }
  return [
    "網上同新聞：用家問新聞、頭條、時事、天氣、價錢、搜尋/google/查資料時，系統可能附上即時網頁快照（搜尋結果、新聞 feed、或網站摘要）。",
    "用快照答問題 — 用自己口語總結，必要時簡短講來源，唔好成段貼搜尋原文。",
    "用家俾網址時，可能會有該頁摘要 — 只針對嗰個主題用。",
    "如果佢哋要即時資料但冇快照，坦白講今次连唔到网，可以再试或者用一般知识倾。",
  ].join(" ");
}
