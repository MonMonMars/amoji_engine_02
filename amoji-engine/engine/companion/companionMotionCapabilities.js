/**
 * User-facing motion capability copy + LLM hints after the cloud library installs.
 */
import { PLAYABLE_ACTIONS } from "./companionActionCatalog.js";
import {
  CLOUD_EXTENSION_MOTIONS,
  PREMIUM_EXTENSION_MOTIONS,
} from "./motionPackData.mjs";
import { listInstalledMotionIds } from "./companionMotionLibrary.js";

export const COMPANION_MOTION_CAPABILITIES_SCHEMA =
  "amoji.companionMotionCapabilities.v1";

/** Highlight moves we showcase while idle / loading (≥10). */
export const SHOWCASE_MOTION_IDS = Object.freeze([
  "wave",
  "nod",
  "bow",
  "clap",
  "dance",
  "stretch",
  "thinking",
  "peace",
  "thumbsup",
  "spin",
  "celebrate",
  "kungfu",
  "taiji",
  "breakdance",
  "highfive",
  "hiphop",
  "fingerheart",
  "superhero",
]);

const EXTENSION_IDS = Object.freeze([
  ...Object.keys(CLOUD_EXTENSION_MOTIONS),
  ...Object.keys(PREMIUM_EXTENSION_MOTIONS),
]);

/**
 * @param {string} id
 * @param {boolean} [isEnglish]
 */
export function motionDisplayLabel(id, isEnglish = false) {
  const key = String(id || "").toLowerCase();
  const cloud =
    CLOUD_EXTENSION_MOTIONS[key] || PREMIUM_EXTENSION_MOTIONS[key] || null;
  if (cloud?.label) {
    return isEnglish ? cloud.label.en : cloud.label.yue;
  }
  return key;
}

/**
 * @param {string[]} [installedIds]
 */
export function countInstalledShowcaseMotions(installedIds = listInstalledMotionIds()) {
  const set = new Set(installedIds.map((id) => String(id).toLowerCase()));
  return SHOWCASE_MOTION_IDS.filter((id) => set.has(id)).length;
}

/**
 * Short comma list for toast / system bubble.
 * @param {boolean} [isEnglish]
 * @param {string[]} [installedIds]
 */
export function formatMotionCapabilitySummary(isEnglish = false, installedIds) {
  const installed = new Set(
    (installedIds || listInstalledMotionIds()).map((id) =>
      String(id).toLowerCase(),
    ),
  );
  const picks = SHOWCASE_MOTION_IDS.filter((id) => installed.has(id)).slice(
    0,
    12,
  );
  const labels = picks.map((id) => motionDisplayLabel(id, isEnglish));
  const total = installed.size || PLAYABLE_ACTIONS.length;
  if (isEnglish) {
    return {
      headline: `I learned ${total}+ body moves — ask me anytime!`,
      examples: `Try: ${labels.join(", ")}…`,
      askHint: 'Say "show me a dance" or "wave at me" and I will perform.',
    };
  }
  return {
    headline: `我學識咗 ${total}+ 個身體動作 — 隨時可以叫我做！`,
    examples: `例如：${labels.join("、")}…`,
    askHint: "可以話「跳個舞」、「揮手」或者「表演幾個動作」俾我。",
  };
}

/**
 * Extra LLM fragment once motions are installed (appended to system prompt).
 * @param {boolean} [isEnglish]
 * @param {string[]} [installedIds]
 */
export function buildMotionCapabilityPromptFragment(
  isEnglish = false,
  installedIds,
) {
  const installed = new Set(
    (installedIds || listInstalledMotionIds()).map((id) =>
      String(id).toLowerCase(),
    ),
  );
  const showcase = SHOWCASE_MOTION_IDS.filter((id) => installed.has(id));
  const extensions = EXTENSION_IDS.filter((id) => installed.has(id));
  const showcaseLine = showcase.slice(0, 14).join(", ");
  const extLine = extensions.slice(0, 10).join(", ");

  if (isEnglish) {
    return [
      `You have ${installed.size || PLAYABLE_ACTIONS.length}+ installed body moves. While idle or loading you may softly perform: ${showcaseLine}.`,
      `Premium / cloud moves ready: ${extLine}. When the user asks for a move, reply briefly then tag [action:id] before [mood:…].`,
      'If they ask "what can you do?", list 6–8 moves from the installed set and offer a demo with [action:wave] or [action:dance].',
      "Between chat turns you can suggest trying a move — keep it one short sentence.",
    ].join(" ");
  }

  return [
    `你已安裝 ${installed.size || PLAYABLE_ACTIONS.length}+ 個身體動作。等緊或者載入時可以輕微做：${showcaseLine}。`,
    `雲端動作已就緒：${extLine}。用家叫做動作時，短句回覆再加 [action:id]（放喺 mood 前面）。`,
    "用家問「你做咩動作」時，列出 6–8 個已安裝動作，可以順便 [action:wave] 或 [action:dance] 示範。",
    "聊天空檔可以用一句話邀請佢試下叫你做動作。",
  ].join(" ");
}
