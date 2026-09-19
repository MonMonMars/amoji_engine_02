/**
 * Each companion model embeds one app function — girlfriend, boyfriend, secretary, or pet.
 * Role follows the selected character; there is no separate mode switch.
 */
import { ROSTER_CHARACTER_IDS } from "./companionCharacterRoster.js";

export const COMPANION_CHARACTER_ROLES_SCHEMA =
  "amoji.companionCharacterRoles.v1";

/** @typedef {import("../mobile/companionRolePresets.js").CompanionRole} CompanionRole */

/** @type {Readonly<Record<string, CompanionRole>>} */
export const CHARACTER_COMPANION_ROLES = Object.freeze({
  nova: "girlfriend",
  kizuna: "girlfriend",
  alicia: "girlfriend",
  ember: "girlfriend",
  amoji: "girlfriend",
  sky: "girlfriend",
  yuki: "girlfriend",
  hina: "girlfriend",
  mio: "girlfriend",
  vroidf: "girlfriend",
  olivia: "girlfriend",
  jennifer: "girlfriend",
  chad: "boyfriend",
  david: "boyfriend",
  hugo: "boyfriend",
  rex: "boyfriend",
  vroidm: "boyfriend",
  robert: "boyfriend",
  mikel: "boyfriend",
  kate: "secretary",
  rose: "secretary",
  quinn: "secretary",
  erika: "secretary",
  lydia: "secretary",
  sora: "secretary",
  chibi: "pet",
  mimi: "pet",
  shiro: "pet",
  poly: "pet",
  aesthe: "pet",
});

/** @type {Readonly<Record<CompanionRole, string>>} */
export const ROLE_DEFAULT_CHARACTER_ID = Object.freeze({
  girlfriend: "nova",
  boyfriend: "chad",
  secretary: "kate",
  pet: "mimi",
});

/**
 * @param {string | null | undefined} characterId
 * @returns {CompanionRole}
 */
export function resolveCharacterRole(characterId) {
  const key = String(characterId || "").toLowerCase();
  const role = CHARACTER_COMPANION_ROLES[key];
  if (
    role === "boyfriend" ||
    role === "secretary" ||
    role === "pet" ||
    role === "girlfriend"
  ) {
    return role;
  }
  return "girlfriend";
}

/**
 * @param {CompanionRole | string | null | undefined} role
 * @returns {CompanionRole}
 */
export function normalizeRoleKey(role) {
  const v = String(role || "girlfriend").toLowerCase();
  if (v === "boyfriend" || v === "bf" || v === "male") return "boyfriend";
  if (v === "secretary" || v === "assistant" || v === "work") return "secretary";
  if (v === "pet" || v === "tamagotchi" || v === "animal") return "pet";
  if (v === "girlfriend" || v === "gf" || v === "female") return "girlfriend";
  return "girlfriend";
}

/**
 * @param {CompanionRole | string} role
 * @param {boolean} [isEnglish]
 */
export function roleFunctionBadge(role, isEnglish = false) {
  const r = normalizeRoleKey(role);
  if (isEnglish) {
    if (r === "secretary") return "Secretary";
    if (r === "boyfriend") return "Boyfriend";
    if (r === "pet") return "Pet";
    return "Girlfriend";
  }
  if (r === "secretary") return "秘書";
  if (r === "boyfriend") return "男朋友";
  if (r === "pet") return "寵物";
  return "女朋友";
}

/**
 * @param {CompanionRole | string} role
 * @returns {string[]}
 */
export function characterIdsForRole(role) {
  const r = normalizeRoleKey(role);
  return ROSTER_CHARACTER_IDS.filter(
    (id) => CHARACTER_COMPANION_ROLES[id] === r,
  );
}

/**
 * Ensures every roster id has a mapped function.
 * @returns {string[]}
 */
export function validateCharacterRoleCoverage() {
  const missing = ROSTER_CHARACTER_IDS.filter(
    (id) => !CHARACTER_COMPANION_ROLES[id],
  );
  return missing;
}
