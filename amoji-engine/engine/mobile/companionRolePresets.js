/**
 * Companion role presets — girlfriend / boyfriend / secretary / pet.
 */
export const COMPANION_ROLE_SCHEMA = "amoji.companionRole.v1";
export const ROLE_STORAGE_KEY = "amoji.companionRole.v1";

/** @typedef {"girlfriend"|"boyfriend"|"secretary"|"pet"} CompanionRole */

/** @type {readonly CompanionRole[]} */
export const COMPANION_ROLES = Object.freeze([
  "girlfriend",
  "boyfriend",
  "secretary",
  "pet",
]);

/**
 * @param {unknown} raw
 * @returns {CompanionRole}
 */
export function normalizeCompanionRole(raw) {
  const v = String(raw || "girlfriend").toLowerCase();
  if (v === "boyfriend" || v === "bf" || v === "male") return "boyfriend";
  if (v === "secretary" || v === "assistant" || v === "work") return "secretary";
  if (v === "pet" || v === "tamagotchi" || v === "animal") return "pet";
  if (v === "girlfriend" || v === "gf" || v === "female") return "girlfriend";
  return "girlfriend";
}

/**
 * @param {CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function roleLabel(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "boyfriend") return "Boyfriend";
    if (r === "secretary") return "Secretary";
    if (r === "pet") return "Pet";
    return "Girlfriend";
  }
  if (r === "boyfriend") return "男朋友";
  if (r === "secretary") return "秘書";
  if (r === "pet") return "寵物";
  return "女朋友";
}

/**
 * @param {CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function roleTagline(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "boyfriend") return "Remembers you · voice · protective romance";
    if (r === "secretary") return "Tasks · drafts · calm productivity";
    if (r === "pet") return "Playful voice · cozy daily companion";
    return "Chat · bond · 3D anime romance";
  }
  if (r === "boyfriend") return "記得你 · 語音 · 可靠浪漫";
  if (r === "secretary") return "任務 · 起草 · 高效秘書";
  if (r === "pet") return "可愛語音 · 治癒日常陪伴";
  return "傾偈 · 羈絆 · 3D 動漫戀愛";
}

/**
 * @param {CompanionRole} role
 */
export function roleEmoji(role) {
  const r = normalizeCompanionRole(role);
  if (r === "boyfriend") return "💙";
  if (r === "secretary") return "📋";
  if (r === "pet") return "🐾";
  return "💗";
}

import {
  CHARACTER_COMPANION_ROLES,
  ROLE_DEFAULT_CHARACTER_ID,
  characterIdsForRole,
} from "../companion/companionCharacterRoles.js";

/** @type {Record<CompanionRole, { characterIds: string[], defaultCharacterId: string, hubPrimary: string, hubSecondary: string }>} */
export const ROLE_PRESETS = Object.freeze({
  girlfriend: {
    characterIds: characterIdsForRole("girlfriend"),
    defaultCharacterId: ROLE_DEFAULT_CHARACTER_ID.girlfriend,
    hubPrimary: "companion",
    hubSecondary: "chase",
  },
  boyfriend: {
    characterIds: characterIdsForRole("boyfriend"),
    defaultCharacterId: ROLE_DEFAULT_CHARACTER_ID.boyfriend,
    hubPrimary: "companion",
    hubSecondary: "chase",
  },
  secretary: {
    characterIds: characterIdsForRole("secretary"),
    defaultCharacterId: ROLE_DEFAULT_CHARACTER_ID.secretary,
    hubPrimary: "companion",
    hubSecondary: "pet",
  },
  pet: {
    characterIds: characterIdsForRole("pet"),
    defaultCharacterId: ROLE_DEFAULT_CHARACTER_ID.pet,
    hubPrimary: "pet",
    hubSecondary: "companion",
  },
});

export { CHARACTER_COMPANION_ROLES, resolveCharacterRole } from "../companion/companionCharacterRoles.js";

/**
 * @param {CompanionRole} role
 */
export function rolePreset(role) {
  return ROLE_PRESETS[normalizeCompanionRole(role)];
}

/**
 * @param {CompanionRole} role
 * @param {boolean} [isEnglish]
 */
export function rolePromptFragment(role, isEnglish = false) {
  const r = normalizeCompanionRole(role);
  if (isEnglish) {
    if (r === "boyfriend") {
      return "Role: AI boyfriend. Warm, protective, remembers details, proactive check-ins, soft romance — never cold or generic.";
    }
    if (r === "secretary") {
      return "Role: AI secretary. Organized, concise, captures tasks and follow-ups — reliable assistant energy.";
    }
    if (r === "pet") {
      return "Role: Virtual pet companion. Cute, cozy, short cheerful replies — focus on comfort and play.";
    }
    return "Role: AI girlfriend. Affectionate, expressive, remembers shared moments — anime romance tone, never mean.";
  }
  if (r === "boyfriend") {
    return "角色：AI 男朋友。溫暖、可靠、記得細節、會主動關心，浪漫但唔冷靜，唔好似通用聊天機械人。";
  }
  if (r === "secretary") {
    return "角色：AI 秘書。有條理、簡潔、幫手記任務同跟進 — 專業可靠。";
  }
  if (r === "pet") {
    return "角色：虛擬寵物同伴。可愛治癒、句子短、重陪伴同玩耍。";
  }
  return "角色：AI 女朋友。親密、表情豐富、記得共同回憶 — 動漫戀愛感，唔好刻薄。";
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadCompanionRole(storage = globalThis.localStorage) {
  try {
    return normalizeCompanionRole(storage?.getItem?.(ROLE_STORAGE_KEY));
  } catch {
    return "girlfriend";
  }
}

/**
 * @param {CompanionRole} role
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveCompanionRole(role, storage = globalThis.localStorage) {
  const next = normalizeCompanionRole(role);
  try {
    storage?.setItem?.(ROLE_STORAGE_KEY, next);
    storage?.setItem?.("amoji.mobile.lastCharacterId", rolePreset(next).defaultCharacterId);
  } catch {
    /* ignore */
  }
  return next;
}

/**
 * @param {CompanionRole} role
 * @param {string} characterId
 */
export function isCharacterRecommendedForRole(role, characterId) {
  const preset = rolePreset(role);
  return preset.characterIds.includes(String(characterId || "").toLowerCase());
}
