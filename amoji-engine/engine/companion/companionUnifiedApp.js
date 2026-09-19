/**
 * Unified Amoji app — girlfriend / boyfriend / secretary / pet in one 3D shell.
 */
import {
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";
import { resolveCharacterRole } from "./companionCharacterRoles.js";
import {
  loadCompanionRole,
  normalizeCompanionRole,
  roleLabel,
  rolePreset,
  rolePromptFragment,
  roleTagline,
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
  const secretaryTab = next.get("tab");
  if (
    (secretaryTab === "today" ||
      secretaryTab === "tasks" ||
      secretaryTab === "me") &&
    !next.get("role")
  ) {
    next.set("role", "secretary");
  }
  return next;
}

/**
 * @param {URLSearchParams | null | undefined} params
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 */
/**
 * Resolve session role — character selection is the source of truth when a
 * companion id is known; legacy ?role= links still work without ?character=.
 * @param {URLSearchParams | null | undefined} params
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 * @param {string | null | undefined} [characterId]
 */
export function resolveAppRole(
  params,
  storage = globalThis.localStorage,
  characterId = null,
) {
  const normalized = normalizeUnifiedEntryParams(
    params || new URLSearchParams(""),
  );
  const cid = String(characterId || "").toLowerCase();
  const explicitChar =
    normalized.get("character") ||
    normalized.get("vrm") ||
    normalized.get("model3d");
  if (explicitChar && cid) return resolveCharacterRole(cid);
  if (cid && !normalized.get("role")) return resolveCharacterRole(cid);
  const fromUrl = normalized.get("role");
  if (fromUrl) return normalizeCompanionRole(fromUrl);
  if (cid) return resolveCharacterRole(cid);
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
  const tagline = roleTagline(r, isEnglish);
  if (isEnglish) {
    return `${label} mode — ${tagline}`;
  }
  return `${label}模式 — ${tagline}`;
}

/**
 * Picker roster — role picks first, then the rest of the catalog.
 * @param {"yue" | "en"} langCode
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 */
const ROLE_PICKER_ORDER = Object.freeze({
  girlfriend: 0,
  boyfriend: 1,
  secretary: 2,
  pet: 3,
});

/**
 * Full roster for character picker — each card carries its embedded function label.
 * @param {"yue" | "en"} langCode
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} [roleFilter]
 */
export function rosterCharactersForPicker(langCode = "yue", roleFilter = null) {
  const all = listCompanionCharacters(langCode);
  const filter = roleFilter ? normalizeCompanionRole(roleFilter) : null;
  const filtered = filter
    ? all.filter((item) => item.companionRole === filter)
    : all;
  return [...filtered].sort((a, b) => {
    const ra = ROLE_PICKER_ORDER[a.companionRole] ?? 9;
    const rb = ROLE_PICKER_ORDER[b.companionRole] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.number || 0) - (b.number || 0);
  });
}

/** @deprecated use rosterCharactersForPicker — kept for legacy imports */
export function rosterCharactersForRole(langCode = "yue", role = "girlfriend") {
  return rosterCharactersForPicker(langCode, role);
}

/**
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function rolePickBadge(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "secretary") return "★ Secretary";
    if (r === "boyfriend") return "★ Boyfriend";
    if (r === "pet") return "★ Pet";
    return "★ Girlfriend";
  }
  if (r === "secretary") return "★ 秘書";
  if (r === "boyfriend") return "★ 男朋友";
  if (r === "pet") return "★ 寵物";
  return "★ 女朋友";
}

/** Unified picker copy — function is shown on each character card. */
export function pickerCopyForRole(_role, isEnglish = false) {
  const en = Boolean(isEnglish);
  if (en) {
    return {
      title: "Choose your companion",
      sub: "Each model has a role — girlfriend, boyfriend, secretary, or pet.",
      footStart: "Begin — your companion loads in the background while you talk.",
    };
  }
  return {
    title: "揀你嘅同伴",
    sub: "每個模型都有功能 — 女朋友、男朋友、秘書或寵物。",
    footStart: "開始 — 同伴會喺背景載入。",
  };
}

export {
  COMPANION_ROLES,
  loadCompanionRole,
  normalizeCompanionRole,
  roleLabel,
  rolePreset,
  rolePromptFragment,
  saveCompanionRole,
} from "../mobile/companionRolePresets.js";
