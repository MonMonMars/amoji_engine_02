/**
 * Roster slots #28–31 — professional expansion picks.
 */
import { rosterModelUrl } from "./rosterVrmAssets.mjs";
import { EXPANSION_ROSTER_SLOTS } from "./companionRosterExpansionData.mjs";

export const COMPANION_ROSTER_EXPANSION_SCHEMA =
  "amoji.companionRosterExpansion.v470-roster31-pro";

const DEFAULT_PERFORMANCE = {
  emotion: "happy",
  nuance: "none",
  talkStyle: "soft",
  speechEnergy: 0.58,
};

/** @param {import("./companionRosterExpansionData.mjs").EXPANSION_ROSTER_SLOTS[number]} slot */
function buildExpansionCharacterDef(slot) {
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
    greetingPerformance: { ...DEFAULT_PERFORMANCE, speechEnergy: 0.62 },
    prosodyBias: { rate: -1, pitch: 3, volume: 0 },
    personalityYue: slot.personalityYue,
    personalityEn: slot.personalityEn,
    tapLinesYue: [
      "想我幫你寫個 one-pager？",
      "下一步 action 係咩？",
      "我幫你 summarize 重點。",
    ],
    tapLinesEn: [
      "Want a tight one-pager?",
      "What's the next action?",
      "I'll summarize the highlights.",
    ],
    avatarLabel: { yue: "VRoid Pro VRM", en: "VRoid Pro VRM" },
  };
}

/** @type {Record<string, import("./companionCharacterCatalog.js").CompanionCharacterDef>} */
export const ROSTER_SLOTS_28_31 = Object.fromEntries(
  EXPANSION_ROSTER_SLOTS.map((slot) => [slot.id, buildExpansionCharacterDef(slot)]),
);

export const EXPANSION_ROSTER_SLOT_IDS = Object.freeze(
  Object.keys(ROSTER_SLOTS_28_31),
);
