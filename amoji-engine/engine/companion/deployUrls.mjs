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
export function companionLiteDirectUrl(opts = {}) {
  const params = new URLSearchParams();
  if (opts.lang === "en") params.set("lang", "en");
  else if (opts.lang === "yue") params.set("lang", "yue");
  if (opts.build) params.set("build", opts.build);
  params.set("_cb", String(opts.cacheBust ?? Date.now()));
  const qs = params.toString();
  return `${DEMO_BASE_URL}/companion${qs ? `?${qs}` : ""}`;
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
export function companionLiteDemoUrl(opts = {}) {
  const params = new URLSearchParams({
    role: "secretary",
    pick: "1",
    automic: "0",
  });
  if (opts.tab) params.set("tab", opts.tab);
  if (opts.lang === "en") params.set("lang", "en");
  else if (opts.lang === "yue") params.set("lang", "yue");
  if (opts.build) params.set("build", opts.build);
  const qs = params.toString();
  return `${DEMO_BASE_URL}/play${qs ? `?${qs}` : ""}`;
}

/**
 * Secretary MVP entry (Today tab by default).
 * @param {{ build?: string, lang?: "yue" | "en", tab?: string }} [opts]
 */
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
  const yue = companionFullDemoUrl({ lang: "yue", build });
  const en = companionFullDemoUrl({ lang: "en", build });
  const lite = companionLiteDemoUrl({ build });
  const secretary = secretaryDemoUrl({ build, lang: "yue" });
  const yueDirect = companionFullDirectUrl({ lang: "yue", build });
  const enDirect = companionFullDirectUrl({ lang: "en", build });
  const liteDirect = companionLiteDirectUrl({ build, lang: "yue" });
  const voiceLab = voiceEmotionDemoDirectUrl({ build });
  const enEmotion = englishEmotionCompanionDirectUrl({ build });
  const lines = [
    `**Build:** \`${build}\``,
    `- **Bookmark (/play):** ${DEMO_BASE_URL}/play`,
    `- **Voice emotion lab (EN):** ${voiceLab}`,
    `- **English companion + Coral voice:** ${enEmotion}`,
    `- **Full companion (粵):** ${yue}`,
    `- **Full companion (EN):** ${en}`,
    `- **Direct full (粵, always works):** ${yueDirect}`,
    `- **Direct full (EN):** ${enDirect}`,
    `- **Secretary (Today, 粵):** ${secretary}`,
    `- **Lite chat:** ${lite}`,
    `- **Direct lite:** ${liteDirect}`,
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
