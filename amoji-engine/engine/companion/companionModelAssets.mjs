/**
 * Model URL helpers — cache keys, deploy cache-bust, roster fetch paths.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";
import {
  AMOJI_MODEL_REVISION,
  isRetiredModelUrl,
} from "./companionCharacterMigration.mjs";
import { rosterModelUrl } from "./rosterVrmAssets.mjs";
import { normalizeLegacyRosterCharacterId } from "./companionLegacyRosterIds.js";

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
  const tag = [bust, AMOJI_MODEL_REVISION].filter(Boolean).join("-");
  if (!tag) return path;
  return `${path}?v=${encodeURIComponent(tag)}`;
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} [langCode]
 * @param {string | null | undefined} [buildId]
 */
export function characterModelFetchUrl(characterId, langCode = "yue", buildId) {
  void langCode;
  const id = normalizeLegacyRosterCharacterId(characterId);
  return modelFetchUrl(rosterModelUrl(id), buildId);
}

/**
 * Default VRM fetch path when callers omit modelUrl (never legacy companion-girl).
 * @param {string | null | undefined} characterId
 * @param {string | null | undefined} [buildId]
 */
export function defaultVrmModelFetchUrl(characterId, buildId) {
  const id = normalizeLegacyRosterCharacterId(characterId);
  return characterModelFetchUrl(id, "yue", buildId);
}

/**
 * Never fetch retired VRM basenames — map to canonical roster path.
 * @param {string | null | undefined} url
 * @param {string | null | undefined} [characterId]
 */
export function coerceCanonicalModelFetchUrl(url, characterId) {
  const raw = String(url || "").trim();
  if (!raw || !isRetiredModelUrl(raw)) return raw;
  const id = normalizeLegacyRosterCharacterId(characterId);
  return modelFetchUrl(rosterModelUrl(id));
}
