/**
 * Lightweight web search for companion LLM — DuckDuckGo + Wikipedia fallback.
 */

export const COMPANION_WEB_SEARCH_SCHEMA = "amoji.companionWebSearch.v1";

const SEARCH_HINT_RE =
  /天氣|weather|新聞|news|今日|今天|tonight|today|而家|現在|now|current|latest|幾時|几时|when is|what time|几錢|幾錢|價格|price|cost|搜|查下|查詢|google|網上|online|who is|what is|什麼是|係咩|係乜|202[4-9]|breaking|headline|股價|stock|比分|score|幾多|多少|邊度|邊個|點樣|為何|為什麼|why|how much|where|when|最新|資料|信息|资讯|百科|wiki/i;

const QUESTION_RE =
  /[?？]|什麼|什麼|咩|乜|幾|多少|邊度|邊個|點樣|為何|為什麼|點解|what|who|when|where|why|how|最新|幾時|tell me about|look up|search for/i;

/**
 * @param {string | null | undefined} message
 */
export function needsWebSearch(message) {
  const text = String(message || "").trim();
  if (!text) return false;
  return SEARCH_HINT_RE.test(text) || QUESTION_RE.test(text);
}

/**
 * @param {string | null | undefined} message
 * @param {{ basicMode?: boolean, force?: boolean }} [opts]
 */
export function shouldTryWebSearch(message, opts = {}) {
  const text = String(message || "").trim();
  if (!text) return false;
  if (opts.force) return true;
  if (needsWebSearch(text)) return true;
  if (!opts.basicMode) return false;
  return QUESTION_RE.test(text);
}

/**
 * @param {unknown} topic
 */
function readTopicText(topic) {
  if (!topic || typeof topic !== "object") return "";
  if (typeof topic.Text === "string") return topic.Text;
  if (Array.isArray(topic.Topics)) {
    for (const nested of topic.Topics.slice(0, 2)) {
      const line = readTopicText(nested);
      if (line) return line;
    }
  }
  return "";
}

/**
 * @param {string} query
 * @param {typeof fetch} fetchImpl
 * @param {string} lang
 */
async function searchWikipedia(query, fetchImpl, lang = "en") {
  const title = query.replace(/\s+/g, "_").slice(0, 120);
  const wikiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const wikiRes = await fetchImpl(wikiUrl, {
    headers: { Accept: "application/json" },
  });
  if (!wikiRes.ok) return null;
  const wiki = await wikiRes.json();
  const extract = String(wiki.extract || "").trim();
  if (!extract) return null;
  return {
    ok: true,
    summary: extract.slice(0, 1400),
    source: `wikipedia-${lang}`,
  };
}

/**
 * @param {string} query
 * @param {typeof fetch} [fetchImpl]
 */
export async function searchWeb(query, fetchImpl = fetch) {
  const q = String(query || "").trim().slice(0, 240);
  if (!q) return { ok: false, summary: "", source: null };

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const parts = [];
      if (data.AbstractText) parts.push(String(data.AbstractText));
      if (data.Answer) parts.push(String(data.Answer));
      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 6)) {
          const line = readTopicText(topic);
          if (line) parts.push(line);
        }
      }
      const summary = parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 1400);
      if (summary) {
        return { ok: true, summary, source: "duckduckgo" };
      }
    }
  } catch {
    /* try wikipedia */
  }

  const langs = /[\u4e00-\u9fff]/.test(q) ? ["zh", "en"] : ["en", "zh"];
  for (const lang of langs) {
    try {
      const wiki = await searchWikipedia(q, fetchImpl, lang);
      if (wiki) return wiki;
    } catch {
      /* next lang */
    }
  }

  return { ok: false, summary: "", source: null };
}

/**
 * @param {string} message
 * @param {typeof fetch} [fetchImpl]
 * @param {{ basicMode?: boolean, force?: boolean }} [opts]
 */
export async function fetchWebContextForChat(message, fetchImpl = fetch, opts = {}) {
  const force = opts.force === true;
  if (!shouldTryWebSearch(message, { ...opts, force })) {
    return { searched: false, context: "", source: null };
  }
  const result = await searchWeb(message, fetchImpl);
  if (!result.ok || !result.summary) {
    return { searched: true, context: "", source: result.source };
  }
  const context = [
    "Web search snapshot (may be incomplete — cite uncertainty if unsure):",
    result.summary,
  ].join("\n");
  return { searched: true, context, source: result.source };
}
