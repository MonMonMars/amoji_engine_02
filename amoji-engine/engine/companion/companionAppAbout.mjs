/**
 * In-app about / build copy for Menu and picker footers.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";
import { AMOJI_MODEL_REVISION } from "./companionCharacterMigration.mjs";
import { CHARACTER_IDS } from "./companionCharacterCatalog.js";
import { DEMO_BASE_URL } from "./deployUrls.mjs";

export const COMPANION_APP_ABOUT_SCHEMA = "amoji.companionAppAbout.v2";

/** @returns {string} */
export function resolveAppBuildId() {
  const fromWindow =
    typeof globalThis !== "undefined" && globalThis.__amojiBuild
      ? String(globalThis.__amojiBuild)
      : "";
  return fromWindow.trim() || AMOJI_BUILD;
}

/**
 * @param {boolean} [isEnglish]
 */
export function formatSettingsAboutCopy(isEnglish = false) {
  const en = Boolean(isEnglish);
  const build = resolveAppBuildId();
  const roster = CHARACTER_IDS.length;
  return {
    sectionTitle: en ? "About" : "關於",
    buildLine: en
      ? `Build ${build} · roster ${AMOJI_MODEL_REVISION}`
      : `版本 ${build} · 名單 ${AMOJI_MODEL_REVISION}`,
    featuresLine: en
      ? `${roster} VRM companions · voice/text · poke & mic · secretary Today · safe boot (picker or auto-start)`
      : `${roster} 位 VRM · 語音/文字 · 戳身/麥克風 · 秘書 Today · 穩定開機（揀人或自動開始）`,
    modelHint: en
      ? "Each pick loads companion-<id>.vrm (see Menu if portrait and mesh differ on alias slots)."
      : "每次揀人會載入 companion-<id>.vrm（若卡面同模型唔同，可能係共用檔案）。",
    privacyLabel: en ? "Privacy policy" : "私隱政策",
    freshPlayLabel: en ? "Fresh entry (/play)" : "新開 /play",
    freshPlayUrl: `${DEMO_BASE_URL}/play?build=${encodeURIComponent(build)}&pick=1&automic=0&lang=${en ? "en" : "yue"}`,
  };
}

/**
 * @param {boolean} [isEnglish]
 */
export function formatPickerFootBuildLine(isEnglish = false) {
  const en = Boolean(isEnglish);
  const build = resolveAppBuildId();
  const roster = CHARACTER_IDS.length;
  return en
    ? `Build ${build} · ${roster} companions · 3D VRM`
    : `版本 ${build} · ${roster} 位 · 3D VRM`;
}
