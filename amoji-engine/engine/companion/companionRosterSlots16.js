/**
 * Roster slots #12+ — Gen3 100Avatars R3 (CC0). Slots #1–11 in companionCharacterRoster.js.
 */
import { rosterModelUrl } from "./rosterVrmAssets.mjs";
import { GEN3_ROSTER_SLOTS } from "./companionRosterGen3Data.mjs";

export const COMPANION_ROSTER_GEN3_SCHEMA = "amoji.companionRosterGen3.v460-roster27-pro";

const DEFAULT_PERFORMANCE = {
  emotion: "happy",
  nuance: "none",
  talkStyle: "soft",
  speechEnergy: 0.62,
};

/** @param {import("./companionRosterGen3Data.mjs").GEN3_ROSTER_SLOTS[number]} slot */
function buildGen3CharacterDef(slot) {
  return {
    id: slot.id,
    name: slot.name,
    tagline: slot.tagline,
    traits: slot.traits,
    modelUrl: rosterModelUrl(slot.id),
    avatarPrefer: "vrm",
    previewImage: `/prototypes/assets/companion-char-${slot.id}.png`,
    accent: slot.accent,
    badge: slot.badge,
    voices: slot.voices,
    greetingYue: slot.greetingYue,
    greetingEn: slot.greetingEn,
    greetingPerformance: { ...DEFAULT_PERFORMANCE },
    prosodyBias: { rate: 2, pitch: 4, volume: 0 },
    personalityYue: slot.personalityYue,
    personalityEn: slot.personalityEn,
    tapLinesYue: ["換個 topic？", "今日 highlight？", "我喺度聽你講。"],
    tapLinesEn: ["New topic?", "Today's highlight?", "I'm here — listening."],
    avatarLabel: { yue: "100Avatars R3 CC0", en: "100Avatars R3 CC0" },
  };
}

/** @type {Record<string, import("./companionCharacterCatalog.js").CompanionCharacterDef>} */
export const ROSTER_SLOTS_16_23 = Object.fromEntries(
  GEN3_ROSTER_SLOTS.map((slot) => [slot.id, buildGen3CharacterDef(slot)]),
);

/** @deprecated use {@link GEN3_ROSTER_SLOT_IDS} */
export const ROSTER_SLOT_16_23_IDS = Object.freeze(Object.keys(ROSTER_SLOTS_16_23));

export const GEN3_ROSTER_SLOT_IDS = ROSTER_SLOT_16_23_IDS;
