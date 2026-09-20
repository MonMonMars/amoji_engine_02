/**
 * Character-select / title art URLs with deploy cache-bust.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";

export const COMPANION_PICKER_ASSETS_SCHEMA = "amoji.companionPickerAssets.v1";

/** Bump when picker-aaa-bg.png or companion-bg-anime.png changes. */
export const PICKER_SCENE_ART_REVISION = "picker-anime-v423-hq-scene-bg";

export const PICKER_AAA_BG_PATH = "/prototypes/assets/picker-aaa-bg.png";
export const COMPANION_ANIME_BG_PATH = "/prototypes/assets/companion-bg-anime.png";

/**
 * @param {string} path
 * @param {string | null | undefined} [buildId]
 */
export function pickerArtFetchUrl(path, buildId) {
  const base = String(path || "").trim();
  if (!base) return "";
  const bust = String(
    buildId ?? globalThis.__amojiBuild ?? AMOJI_BUILD ?? "",
  ).trim();
  const tag = [bust, PICKER_SCENE_ART_REVISION].filter(Boolean).join("-");
  return `${base.split("?")[0]}?v=${encodeURIComponent(tag)}`;
}

/**
 * @param {string | null | undefined} [buildId]
 */
export function pickerAaaBgUrl(buildId) {
  return pickerArtFetchUrl(PICKER_AAA_BG_PATH, buildId);
}

/**
 * @param {HTMLElement | null | undefined} root
 * @param {string | null | undefined} [buildId]
 */
export function applyPickerAaaBackgroundArt(root, buildId) {
  if (!root) return;
  const url = pickerAaaBgUrl(buildId);
  root.style.setProperty(
    "--picker-aaa-bg-image",
    `url("${url}")`,
  );
}
