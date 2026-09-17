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
 *   lite?: boolean,
 * }} [opts]
 */
export function companionFullDemoUrl(opts = {}) {
  const lang = opts.lang === "en" ? "en" : "yue";
  const params = new URLSearchParams({ lang });
  const build = opts.build ?? AMOJI_BUILD;
  if (build) params.set("build", build);
  if (opts.pick !== "0") params.set("pick", "1");
  if (opts.automic === "0" || opts.automic === undefined) params.set("automic", "0");
  const path = build ? `/c/${encodeURIComponent(build)}/full` : "/companion-full";
  return `${DEMO_BASE_URL}${path}?${params.toString()}`;
}

/**
 * @param {{ build?: string }} [opts]
 */
export function companionLiteDemoUrl(opts = {}) {
  const params = new URLSearchParams();
  const build = opts.build ?? AMOJI_BUILD;
  if (build) params.set("build", build);
  if (opts.tab) params.set("tab", opts.tab);
  if (opts.lang === "en") params.set("lang", "en");
  const qs = params.toString();
  const path = build ? `/c/${encodeURIComponent(build)}/lite` : "/companion";
  return qs ? `${DEMO_BASE_URL}${path}?${qs}` : `${DEMO_BASE_URL}${path}`;
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
 * Markdown-friendly block for agent summaries and PR bodies.
 * @param {{ build?: string, prUrl?: string | null }} [opts]
 */
export function formatDemoLinkBlock(opts = {}) {
  const build = opts.build ?? AMOJI_BUILD;
  const yue = companionFullDemoUrl({ lang: "yue", build });
  const en = companionFullDemoUrl({ lang: "en", build });
  const lite = companionLiteDemoUrl({ build });
  const secretary = secretaryDemoUrl({ build, lang: "yue" });
  const lines = [
    `**Build:** \`${build}\``,
    `- **Secretary (Today, 粵):** ${secretary}`,
    `- **Full companion (粵):** ${yue}`,
    `- **Full companion (EN):** ${en}`,
    `- **Lite chat:** ${lite}`,
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
