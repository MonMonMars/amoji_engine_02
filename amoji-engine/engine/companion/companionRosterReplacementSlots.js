/**
 * Build roster character defs for slots #12–24 and #26–31.
 */
import { rosterModelUrl } from "./rosterVrmAssets.mjs";
import { REPLACEMENT_ROSTER_SLOTS } from "./companionRosterReplacementData.mjs";

export const COMPANION_ROSTER_REPLACEMENT_SCHEMA =
  "amoji.companionRosterReplacement.v480-keep-1-11-25";

/** @param {import("./companionRosterReplacementData.mjs").ReplacementRosterSlot} slot */
function buildReplacementCharacterDef(slot) {
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
    greetingPerformance: {
      emotion: "happy",
      nuance: slot.role === "secretary" ? "curious" : "excited",
      talkStyle: slot.role === "secretary" ? "explain" : "soft",
      speechEnergy: slot.role === "secretary" ? 0.62 : 0.78,
    },
    prosodyBias: { rate: 4, pitch: 6, volume: 0 },
    personalityYue: slot.personalityYue,
    personalityEn: slot.personalityEn,
    tapLinesYue: [
      "喂～你戳我呀？",
      "有咩想我幫手？",
      "慢慢講，我聽緊。",
    ],
    tapLinesEn: [
      "Hey — you poked me!",
      "Want help with something?",
      "Go ahead, I'm listening.",
    ],
    avatarLabel: { yue: "VRM 專業同伴", en: "VRM pro companion" },
  };
}

/** @type {Record<string, ReturnType<typeof buildReplacementCharacterDef>>} */
export const ROSTER_REPLACEMENT_SLOTS = Object.fromEntries(
  REPLACEMENT_ROSTER_SLOTS.map((slot) => [slot.id, buildReplacementCharacterDef(slot)]),
);

export const ROSTER_REPLACEMENT_IDS = Object.freeze(
  Object.keys(ROSTER_REPLACEMENT_SLOTS),
);
