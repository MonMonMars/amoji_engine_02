/**
 * Each companion model embeds one app function — girlfriend, boyfriend, secretary, or pet.
 * Role follows the selected character; there is no separate mode switch.
 */
import { ROSTER_CHARACTER_IDS } from "./companionCharacterRoster.js";

export const COMPANION_CHARACTER_ROLES_SCHEMA =
  "amoji.companionCharacterRoles.v7-replacement480";

/** @typedef {import("../mobile/companionRolePresets.js").CompanionRole} CompanionRole */

/** @type {Readonly<Record<string, CompanionRole>>} */
export const CHARACTER_COMPANION_ROLES = Object.freeze({
  nova: "girlfriend",
  kizuna: "girlfriend",
  alicia: "girlfriend",
  ember: "girlfriend",
  mei: "girlfriend",
  atlas: "boyfriend",
  sky: "girlfriend",
  yuki: "girlfriend",
  hina: "girlfriend",
  mio: "girlfriend",
  amoji: "girlfriend",
  orion: "boyfriend",
  kael: "boyfriend",
  mira: "girlfriend",
  sumire: "girlfriend",
  rin: "boyfriend",
  dex: "pet",
  niko: "girlfriend",
  yara: "pet",
  thorn: "girlfriend",
  vesper: "boyfriend",
  ash: "boyfriend",
  cleo: "pet",
  shino: "secretary",
  shibu: "girlfriend",
  fumiriya: "girlfriend",
  darkness_shibu: "girlfriend",
  luna: "secretary",
  juno: "girlfriend",
  elio: "girlfriend",
  hana: "secretary",
  zane: "secretary",
  priya: "girlfriend",
  cyrus: "girlfriend",
  /** Legacy ids → replacement roster */
  knight: "boyfriend",
  samurai: "boyfriend",
  tiger: "girlfriend",
  leaf: "girlfriend",
  wolf: "boyfriend",
  fox: "pet",
  jenny: "girlfriend",
  weirdcat: "pet",
  petal: "girlfriend",
  beach: "boyfriend",
  pirate: "boyfriend",
  bunny: "pet",
  sakura: "girlfriend",
  celeste: "girlfriend",
  yume: "girlfriend",
  aria: "secretary",
  noah: "secretary",
  rika: "girlfriend",
  vega: "girlfriend",
  pyre: "girlfriend",
  pan: "pet",
  circle: "girlfriend",
  face: "girlfriend",
  cool: "boyfriend",
  samplec: "girlfriend",
  lantern: "boyfriend",
  drift: "girlfriend",
  sora: "girlfriend",
  erika: "girlfriend",
  shiro: "girlfriend",
  jennifer: "girlfriend",
  poly: "girlfriend",
  aesthe: "girlfriend",
  chad: "boyfriend",
  david: "boyfriend",
  hugo: "pet",
  rex: "boyfriend",
  nana: "pet",
  sumi: "girlfriend",
  lumi: "girlfriend",
  vera: "girlfriend",
  robert: "boyfriend",
  mikel: "boyfriend",
  mimi: "pet",
});

/** @type {Readonly<Record<CompanionRole, string>>} */
export const ROLE_DEFAULT_CHARACTER_ID = Object.freeze({
  girlfriend: "nova",
  boyfriend: "kael",
  secretary: "shino",
  pet: "cleo",
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
  const key = String(role || "girlfriend").toLowerCase();
  if (key === "boyfriend" || key === "secretary" || key === "pet") {
    return key;
  }
  return "girlfriend";
}

/**
 * @param {CompanionRole | string | null | undefined} role
 * @returns {string[]}
 */
export function characterIdsForRole(role) {
  const key = normalizeRoleKey(role);
  return ROSTER_CHARACTER_IDS.filter(
    (id) => resolveCharacterRole(id) === key,
  );
}

/**
 * @param {CompanionRole | string | null | undefined} role
 * @returns {string}
 */
export function defaultCharacterIdForRole(role) {
  const key = normalizeRoleKey(role);
  return ROLE_DEFAULT_CHARACTER_ID[key] || "nova";
}

/**
 * @param {string | null | undefined} characterId
 * @returns {boolean}
 */
export function isRosterCharacterId(characterId) {
  const key = String(characterId || "").toLowerCase();
  return ROSTER_CHARACTER_IDS.includes(key);
}

/**
 * @param {string | null | undefined} characterId
 * @returns {boolean}
 */
export function characterHasExplicitRole(characterId) {
  const key = String(characterId || "").toLowerCase();
  return Boolean(CHARACTER_COMPANION_ROLES[key]);
}

/**
 * @returns {string[]}
 */
export function rosterCharacterIdsWithoutExplicitRole() {
  return ROSTER_CHARACTER_IDS.filter((id) => !CHARACTER_COMPANION_ROLES[id]);
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
 * @returns {string[]} roster ids missing a role mapping
 */
export function validateCharacterRoleCoverage() {
  return ROSTER_CHARACTER_IDS.filter((id) => !CHARACTER_COMPANION_ROLES[id]);
}
