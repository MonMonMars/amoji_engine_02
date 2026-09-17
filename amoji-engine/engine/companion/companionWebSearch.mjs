/**
 * Live web snapshots for companion LLM — weather, DuckDuckGo, Wikipedia.
 */
export const COMPANION_WEB_SEARCH_SCHEMA = "amoji.companionWebSearch.v1";

const SEARCH_UA = "AmojiCompanion/1.0 (web-search)";
const SEARCH_TIMEOUT_MS = 7000;

/** Live / lookup facts only — not greetings, 今日點呀, or generic 咩/how questions. */
const LIVE_FACT_RE =
  /天氣|天气|weather|溫度|温度|气温|幾度|几度|下雨|雨不雨|forecast|觀測|观测|天文台|新聞|新闻|\bnews\b|headline|breaking|股價|股价|\bstock\b|比分|\bscore\b|幾錢|几錢|價格|价格|\bprices?\b|\bcost\b|匯率|汇率|最新消息/i;

const LOOKUP_RE =
  /搜(?:索|尋|一下)?|查下|查詢|查询|\bgoogle\b|網上查|网上查|\bwiki\b|百科|\blookup\b|look\s*up|\bsearch(?:\s+for)?\b|tell me about|介紹一下|介绍一下|什麼是|什么是|係咩嚟|係乜嚟/i;

const DEFINE_EN_RE =
  /\b(?:who\s+is|who'?s|what\s+is|what'?s|what\s+are|how\s+many|how\s+much|where\s+is|when\s+is|what\s+time)\b/i;

const CANTONESE_FACT_RE =
  /人口|面積|面积|首都|總統|总统|首相|匯率|汇率|\bGDP\b|幾多人|多少人|邊個係|边个是/i;

const WEATHER_RE =
  /天氣|天气|weather|溫度|温度|气温|幾度|几度|下雨|雨不雨|forecast|觀測|观测|天文台/i;

const LATIN_STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "what",
  "who",
  "when",
  "where",
  "why",
  "how",
  "today",
  "tonight",
  "now",
  "please",
  "can",
  "you",
  "me",
  "in",
  "of",
  "for",
  "and",
  "or",
  "to",
  "it",
  "this",
  "that",
  "my",
  "your",
  "latest",
  "current",
  "about",
  "tell",
]);

/**
 * @param {string | null | undefined} message
 */
export function needsWebSearch(message) {
  const text = String(message || "").trim();
  if (!text) return false;
  return (
    WEATHER_RE.test(text) ||
    LIVE_FACT_RE.test(text) ||
    LOOKUP_RE.test(text) ||
    DEFINE_EN_RE.test(text) ||
    CANTONESE_FACT_RE.test(text)
  );
}

/**
 * @param {string | null | undefined} message
 * @param {{ basicMode?: boolean, force?: boolean }} [opts]
 */
export function shouldTryWebSearch(message, opts = {}) {
  const text = String(message || "").trim();
  if (!text) return false;
  if (opts.force) return true;
  // basicMode must not expand search to every question — that stuffed
  // unrelated DDG HTML into casual chat and made the LLM sound broken.
  return needsWebSearch(text);
}

/**
 * Content words worth matching against a search snapshot.
 * @param {string} query
 */
export function significantSearchTokens(query) {
  const text = String(query || "");
  const out = [];
  for (const word of text.match(/[a-z0-9]{3,}/gi) || []) {
    if (!LATIN_STOP.has(word.toLowerCase())) out.push(word);
  }
  const cjk = text.replace(
    /今日|今天|而家|現在|现在|今晚|點呀|点呀|唔該|唔该|請|请|幫我|帮我|[?？！!。，,]/g,
    "",
  );
  for (const run of cjk.match(/[\u4e00-\u9fff]{2,}/g) || []) {
    if (!out.includes(run)) out.push(run);
    for (let i = 0; i < run.length - 1; i += 1) {
      const gram = run.slice(i, i + 2);
      if (!out.includes(gram)) out.push(gram);
    }
  }
  return out;
}

/**
 * Drop DDG/wiki dumps that do not answer this turn.
 * @param {string} query
 * @param {string} summary
 * @param {string | null} [source]
 */
export function snapshotLooksUseful(query, summary, source = null) {
  const s = String(summary || "").trim();
  if (s.length < 12) return false;
  if (source === "wttr" || (WEATHER_RE.test(query) && /°\s*[cf]|humidity|rain|sunny|cloud|weather/i.test(s))) {
    return true;
  }
  const tokens = significantSearchTokens(query);
  if (!tokens.length) return true;
  const lower = s.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

/**
 * @param {string} message
 */
export function extractSearchQuery(message) {
  return String(message || "")
    .replace(
      /^(please |can you |could you |幫我|帮我|唔該|唔该|請|请)+/i,
      "",
    )
    .replace(/[?？]+$/g, "")
    .trim()
    .slice(0, 180);
}

/**
 * @param {string} query
 */
export function weatherLocation(query) {
  const q = String(query || "");
  if (/香港|hong\s*kong/i.test(q)) return "Hong Kong";
  if (/台北|taipei|台灣|台湾|taiwan/i.test(q)) return "Taipei";
  if (/東京|东京|tokyo/i.test(q)) return "Tokyo";
  if (/大阪|osaka/i.test(q)) return "Osaka";
  if (/北京|beijing/i.test(q)) return "Beijing";
  if (/上海|shanghai/i.test(q)) return "Shanghai";
  if (/深圳|shenzhen/i.test(q)) return "Shenzhen";
  if (/廣州|广州|guangzhou/i.test(q)) return "Guangzhou";
  if (/新加坡|singapore/i.test(q)) return "Singapore";
  if (/紐約|纽约|new york/i.test(q)) return "New York";
  if (/倫敦|伦敦|london/i.test(q)) return "London";
  if (/巴黎|paris/i.test(q)) return "Paris";
  const stripped = q
    .replace(
      /天氣|天气|weather|today|今日|今天|而家|現在|现在|now|tonight|forecast|溫度|温度|幾度|几度|點呀|点呀|how is|what's|what is|the/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length >= 2 && stripped.length < 48) return stripped;
  return "Hong Kong";
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

function decodeHtml(raw) {
  return String(raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function fetchText(fetchImpl, url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      ...init,
      signal: init.signal || ctrl.signal,
      headers: {
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
        "User-Agent": SEARCH_UA,
        ...(init.headers || {}),
      },
    });
    if (!res?.ok) return { ok: false, text: "", json: null };
    const contentType = String(res.headers?.get?.("content-type") || "");
    if (typeof res.text === "function") {
      const text = await res.text();
      let json = null;
      if (
        /json/i.test(contentType) ||
        text.trim().startsWith("{") ||
        text.trim().startsWith("[")
      ) {
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }
      return { ok: true, text, json };
    }
    if (typeof res.json === "function") {
      const json = await res.json();
      return { ok: true, text: JSON.stringify(json ?? ""), json };
    }
    return { ok: false, text: "", json: null };
  } finally {
    clearTimeout(timer);
  }
}

async function searchWttr(query, fetchImpl) {
  const place = weatherLocation(query);
  const packed = await fetchText(
    fetchImpl,
    `https://wttr.in/${encodeURIComponent(place)}?format=j1`,
  );
  const current = packed.json?.current_condition?.[0];
  if (!current) return null;
  const desc =
    current.weatherDesc?.[0]?.value || current.weatherDesc || "n/a";
  const tempC = current.temp_C ?? current.temp_F;
  const feels = current.FeelsLikeC ?? current.FeelsLikeF;
  const humidity = current.humidity;
  const line = `${place}: ${desc}, ${tempC}°C (feels ${feels}°C), humidity ${humidity}%.`;
  return { summary: line, source: "wttr" };
}

async function searchDuckDuckGoInstant(query, fetchImpl) {
  const packed = await fetchText(
    fetchImpl,
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=amoji`,
  );
  const data = packed.json;
  if (!data) return null;
  const parts = [];
  if (data.AbstractText) parts.push(String(data.AbstractText));
  if (data.Answer) parts.push(String(data.Answer));
  if (Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics.slice(0, 6)) {
      const line = readTopicText(topic);
      if (line) parts.push(line);
    }
  }
  const summary = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!summary) return null;
  return { summary: summary.slice(0, 1400), source: "duckduckgo" };
}

/**
 * @param {string} html
 */
export function parseDuckDuckGoHtml(html) {
  const titles = [...String(html || "").matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)];
  const snips = [...String(html || "").matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/gi)];
  const lines = [];
  const n = Math.min(6, Math.max(titles.length, snips.length));
  for (let i = 0; i < n; i += 1) {
    const title = decodeHtml(titles[i]?.[1] || "");
    const snip = decodeHtml(snips[i]?.[1] || "");
    const line = [title, snip].filter(Boolean).join(" — ");
    if (line) lines.push(line);
  }
  return lines.join(" ").replace(/\s+/g, " ").trim().slice(0, 1400);
}

async function searchDuckDuckGoHtml(query, fetchImpl) {
  const packed = await fetchText(
    fetchImpl,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: { Accept: "text/html" } },
  );
  const summary = parseDuckDuckGoHtml(packed.text);
  if (!summary) return null;
  return { summary, source: "duckduckgo-html" };
}

async function searchWikipedia(query, fetchImpl, lang) {
  const open = await fetchText(
    fetchImpl,
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`,
  );
  const title = Array.isArray(open.json) ? String(open.json[1]?.[0] || "") : "";
  if (!title) return null;
  const wikiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const wiki = await fetchText(fetchImpl, wikiUrl, {
    headers: { Accept: "application/json" },
  });
  const extract = String(wiki.json?.extract || "").trim();
  if (!extract) return null;
  return {
    summary: extract.slice(0, 1400),
    source: `wikipedia-${lang}`,
  };
}

/**
 * @param {string} query
 * @param {typeof fetch} [fetchImpl]
 */
export async function searchWeb(query, fetchImpl = fetch) {
  const q = extractSearchQuery(query);
  if (!q) return { ok: false, summary: "", source: null };

  /** @type {Promise<({ summary: string, source: string } | null)>[]} */
  const jobs = [];
  if (WEATHER_RE.test(q)) {
    jobs.push(searchWttr(q, fetchImpl).catch(() => null));
  }
  jobs.push(searchDuckDuckGoInstant(q, fetchImpl).catch(() => null));
  jobs.push(searchDuckDuckGoHtml(q, fetchImpl).catch(() => null));
  const langs = /[\u4e00-\u9fff]/.test(q) ? ["zh", "en"] : ["en", "zh"];
  jobs.push(searchWikipedia(q, fetchImpl, langs[0]).catch(() => null));

  const settled = (await Promise.all(jobs)).filter(Boolean);
  const ordered = [
    ...settled.filter((hit) => hit.source === "wttr"),
    ...settled.filter((hit) => hit.source !== "wttr"),
  ];
  const parts = [];
  let source = null;
  for (const hit of ordered) {
    if (!hit?.summary) continue;
    if (!source) source = hit.source;
    if (!parts.includes(hit.summary)) parts.push(hit.summary);
    if (parts.join(" ").length > 1600) break;
  }
  const summary = parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 1800);
  if (!summary) return { ok: false, summary: "", source: null };
  return { ok: true, summary, source };
}

/**
 * @param {string} message
 * @param {typeof fetch} [fetchImpl]
 * @param {{ basicMode?: boolean, force?: boolean, viaApi?: boolean }} [opts]
 */
export async function fetchWebContextForChat(message, fetchImpl = fetch, opts = {}) {
  const force = opts.force === true;
  if (!shouldTryWebSearch(message, { ...opts, force })) {
    return { searched: false, context: "", source: null };
  }
  if (opts.viaApi) {
    try {
      const res = await fetchImpl("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: message }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.summary) {
          return packWebContext(message, {
            ok: true,
            summary: String(data.summary),
            source: data.source || "api",
          });
        }
        if (data?.ok === false && data?.searched) {
          return { searched: true, context: "", source: data.source || null };
        }
      }
    } catch {
      /* fall through to direct search */
    }
  }
  const result = await searchWeb(message, fetchImpl);
  return packWebContext(message, result);
}

/**
 * @param {string} message
 * @param {{ ok?: boolean, summary?: string, source?: string | null }} result
 */
function packWebContext(message, result) {
  if (!result?.ok || !result.summary) {
    return { searched: true, context: "", source: result?.source || null };
  }
  if (!snapshotLooksUseful(message, result.summary, result.source)) {
    return { searched: true, context: "", source: result.source || null };
  }
  const context = [
    "Optional web snapshot. Use a fact only if it answers THIS user turn. If unrelated, ignore it and chat normally. Never paste the snapshot as the whole reply:",
    result.summary,
  ].join("\n");
  return { searched: true, context, source: result.source };
}
