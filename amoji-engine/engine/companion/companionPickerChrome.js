/**
 * Gacha / visual-novel style companion picker chrome — filters, hero preview, copy.
 */
import {
  GALLERY_PRIORITY_IDS,
  HIGH_POLY_FACE_MIN_TRIANGLES,
} from "./companionCharacterCatalog.js";

export const COMPANION_PICKER_CHROME_SCHEMA = "amoji.companionPickerChrome.v1";

/** @typedef {"all" | "featured" | "hd" | "warm"} PickerFilterId */

export const PICKER_FILTER_IDS = Object.freeze(["all", "featured", "hd", "warm"]);

/**
 * @param {boolean} [isEnglish]
 */
export function pickerFilterLabels(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    all: en ? "All" : "全部",
    featured: en ? "★ Featured" : "★ 推介",
    hd: en ? "HD Face" : "HD 面",
    warm: en ? "Warm" : "溫柔",
  };
}

/**
 * @param {boolean} [isEnglish]
 */
export function pickerCopy(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    title: en ? "Choose your companion" : "揀你嘅同伴",
    sub: en
      ? "Preview their vibe, then begin your story."
      : "睇吓佢哋嘅感覺，再開始傾偈。",
    begin: en ? "Begin chat" : "開始傾偈",
    switch: en ? "Switch companion" : "切換同伴",
    searchPlaceholder: en ? "Search by name…" : "搜尋名字…",
    rosterHint: (total) =>
      en ? `${total} companions · swipe to browse` : `${total} 位同伴 · 滑動瀏覽`,
    footStart: en
      ? "★ Featured picks use gallery-quality models. 3D loads after you begin."
      : "★ 推介角色用靚女 gallery 模型。開始後先載入 3D。",
    footSession: en
      ? "Switch anytime — your chat history stays with each companion."
      : "隨時切換 — 每位同伴嘅對話記錄分開保存。",
    starting: en ? "Starting…" : "開始中…",
    waiting: en ? "Almost ready…" : "快好喇…",
  };
}

/**
 * @param {{ id?: string, faceTier?: string, faceTriangles?: number, traits?: string[] }} item
 */
export function isPickerFeatured(item) {
  return GALLERY_PRIORITY_IDS.has(String(item?.id || "").toLowerCase());
}

/**
 * @param {{ faceTier?: string, faceTriangles?: number }} item
 */
export function isPickerHdFace(item) {
  return (
    item?.faceTier === "high" &&
    Number(item?.faceTriangles || 0) >= HIGH_POLY_FACE_MIN_TRIANGLES
  );
}

/**
 * Warm / gentle personalities — heuristic from traits text.
 * @param {{ traits?: string[] }} item
 */
export function isPickerWarmTone(item) {
  const blob = (item?.traits || []).join(" ").toLowerCase();
  return /warm|gentle|soft|kind|sweet|caring|溫柔|體貼|治癒|暖心|親切/.test(blob);
}

/**
 * @param {ReturnType<import("./companionCharacterCatalog.js").listCompanionCharacters>} list
 * @param {{ filter?: PickerFilterId, query?: string }} [opts]
 */
export function filterPickerCharacters(list, opts = {}) {
  const filter = opts.filter || "all";
  const q = String(opts.query || "")
    .trim()
    .toLowerCase();
  let out = Array.isArray(list) ? [...list] : [];
  if (filter === "featured") out = out.filter(isPickerFeatured);
  else if (filter === "hd") out = out.filter(isPickerHdFace);
  else if (filter === "warm") out = out.filter(isPickerWarmTone);
  if (q) {
    out = out.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const num = String(item?.number || "");
      return name.includes(q) || num === q;
    });
  }
  return out;
}

/**
 * @param {ReturnType<import("./companionCharacterCatalog.js").listCompanionCharacters>[number] | null | undefined} item
 * @param {boolean} [isEnglish]
 */
export function pickerHeroKicker(item, isEnglish = false) {
  if (!item) return isEnglish ? "Select a companion" : "揀一位同伴";
  const parts = [];
  if (item.number) parts.push(isEnglish ? `#${item.number}` : `#${item.number}`);
  if (item.badge) parts.push(String(item.badge));
  if (item.faceLabel) parts.push(String(item.faceLabel));
  return parts.join(" · ") || (isEnglish ? "Companion" : "同伴");
}

/**
 * Update hero preview DOM from a roster item.
 * @param {ParentNode | null | undefined} root
 * @param {ReturnType<import("./companionCharacterCatalog.js").listCompanionCharacters>[number] | null | undefined} item
 * @param {boolean} [isEnglish]
 */
export function updatePickerHero(root, item, isEnglish = false) {
  if (!root) return;
  const hero = root.querySelector?.(".picker-hero");
  if (!hero) return;
  const img = hero.querySelector(".picker-hero-portrait img");
  const kicker = hero.querySelector(".picker-hero-kicker");
  const name = hero.querySelector(".picker-hero-name");
  const tagline = hero.querySelector(".picker-hero-tagline");
  const traitsEl = hero.querySelector(".picker-hero-traits");
  const accent = item?.accent || "#8b7cf8";
  hero.style.setProperty("--hero-accent", accent);
  if (img) {
    if (item?.previewImage) {
      img.src = item.previewImage;
      img.alt = item?.name || "";
    } else {
      img.removeAttribute("src");
      img.alt = "";
    }
  }
  if (kicker) kicker.textContent = pickerHeroKicker(item, isEnglish);
  if (name) name.textContent = item?.name || (isEnglish ? "—" : "—");
  if (tagline) {
    tagline.textContent = item?.tagline || "";
    tagline.hidden = !item?.tagline;
  }
  if (traitsEl) {
    traitsEl.replaceChildren();
    for (const trait of (item?.traits || []).slice(0, 3)) {
      const chip = document.createElement("span");
      chip.className = "picker-hero-trait";
      chip.textContent = trait;
      traitsEl.appendChild(chip);
    }
  }
  hero.classList.toggle("is-empty", !item);
}

/**
 * Build filter chip buttons HTML.
 * @param {boolean} [isEnglish]
 * @param {PickerFilterId} [active]
 */
export function pickerFilterButtonsHtml(isEnglish = false, active = "all") {
  const labels = pickerFilterLabels(isEnglish);
  return PICKER_FILTER_IDS.map(
    (id) =>
      `<button type="button" class="picker-filter-chip${id === active ? " is-active" : ""}" data-picker-filter="${id}" role="tab" aria-selected="${id === active ? "true" : "false"}">${labels[id]}</button>`,
  ).join("");
}

export const PICKER_HERO_HTML = `
  <section class="picker-hero" aria-live="polite">
    <div class="picker-hero-glow" aria-hidden="true"></div>
    <div class="picker-hero-portrait">
      <img alt="" loading="eager" decoding="async" />
    </div>
    <div class="picker-hero-meta">
      <p class="picker-hero-kicker"></p>
      <h3 class="picker-hero-name"></h3>
      <p class="picker-hero-tagline"></p>
      <div class="picker-hero-traits"></div>
    </div>
  </section>
`.trim();

export const PICKER_TOOLBAR_HTML = `
  <div class="picker-toolbar">
    <label class="picker-search-wrap">
      <span class="visually-hidden">Search companions</span>
      <input type="search" class="picker-search" autocomplete="off" enterkeyhint="search" />
    </label>
    <div class="picker-filters" role="tablist"></div>
  </div>
`.trim();
