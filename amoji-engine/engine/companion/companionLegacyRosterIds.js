/**
 * Legacy character id → current roster id (shared by catalog + model fetch).
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
  /** Gen1 slots 16–23 → Gen2 CC0 replacements */
  rex: "cool",
  kai: "cool",
  nana: "pan",
  chibi: "pan",
  shiro: "pan",
  sumi: "circle",
  jennifer: "circle",
  lumi: "drift",
  poly: "drift",
  polydancer: "drift",
  vera: "face",
  aesthe: "face",
  aesthetica: "face",
  robert: "lantern",
  chad: "lantern",
  mikel: "pyre",
  david: "pyre",
  mimi: "pan",
  hugo: "pan",
  rabbit: "pan",
  quinn: "pan",
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
