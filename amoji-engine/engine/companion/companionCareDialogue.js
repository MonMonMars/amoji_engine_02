/**
 * Dialogue filters when companion care / feeding is disabled.
 */
import { COMPANION_CARE_ENABLED } from "./companionFeatureFlags.js";

/** Character pleading to be fed (virtual-pet mechanic). */
export const CARE_PET_ASK_PATTERN =
  /(?:i'?m\s+hungry|got\s+a\s+snack\s+for\s+me|feed\s+me|hungry\s*…?\s*got|肚餓|有冇嘢食|餵我|餵佢食)/i;

/** Casual food-topic openers that feel like the feeding mini-game when care is off. */
export const CARE_FOOD_TOPIC_PATTERN =
  /(?:what\s+should\s+we\s+eat|what\s+did\s+you\s+eat|craving.*food|food\s+or\s+fun|late-?night\s+food|food\s+thoughts|music,\s*style,\s*or\s+food|food\s+—\s+pick|定\s*food|\bfood\b|今晚食咩|食定玩|今日有咩食|what\s+are\s+you\s+craving|有咩食)/i;

/** @typedef {{ filterCasualFood?: boolean }} CareDialogueFilterOpts */

/**
 * @param {string | null | undefined} line
 * @param {CareDialogueFilterOpts} [opts]
 */
export function shouldFilterCareDialogueLine(line, opts = {}) {
  if (COMPANION_CARE_ENABLED) return false;
  const text = String(line || "").trim();
  if (!text) return false;
  if (CARE_PET_ASK_PATTERN.test(text)) return true;
  const filterCasualFood = opts.filterCasualFood !== false;
  return filterCasualFood && CARE_FOOD_TOPIC_PATTERN.test(text);
}

/**
 * @param {readonly string[]} lines
 * @param {CareDialogueFilterOpts} [opts]
 */
export function filterCareDialogueLines(lines, opts = {}) {
  if (COMPANION_CARE_ENABLED) return [...lines];
  return lines.filter((line) => !shouldFilterCareDialogueLine(line, opts));
}

/**
 * @param {boolean} [isEnglish]
 */
export function buildCareDisabledPromptFragment(isEnglish = false) {
  if (COMPANION_CARE_ENABLED) return "";
  if (isEnglish) {
    return [
      "FEEDING MODE IS OFF.",
      "Never say you are hungry, never ask the user for snacks/food/treats, and never ask to be fed.",
      "Do not initiate meal, kitchen, or feeding topics unless the user brings up food first.",
      "Do not use [action:eat] or [action:drink] unless the user explicitly asks you to perform eating/drinking as a motion demo.",
    ].join(" ");
  }
  return [
    "餵食模式已關閉。",
    "唔好講自己肚餓、唔好問用家有冇嘢食/零食/餵你、唔好要求用家餵你。",
    "唔好主動開食飯、廚房或餵食話題，除非用家先提起食嘢。",
    "除非用家明確叫你表演食/飲動作，否則唔好用 [action:eat] 或 [action:drink]。",
  ].join(" ");
}

/**
 * Pet role copy when the hunger/treat loop is disabled.
 * @param {import("../mobile/companionRolePresets.js").CompanionRole | string | null | undefined} role
 * @param {boolean} [isEnglish]
 */
export function buildCareDisabledPetRoleFragment(role, isEnglish = false) {
  if (COMPANION_CARE_ENABLED) return "";
  const normalized = String(role || "")
    .toLowerCase()
    .trim();
  if (normalized !== "pet") return "";
  return isEnglish
    ? "Role: Cozy chat companion. Playful and warm — chat and voice only, no feeding or hunger mechanics."
    : "角色：治癒聊天同伴。可愛親切 — 只傾偈同語音，冇餵食或肚餓機制。";
}

/**
 * Action ids omitted from LLM motion hints while care is off.
 */
export function careDisabledActionIds() {
  return COMPANION_CARE_ENABLED ? [] : ["eat", "drink"];
}
