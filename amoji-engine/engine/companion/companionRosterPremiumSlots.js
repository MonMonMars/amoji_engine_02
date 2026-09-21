/**
 * Roster slot #25 — Luna (premium VRoid).
 */
import { rosterModelUrl } from "./rosterVrmAssets.mjs";
import { PREMIUM_ROSTER_SLOTS } from "./companionRosterPremiumData.mjs";

export const COMPANION_ROSTER_PREMIUM_SCHEMA =
  "amoji.companionRosterPremium.v460-roster27-pro";

const DEFAULT_PERFORMANCE = {
  emotion: "happy",
  nuance: "none",
  talkStyle: "soft",
  speechEnergy: 0.58,
};

/** @param {import("./companionRosterPremiumData.mjs").PREMIUM_ROSTER_SLOTS[number]} slot */
function buildPremiumCharacterDef(slot) {
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
    greetingPerformance: { ...DEFAULT_PERFORMANCE, speechEnergy: 0.6 },
    prosodyBias: { rate: -2, pitch: 2, volume: 0 },
    personalityYue: slot.personalityYue,
    personalityEn: slot.personalityEn,
    tapLinesYue: [
      "想我幫你排 priority？",
      "今日 highlight 係咩？",
      "慢慢講，我整理俾你。",
    ],
    tapLinesEn: [
      "Want me to stack your priorities?",
      "What's today's highlight?",
      "Go on — I'll organize it for you.",
    ],
    avatarLabel: { yue: "VRoid Pro VRM", en: "VRoid Pro VRM" },
  };
}

/** @type {Record<string, import("./companionCharacterCatalog.js").CompanionCharacterDef>} */
export const ROSTER_SLOTS_24_27 = Object.fromEntries(
  PREMIUM_ROSTER_SLOTS.map((slot) => [slot.id, buildPremiumCharacterDef(slot)]),
);

export const PREMIUM_ROSTER_SLOT_IDS = Object.freeze(Object.keys(ROSTER_SLOTS_24_27));
