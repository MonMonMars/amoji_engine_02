/**
 * Unified Amoji app — girlfriend / boyfriend / secretary / pet in one 3D shell.
 */
import {
  loadCompanionRole,
  normalizeCompanionRole,
  roleLabel,
  rolePreset,
  rolePromptFragment,
  saveCompanionRole,
} from "../mobile/companionRolePresets.js";
import { buildSecretaryPromptExtras } from "./secretary/secretaryPromptFragments.js";

export const COMPANION_UNIFIED_APP_SCHEMA = "amoji.companionUnifiedApp.v1";

/**
 * Map legacy lite entry params to secretary role on the full 3D app.
 * @param {URLSearchParams} params
 */
export function normalizeUnifiedEntryParams(params) {
  const next = new URLSearchParams(params);
  const legacyLite =
    next.get("kind") === "lite" || next.get("lite") === "1";
  if (legacyLite) {
    if (!next.get("role")) next.set("role", "secretary");
    next.delete("kind");
    next.delete("lite");
  }
  if (next.get("tab") === "today" && !next.get("role")) {
    next.set("role", "secretary");
  }
  return next;
}

/**
 * @param {URLSearchParams | null | undefined} params
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 */
export function resolveAppRole(params, storage = globalThis.localStorage) {
  const normalized = normalizeUnifiedEntryParams(
    params || new URLSearchParams(""),
  );
  const fromUrl = normalized.get("role");
  if (fromUrl) return normalizeCompanionRole(fromUrl);
  return loadCompanionRole(storage);
}

/**
 * @param {string | null | undefined} characterId
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 * @param {URLSearchParams | null | undefined} [params]
 */
export function resolveRoleDefaultCharacter(characterId, role, params) {
  const explicit =
    params?.get("character") ||
    params?.get("vrm") ||
    params?.get("model3d");
  if (explicit) return String(characterId || "nova").toLowerCase();
  const preset = rolePreset(role);
  const current = String(characterId || "").toLowerCase();
  if (current && preset.characterIds.includes(current)) return current;
  return preset.defaultCharacterId;
}

/**
 * @param {{
 *   characterPrompt: string,
 *   role: import("../mobile/companionRolePresets.js").CompanionRole,
 *   isEnglish?: boolean,
 *   uiRules?: string,
 *   motionExtra?: string,
 *   storage?: Storage | null,
 * }} opts
 */
export function buildUnifiedSessionPrompt(opts) {
  const role = normalizeCompanionRole(opts.role);
  const isEnglish = Boolean(opts.isEnglish);
  const parts = [
    opts.characterPrompt,
    rolePromptFragment(role, isEnglish),
    opts.uiRules || "",
    opts.motionExtra || "",
  ];
  if (role === "secretary") {
    parts.push(buildSecretaryPromptExtras(isEnglish, { storage: opts.storage }));
  }
  return parts.filter(Boolean).join(" ");
}

/**
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function roleModeHint(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  const label = roleLabel(r, isEnglish);
  if (isEnglish) {
    return `${label} mode — 3D companion with ${roleTaglineShort(r, true)}`;
  }
  return `${label}模式 — 3D 同伴 · ${roleTaglineShort(r, false)}`;
}

/**
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 * @param {boolean} isEnglish
 */
function roleTaglineShort(role, isEnglish) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "boyfriend") return "romance + voice";
    if (r === "secretary") return "tasks + Today panel";
    if (r === "pet") return "cozy pet care";
    return "romance + chat";
  }
  if (r === "boyfriend") return "浪漫語音";
  if (r === "secretary") return "任務同 Today";
  if (r === "pet") return "寵物陪伴";
  return "戀愛傾偈";
}

export {
  loadCompanionRole,
  normalizeCompanionRole,
  roleLabel,
  rolePreset,
  rolePromptFragment,
  saveCompanionRole,
};
