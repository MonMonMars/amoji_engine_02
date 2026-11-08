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
  if (opts.automic === "0") params.set("automic", "0");
  return `${DEMO_BASE_URL}/companion-full?${params.toString()}`;
}

/**
 * @param {{ build?: string }} [opts]
 */
export function companionLiteDemoUrl(opts = {}) {
  const params = new URLSearchParams();
  const build = opts.build ?? AMOJI_BUILD;
  if (build) params.set("build", build);
  const qs = params.toString();
  return qs
    ? `${DEMO_BASE_URL}/companion?${qs}`
    : `${DEMO_BASE_URL}/companion`;
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
  const lines = [
    `**Build:** \`${build}\``,
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
