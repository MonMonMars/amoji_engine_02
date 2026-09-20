/**
 * Roster v363 — retired VRM files + URL cleanup (no character catalog import).
 */

export const COMPANION_CHARACTER_MIGRATION_SCHEMA =
  "amoji.companionCharacterMigration.v1";

/** VRM basenames removed from deploy (superseded by roster replacements). */
export const RETIRED_VRM_BASENAMES = Object.freeze([
  "companion-chad.vrm",
  "companion-david.vrm",
  "companion-hugo.vrm",
  "companion-shiro.vrm",
  "companion-avatarsample-c.vrm",
]);

/** Bust browser caches when roster model files change (independent of HTML build). */
export const AMOJI_MODEL_REVISION = "roster-v409-picker-portraits";

/**
 * @param {string | null | undefined} url
 */
export function isRetiredModelUrl(url) {
  const lower = String(url || "").toLowerCase();
  if (!lower) return false;
  return RETIRED_VRM_BASENAMES.some((name) => lower.includes(name));
}

/**
 * Strip deep-link VRM params so the stage always uses roster `modelUrl` for `character`.
 * @param {URL | null | undefined} [url]
 * @returns {boolean} true if search params were changed
 */
export function stripLegacyModelSearchParams(url) {
  const target =
    url ||
    (typeof globalThis.location !== "undefined"
      ? new URL(globalThis.location.href)
      : null);
  if (!target) return false;
  let changed = false;
  for (const key of ["vrm", "model3d", "avatar"]) {
    if (target.searchParams.has(key)) {
      target.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed && typeof globalThis.history?.replaceState === "function") {
    globalThis.history.replaceState(
      {},
      "",
      `${target.pathname}${target.search}${target.hash}`,
    );
  }
  return changed;
}
