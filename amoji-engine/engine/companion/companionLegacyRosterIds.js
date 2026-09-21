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
  /** Gen2 slots 16–23 → Gen3 R3 */
  pyre: "knight",
  pan: "fox",
  circle: "jenny",
  face: "petal",
  cool: "wolf",
  samplec: "leaf",
  lantern: "samurai",
  drift: "tiger",
  /** Gen1 slots 16–23 → Gen3 */
  rex: "wolf",
  kai: "wolf",
  nana: "fox",
  chibi: "fox",
  shiro: "fox",
  sumi: "jenny",
  jennifer: "jenny",
  lumi: "tiger",
  poly: "tiger",
  polydancer: "tiger",
  vera: "petal",
  aesthe: "petal",
  aesthetica: "petal",
  robert: "samurai",
  chad: "samurai",
  mikel: "knight",
  david: "knight",
  mimi: "fox",
  hugo: "fox",
  rabbit: "fox",
  quinn: "fox",
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
