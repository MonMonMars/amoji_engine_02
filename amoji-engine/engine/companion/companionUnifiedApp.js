/**
 * Unified Amoji app — girlfriend / boyfriend / secretary / pet in one 3D shell.
 */
import {
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";
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
export function rosterCharactersForRole(langCode = "yue", role = "girlfriend") {
  const preset = rolePreset(role);
  const all = listCompanionCharacters(langCode);
  const recommended = new Set(preset.characterIds);
  const badge = rolePickBadge(role, langCode === "en");
  const picks = [];
  const rest = [];
  for (const item of all) {
    if (recommended.has(item.id)) {
      picks.push({
        ...item,
        roleRecommended: true,
        badge,
      });
    } else rest.push({ ...item, roleRecommended: false });
  }
  picks.sort(
    (a, b) =>
      preset.characterIds.indexOf(a.id) - preset.characterIds.indexOf(b.id),
  );
  return [...picks, ...rest];
}

/**
 * @param {import("../mobile/companionRolePresets.js").CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function rolePickBadge(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "secretary") return "★ Secretary";
    if (r === "boyfriend") return "★ BF pick";
    if (r === "pet") return "★ Pet";
    return "★ GF pick";
  }
  if (r === "secretary") return "★ 秘書";
  if (r === "boyfriend") return "★ 男友";
  if (r === "pet") return "★ 寵物";
  return "★ 女友";
}

export function pickerCopyForRole(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  const en = Boolean(isEnglish);
  const label = roleLabel(r, en);
  const tagline = roleTagline(r, en);
  if (en) {
    if (r === "secretary") {
      return {
        title: "Choose your secretary",
        sub: "3D companion + Today tasks — voice-first productivity.",
        footStart: "Begin — your 3D secretary loads while you talk.",
      };
    }
    if (r === "boyfriend") {
      return {
        title: "Choose your boyfriend",
        sub: "3D anime companion — protective romance & voice chat.",
        footStart: "Begin — he loads in the background while you talk.",
      };
    }
    if (r === "pet") {
      return {
        title: "Choose your pet companion",
        sub: "Cozy 3D pet — playful voice and daily care.",
        footStart: "Begin — your pet loads while you talk.",
      };
    }
    return {
      title: "Choose your girlfriend",
      sub: "3D anime romance — expressive voice & motion.",
      footStart: "Begin — she loads in the background while you talk.",
    };
  }
  if (r === "secretary") {
    return {
      title: "揀你嘅秘書",
      sub: "3D 同伴 + Today 任務 — 語音優先秘書模式。",
      footStart: "開始 — 3D 秘書會喺背景載入。",
    };
  }
  if (r === "boyfriend") {
    return {
      title: "揀你嘅男朋友",
      sub: "3D 動漫同伴 — 可靠浪漫同語音傾偈。",
      footStart: "開始 — 佢會喺背景載入。",
    };
  }
  if (r === "pet") {
    return {
      title: "揀你嘅寵物同伴",
      sub: "治癒 3D 寵物 — 可愛語音同日常陪伴。",
      footStart: "開始 — 寵物會喺背景載入。",
    };
  }
  return {
    title: "揀你嘅女朋友",
    sub: "3D 動漫戀愛 — 表情豐富語音同動作。",
    footStart: "開始 — 佢會喺背景載入。",
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
