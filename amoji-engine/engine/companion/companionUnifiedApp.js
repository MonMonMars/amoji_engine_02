/**
 * Unified Amoji app — girlfriend / boyfriend / secretary / pet in one 3D shell.
 */
import {
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";
import {
  resolveCharacterRole,
  roleFunctionBadge,
  ROLE_DEFAULT_CHARACTER_ID,
} from "./companionCharacterRoles.js";
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
import { buildCareDisabledPetRoleFragment } from "./companionCareDialogue.js";
import { loadSessionModeOverride } from "./companionSessionMode.js";
import {
  buildLlmContextDatabaseFragment,
  refreshLlmContextDb,
} from "./companionLlmContextDb.js";

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
  const fromUrl = normalized.get("role");
  if (fromUrl) return normalizeCompanionRole(fromUrl);
  if (loadSessionModeOverride(storage)) return loadCompanionRole(storage);
  if (explicitChar && cid) {
    return resolveSessionRoleFromCharacter(cid, normalized);
  }
  if (cid && !normalized.get("role")) return resolveCharacterRole(cid);
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
 *   characterId?: string | null,
 *   langCode?: "yue" | "en",
 *   menuState?: Record<string, unknown>,
 * }} opts
 */
export function buildUnifiedSessionPrompt(opts) {
  const role = normalizeCompanionRole(opts.role);
  const isEnglish = Boolean(opts.isEnglish);
  const rolePart =
    buildCareDisabledPetRoleFragment(role, isEnglish) || rolePromptFragment(role, isEnglish);
  const parts = [opts.characterPrompt, rolePart, opts.uiRules || "", opts.motionExtra || ""];
  if (role === "secretary") {
    parts.push(buildSecretaryPromptExtras(isEnglish, { storage: opts.storage }));
  }
  const characterId = String(opts.characterId || "").toLowerCase();
  if (characterId) {
    refreshLlmContextDb({
      characterId,
      langCode: opts.langCode === "en" ? "en" : "yue",
      isEnglish,
      role,
      storage: opts.storage,
      menuState: opts.menuState,
    });
    parts.push(
      buildLlmContextDatabaseFragment({
        storage: opts.storage,
        isEnglish,
      }),
    );
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

/**
 * When entering via ?role=secretary (etc.), show the role default id with that
 * function badge on the start-picker strip — without remapping the whole roster.
 * @param {ReturnType<typeof listCompanionCharacters>} roster
 * @param {import("../mobile/companionRolePresets.js").CompanionRole | string | null | undefined} sessionRole
 * @param {boolean} [isEnglish]
 */
export function applySessionRoleBadgeOverrides(roster, sessionRole, isEnglish = false) {
  const role = sessionRole ? normalizeCompanionRole(sessionRole) : null;
  if (!role) return roster;
  const defaultId = String(ROLE_DEFAULT_CHARACTER_ID[role] || "").toLowerCase();
  if (!defaultId) return roster;
  const en = Boolean(isEnglish);
  return roster.map((item) => {
    if (String(item.id || "").toLowerCase() !== defaultId) return item;
    return {
      ...item,
      companionRole: role,
      roleLabel: roleLabel(role, en),
      roleBadge: roleFunctionBadge(role, en),
    };
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

/**
 * Session role after a character is selected — honors explicit ?role= when the
 * picked id is that role's default companion (e.g. ?role=secretary + nova).
 * @param {string | null | undefined} characterId
 * @param {URLSearchParams | null | undefined} [params]
 */
export function resolveSessionRoleFromCharacter(characterId, params) {
  const charKey = String(characterId || "").toLowerCase();
  const urlRole = params?.get?.("role");
  const urlRoleKey = urlRole ? normalizeCompanionRole(urlRole) : null;
  const roleDefaultId = urlRoleKey
    ? String(ROLE_DEFAULT_CHARACTER_ID[urlRoleKey] || "").toLowerCase()
    : "";
  if (urlRoleKey && charKey && charKey === roleDefaultId) return urlRoleKey;
  return resolveCharacterRole(characterId);
}

/** Unified picker copy — function is shown on each character card. */
export function pickerCopyForRole(role, isEnglish = false) {
  const r = normalizeCompanionRole(role || "girlfriend");
  const en = Boolean(isEnglish);
  if (r === "secretary") {
    return en
      ? {
          title: "Choose your secretary",
          sub: "Swipe the roster · tap to preview",
          footStart: "Begin — Today, tasks, and chat load in the background.",
        }
      : {
          title: "揀你嘅秘書",
          sub: "㩒肖像預覽 · 左右滑動揀同伴",
          footStart: "開始 — Today、任務同傾偈會喺背景載入。",
        };
  }
  if (r === "boyfriend") {
    return en
      ? {
          title: "Choose your boyfriend",
          sub: "Swipe the roster · tap to preview",
          footStart: "Begin — your companion loads in the background while you talk.",
        }
      : {
          title: "揀你嘅男朋友",
          sub: "㩒肖像預覽 · 左右滑動揀同伴",
          footStart: "開始 — 同伴會喺背景載入。",
        };
  }
  if (r === "pet") {
    return en
      ? {
          title: "Choose your pet",
          sub: "Swipe the roster · tap to preview",
          footStart: "Begin — care mode loads in the background.",
        }
      : {
          title: "揀你嘅寵物",
          sub: "㩒肖像預覽 · 左右滑動揀同伴",
          footStart: "開始 — 寵物模式會喺背景載入。",
        };
  }
  if (en) {
    return {
      title: "Choose your companion",
      sub: "Swipe the roster · tap to preview",
      footStart: "Begin — your companion loads in the background while you talk.",
    };
  }
  return {
    title: "揀你嘅同伴",
    sub: "㩒肖像預覽 · 左右滑動揀同伴",
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
