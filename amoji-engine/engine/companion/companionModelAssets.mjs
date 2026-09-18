/**
 * Model URL helpers — cache keys, deploy cache-bust, roster fetch paths.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";
import { COMPANION_ROSTER_CHARACTERS } from "./companionCharacterRoster.js";

export const COMPANION_MODEL_ASSETS_SCHEMA = "amoji.companionModelAssets.v1";

/**
 * Canonical map key (ignore ?v= cache-bust query).
 * @param {string | null | undefined} url
 */
export function normalizeModelCacheKey(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return raw.split("?")[0].split("#")[0];
}

/**
 * Fetch URL with optional build id so browsers pick up new VRM files after deploy.
 * @param {string | null | undefined} baseUrl
 * @param {string | null | undefined} [buildId]
 */
export function modelFetchUrl(baseUrl, buildId) {
  const path = normalizeModelCacheKey(baseUrl);
  if (!path) return "";
  const bust = String(
    buildId ?? globalThis.__amojiBuild ?? AMOJI_BUILD ?? "",
  ).trim();
  if (!bust) return path;
  return `${path}?v=${encodeURIComponent(bust)}`;
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} [langCode]
 * @param {string | null | undefined} [buildId]
 */
export function characterModelFetchUrl(characterId, langCode = "yue", buildId) {
  void langCode;
  const id = String(characterId || "nova").toLowerCase();
  const def = COMPANION_ROSTER_CHARACTERS[id] || COMPANION_ROSTER_CHARACTERS.nova;
  return modelFetchUrl(def.modelUrl, buildId);
}
