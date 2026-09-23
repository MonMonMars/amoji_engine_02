/**
 * Legacy character id → current roster id (shared by catalog + model fetch).
 */
import { COMPANION_ROSTER_CHARACTERS } from "./companionCharacterRoster.js";

export const LEGACY_CHARACTER_ALIASES = Object.freeze({
  kate: "mio",
  olivia: "yuki",
  lydia: "hina",
  erika: "mei",
  rose: "mei",
  sora: "mei",
  /** Removed roster ids → v480 replacements */
  knight: "orion",
  samurai: "kael",
  tiger: "mira",
  leaf: "sumire",
  wolf: "rin",
  fox: "dex",
  jenny: "niko",
  weirdcat: "yara",
  petal: "thorn",
  beach: "vesper",
  pirate: "ash",
  bunny: "cleo",
  sakura: "shino",
  sienna: "shino",
  celeste: "juno",
  yume: "elio",
  aria: "hana",
  noah: "zane",
  rika: "priya",
  vega: "cyrus",
  pyre: "orion",
  pan: "dex",
  circle: "niko",
  face: "thorn",
  cool: "rin",
  samplec: "sumire",
  lantern: "kael",
  drift: "mira",
  rex: "rin",
  kai: "rin",
  nana: "dex",
  chibi: "dex",
  shiro: "dex",
  sumi: "niko",
  jennifer: "niko",
  lumi: "mira",
  poly: "mira",
  polydancer: "mira",
  vera: "thorn",
  aesthe: "thorn",
  aesthetica: "thorn",
  robert: "kael",
  chad: "kael",
  mikel: "orion",
  david: "orion",
  mimi: "dex",
  hugo: "dex",
  rabbit: "dex",
  quinn: "dex",
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
