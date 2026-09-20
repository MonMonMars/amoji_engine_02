/**
 * Legacy character id → current roster id (shared by catalog + model fetch).
 * Keep in sync with LEGACY_CHARACTER_ALIASES in companionCharacterCatalog.js.
 */
import { COMPANION_ROSTER_CHARACTERS } from "./companionCharacterRoster.js";

export const LEGACY_CHARACTER_ALIASES = Object.freeze({
  kate: "mio",
  olivia: "yuki",
  lydia: "hina",
  erika: "yume",
  rose: "sakura",
  sora: "sakura",
  aria: "celeste",
  chibi: "nana",
  shiro: "nana",
  jennifer: "sumi",
  poly: "lumi",
  polydancer: "lumi",
  aesthe: "vera",
  aesthetica: "vera",
  chad: "robert",
  david: "mikel",
  hugo: "mimi",
  rabbit: "mimi",
  quinn: "mimi",
  kai: "rex",
  girl: "amoji",
  amoji_girl: "amoji",
});

/**
 * @param {string | null | undefined} id
 */
export function normalizeLegacyRosterCharacterId(id) {
  const key = String(id || "nova").trim().toLowerCase();
  if (COMPANION_ROSTER_CHARACTERS[key]) return key;
  const mapped = LEGACY_CHARACTER_ALIASES[key];
  if (mapped && COMPANION_ROSTER_CHARACTERS[mapped]) return mapped;
  return "nova";
}
