/**
 * Live demo URLs — single source of truth for agents and docs.
 * Import AMOJI_BUILD when appending ?build= for cache-bust verification.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";

/** Production Vercel deployment (see DEPLOY.md). */
export const DEMO_BASE_URL =
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app";

export const DEMO_DASHBOARD_URL =
  "https://vercel.com/mars2350-1971/temporary-rushing-oxygen-ok5jzhd";

/**
 * @param {{
 *   lang?: "yue" | "en",
 *   build?: string,
 *   automic?: "0" | "1",
 *   pick?: "0" | "1",
 *   cacheBust?: string | number,
 *   kind?: "lite",
 * }} [opts]
 */
export function companionFullDirectUrl(opts = {}) {
  const lang = opts.lang === "en" ? "en" : "yue";
  const params = new URLSearchParams({ lang });
  if (opts.pick !== "0") params.set("pick", "1");
  if (opts.automic === "0" || opts.automic === undefined) params.set("automic", "0");
  if (opts.build) params.set("build", opts.build);
  params.set(
    "_cb",
    String(opts.cacheBust ?? Date.now()),
  );
  return `${DEMO_BASE_URL}/companion-full?${params.toString()}`;
}

/**
 * @param {{ lang?: "yue" | "en", build?: string, cacheBust?: string | number }} [opts]
 */
/** @deprecated Same as full app — use companionFullDirectUrl */
export function companionLiteDirectUrl(opts = {}) {
  return companionFullDirectUrl(opts);
}

/**
 * @param {{
 *   lang?: "yue" | "en",
 *   build?: string,
 *   automic?: "0" | "1",
 *   lite?: boolean,
 *   pick?: "0" | "1",
 * }} [opts]
 */
export function companionFullDemoUrl(opts = {}) {
  const lang = opts.lang === "en" ? "en" : "yue";
  const params = new URLSearchParams({ lang });
  if (opts.pick !== "0") params.set("pick", "1");
  if (opts.automic === "0" || opts.automic === undefined) params.set("automic", "0");
  if (opts.kind === "lite") params.set("kind", "lite");
  const path = "/play";
  return `${DEMO_BASE_URL}${path}?${params.toString()}`;
}

/**
 * @param {{ build?: string }} [opts]
 */
/** @deprecated Same as full app — optional ?tab=today opens Menu planner after start */
export function companionLiteDemoUrl(opts = {}) {
  const params = new URLSearchParams({ pick: "1", automic: "0" });
  if (opts.tab) params.set("tab", opts.tab);
  if (opts.lang === "en") params.set("lang", "en");
  else if (opts.lang === "yue") params.set("lang", "yue");
  if (opts.build) params.set("build", opts.build);
  const qs = params.toString();
  return `${DEMO_BASE_URL}/play${qs ? `?${qs}` : ""}`;
}

/** @deprecated Use companionFullDemoUrl + Menu → Today & tasks, or ?tab=today */
export function secretaryDemoUrl(opts = {}) {
  return companionLiteDemoUrl({
    build: opts.build,
    lang: opts.lang,
    tab: opts.tab ?? "today",
  });
}

/**
 * Voice emotion A/B lab — cached clips + live /api/tts.
 * @param {{ build?: string, cacheBust?: string | number }} [opts]
 */
export function voiceEmotionDemoDirectUrl(opts = {}) {
  const params = new URLSearchParams();
  if (opts.build) params.set("build", opts.build);
  params.set("_cb", String(opts.cacheBust ?? Date.now()));
  const qs = params.toString();
  return `${DEMO_BASE_URL}/voice-emotion-demo${qs ? `?${qs}` : ""}`;
}

/**
 * English full companion with expressive OpenAI voice override.
 * @param {{ build?: string, voice?: string, cacheBust?: string | number }} [opts]
 */
export function englishEmotionCompanionDirectUrl(opts = {}) {
  const params = new URLSearchParams({
    lang: "en",
    pick: "1",
    automic: "0",
    voice: opts.voice || "openai-coral",
  });
  if (opts.build) params.set("build", opts.build);
  params.set("_cb", String(opts.cacheBust ?? Date.now()));
  return `${DEMO_BASE_URL}/companion-full?${params.toString()}`;
}

/**
 * Markdown-friendly block for agent summaries and PR bodies.
 * @param {{ build?: string, prUrl?: string | null }} [opts]
 */
export function formatDemoLinkBlock(opts = {}) {
  const build = opts.build ?? AMOJI_BUILD;
  const playYue = companionFullDemoUrl({ lang: "yue", build });
  const playEn = companionFullDemoUrl({ lang: "en", build });
  const voiceLab = voiceEmotionDemoDirectUrl({ build });
  const lines = [
    `**Build:** \`${build}\``,
    `- **One app (bookmark):** ${DEMO_BASE_URL}/play`,
    `- **Start with picker (粵):** ${playYue}`,
    `- **Start with picker (EN):** ${playEn}`,
    `- **Menu:** language, **Brain** (LLM), Today/Tasks, switch companion`,
    `- **Voice emotion lab:** ${voiceLab}`,
    `- **Dashboard:** ${DEMO_DASHBOARD_URL}`,
  ];
  if (opts.prUrl) {
    lines.push(
      `- **Note:** Production links update after merge + Vercel deploy. PR: ${opts.prUrl}`,
    );
  } else {
    lines.push(
      "- **Note:** Production links update after merge + Vercel deploy.",
    );
  }
  return lines.join("\n");
}
