/**
 * Gacha / anime-game style card tap + companion reveal FX.
 */
import { spawnUiParticles } from "./companionUiParticles.js";

export const COMPANION_UI_GACHA_SCHEMA = "amoji.companionUiGacha.v1";

/**
 * @param {string} hex
 */
export function accentHexToHue(hex) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length !== 6 && raw.length !== 3) return 212;
  const expand =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = parseInt(expand.slice(0, 2), 16) / 255;
  const g = parseInt(expand.slice(2, 4), 16) / 255;
  const b = parseInt(expand.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 212;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(h * 60);
}

/**
 * @param {Element | null | undefined} cardEl
 * @param {{ accent?: string, id?: string }} [item]
 */
export function playCompanionCardTapFx(cardEl, item = {}) {
  if (!cardEl || typeof cardEl.getBoundingClientRect !== "function") return;
  cardEl.classList.remove("gacha-card-pop");
  void cardEl.offsetWidth;
  cardEl.classList.add("gacha-card-pop", "gacha-card-shimmer");
  const rect = cardEl.getBoundingClientRect();
  const accent =
    cardEl.style.getPropertyValue("--card-accent").trim() ||
    item.accent ||
    "#7fd4cf";
  spawnUiParticles({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    hue: accentHexToHue(accent),
    count: 18,
    spread: Math.max(rect.width, rect.height, 48) * 0.62,
  });
  globalThis.setTimeout?.(() => {
    cardEl.classList.remove("gacha-card-pop", "gacha-card-shimmer");
  }, 560);
}

/**
 * @param {Element | null | undefined} overlayEl
 */
export function celebrateCompanionSwitchReveal(overlayEl) {
  if (!overlayEl) return;
  overlayEl.classList.add("is-gacha-ready");
  const card = overlayEl.querySelector(".companion-switch-card");
  card?.classList.add("gacha-reveal-burst");
  globalThis.setTimeout?.(() => {
    card?.classList.remove("gacha-reveal-burst");
  }, 900);
}

/**
 * @param {Element | null | undefined} pickerEl
 */
export function playStartPickerDismissFx(pickerEl) {
  if (!pickerEl) return;
  pickerEl.classList.add("gacha-start-dismiss");
  globalThis.setTimeout?.(() => {
    pickerEl.classList.remove("gacha-start-dismiss");
  }, 680);
}
