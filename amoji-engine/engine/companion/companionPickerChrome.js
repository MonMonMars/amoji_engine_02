/**
 * Gacha / visual-novel style companion picker chrome — filters, hero preview, copy.
 */
import {
  GALLERY_PRIORITY_IDS,
  HIGH_POLY_FACE_MIN_TRIANGLES,
} from "./companionCharacterCatalog.js";
import { wireCompanionPreviewFallback } from "./companionPreviewFallback.js";
import {
  applySceneBackground,
  resolveSceneBackgroundId,
  SCENE_BACKGROUND_PRESETS,
  scenePresetLabel,
} from "./companionScenePresets.js";

export const COMPANION_PICKER_CHROME_SCHEMA = "amoji.companionPickerChrome.v2-hero-scene";

/** @typedef {"all" | "girlfriend" | "boyfriend" | "secretary" | "pet" | "featured" | "hd" | "warm"} PickerFilterId */

export const PICKER_FILTER_IDS = Object.freeze([
  "all",
  "girlfriend",
  "boyfriend",
  "secretary",
  "pet",
  "featured",
  "hd",
  "warm",
]);

/**
 * @param {boolean} [isEnglish]
 */
export function pickerFilterLabels(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    all: en ? "All" : "全部",
    girlfriend: en ? "Girlfriend" : "女朋友",
    boyfriend: en ? "Boyfriend" : "男朋友",
    secretary: en ? "Secretary" : "秘書",
    pet: en ? "Pet" : "寵物",
    featured: en ? "★ Featured" : "★ 推介",
    hd: en ? "HD Face" : "HD 面",
    warm: en ? "Warm" : "溫柔",
  };
}

/**
 * @param {boolean} [isEnglish]
 */
import { CHARACTER_IDS } from "./companionCharacterCatalog.js";

export function pickerCopy(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    title: en ? "Choose your companion" : "揀你嘅同伴",
    sub: en
      ? "Each model has a role — girlfriend, boyfriend, secretary, or pet."
      : "每個模型都有功能 — 女朋友、男朋友、秘書或寵物。",
    begin: en ? "Start" : "開始",
    switch: en ? "Switch companion" : "切換同伴",
    featuredLabel: en
      ? `All companions · 1–${CHARACTER_IDS.length}`
      : `全部同伴 · 1–${CHARACTER_IDS.length}`,
    searchPlaceholder: en ? "Search by name…" : "搜尋名字…",
    rosterHint: (total) =>
      en ? `${total} companions · swipe to browse` : `${total} 位同伴 · 滑動瀏覽`,
    footStart: en
      ? "Tap Begin chat anytime — portraits & 3D load in the background."
      : "隨時按開始傾偈 — 肖像同 3D 會喺背景載入。",
    footSession: en
      ? "Switch anytime — your chat history stays with each companion."
      : "隨時切換 — 每位同伴嘅對話記錄分開保存。",
    langGroupLabel: en ? "Reply language" : "回覆語言",
    langYue: en ? "Cantonese" : "粵語",
    langEn: en ? "English" : "English",
    starting: en ? "Starting…" : "開始中…",
    waiting: en ? "Almost ready…" : "快好喇…",
    emptyResults: en
      ? "No companions match — try another filter or search."
      : "搵唔到同伴 — 試吓其他篩選或搜尋。",
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
/**
 * Top featured roster picks in catalog order (gacha banner row).
 * @param {ReturnType<import("./companionCharacterCatalog.js").listCompanionCharacters>} list
 * @param {number} [limit]
 */
export function listPickerFeatured(list, limit = CHARACTER_IDS.length) {
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    if (!isPickerFeatured(item)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function filterPickerCharacters(list, opts = {}) {
  const filter = opts.filter || "all";
  const q = String(opts.query || "")
    .trim()
    .toLowerCase();
  let out = Array.isArray(list) ? [...list] : [];
  if (filter === "girlfriend") {
    out = out.filter((item) => item.companionRole === "girlfriend");
  } else if (filter === "boyfriend") {
    out = out.filter((item) => item.companionRole === "boyfriend");
  } else if (filter === "secretary") {
    out = out.filter((item) => item.companionRole === "secretary");
  } else if (filter === "pet") {
    out = out.filter((item) => item.companionRole === "pet");
  } else if (filter === "featured") out = out.filter(isPickerFeatured);
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
  if (item.aaaBadge) parts.push(String(item.aaaBadge));
  if (item.badge) parts.push(String(item.badge));
  if (item.avatarLabel) parts.push(String(item.avatarLabel));
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
  const voiceEl = hero.querySelector(".picker-hero-voice");
  const modelEl = hero.querySelector(".picker-hero-model");
  const accent = item?.accent || "#8b7cf8";
  hero.style.setProperty("--hero-accent", accent);
  if (img) {
    wireCompanionPreviewFallback(img);
    const heroSrc = item?.heroPreviewImage || item?.previewImage;
    if (heroSrc) {
      const nextSrc = heroSrc;
      const currentSrc = img.getAttribute("src") || "";
      if (currentSrc !== nextSrc) {
        hero.classList.add("is-updating");
        img.addEventListener(
          "load",
          () => hero.classList.remove("is-updating"),
          { once: true },
        );
        img.src = nextSrc;
      }
      img.alt = item?.name || "";
    } else {
      hero.classList.remove("is-updating");
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
    traitsEl.hidden = !(item?.traits?.length);
  }
  if (modelEl) {
    const modelLine = item?.avatarLabel
      ? isEnglish
        ? `3D model: ${item.avatarLabel}`
        : `3D 模型：${item.avatarLabel}`
      : "";
    modelEl.textContent = modelLine;
    modelEl.hidden = !modelLine;
  }
  if (voiceEl) {
    const voice = item?.voiceLabel ? String(item.voiceLabel) : "";
    voiceEl.textContent = voice;
    voiceEl.hidden = !voice;
  }
  hero.classList.toggle("is-empty", !item);
  hero.classList.toggle("has-selection", Boolean(item));
}

/**
 * Sync selected scene background into the hero stage preview (start + in-session pickers).
 * @param {ParentNode | null | undefined} root
 * @param {string | null | undefined} backgroundId
 * @param {boolean} [isEnglish]
 */
export function updatePickerHeroBackground(root, backgroundId, isEnglish = false) {
  if (!root) return;
  const id = resolveSceneBackgroundId(backgroundId);
  const sceneEl = root.querySelector?.(".picker-hero-scene");
  if (sceneEl instanceof HTMLElement) {
    applySceneBackground(sceneEl, id);
  }
  const preset = SCENE_BACKGROUND_PRESETS.find((p) => p.id === id);
  const caption = root.querySelector?.(".picker-hero-scene-caption");
  if (caption && preset) {
    caption.textContent = scenePresetLabel(preset, isEnglish);
    caption.hidden = false;
  } else if (caption) {
    caption.textContent = "";
    caption.hidden = true;
  }
  const hero = root.querySelector?.(".picker-hero");
  hero?.classList.toggle("has-scene-preview", Boolean(sceneEl));
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
    <div class="picker-hero-preview-duo">
      <div class="picker-hero-scene-wrap">
        <div class="picker-hero-scene atmosphere" aria-hidden="true"></div>
        <p class="picker-hero-scene-caption"></p>
      </div>
      <div class="picker-hero-portrait-wrap">
        <div class="picker-hero-glow" aria-hidden="true"></div>
        <div class="picker-hero-portrait">
          <img alt="" loading="eager" decoding="async" />
        </div>
      </div>
    </div>
    <div class="picker-hero-meta">
      <p class="picker-hero-kicker"></p>
      <h3 class="picker-hero-name"></h3>
      <p class="picker-hero-tagline"></p>
      <p class="picker-hero-model"></p>
      <p class="picker-hero-voice"></p>
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

export const PICKER_FEATURED_ROW_HTML = `
  <div class="picker-featured-wrap">
    <p class="picker-featured-label"></p>
    <div class="picker-featured-row" role="listbox" aria-label="Featured companions"></div>
  </div>
`.trim();

/**
 * Roving keyboard focus for horizontal roster strips (gacha/VN listbox pattern).
 * @param {HTMLElement | null | undefined} gridEl
 * @param {{
 *   getSelectedId: () => string,
 *   setSelectedId: (id: string) => void,
 *   onSelect?: (id: string) => void,
 *   onConfirm?: () => void,
 *   disabled?: () => boolean,
 * }} opts
 * @returns {() => void} cleanup
 */
export function wirePickerRosterKeyboard(gridEl, opts) {
  if (!gridEl) return () => {};

  const cards = () =>
    [...gridEl.querySelectorAll(".companion-card:not([disabled])")].filter(
      (el) => el instanceof HTMLElement,
    );

  const ids = () =>
    cards()
      .map((card) => card.dataset.characterId)
      .filter(Boolean);

  const focusId = (id) => {
    const card = gridEl.querySelector(`[data-character-id="${id}"]`);
    if (card instanceof HTMLElement) card.focus();
  };

  const selectIndex = (nextIdx) => {
    if (opts.disabled?.()) return;
    const list = ids();
    if (!list.length) return;
    const clamped = Math.max(0, Math.min(list.length - 1, nextIdx));
    const id = list[clamped];
    if (!id) return;
    opts.setSelectedId(id);
    opts.onSelect?.(id);
    focusId(id);
  };

  const onKeyDown = (ev) => {
    if (!(ev.target instanceof Element)) return;
    if (!ev.target.closest(".companion-card")) return;
    if (opts.disabled?.()) return;

    const list = ids();
    const idx = list.indexOf(opts.getSelectedId());
    switch (ev.key) {
      case "ArrowRight":
      case "ArrowDown":
        ev.preventDefault();
        selectIndex(idx < 0 ? 0 : idx + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        ev.preventDefault();
        selectIndex(idx < 0 ? 0 : idx - 1);
        break;
      case "Home":
        ev.preventDefault();
        selectIndex(0);
        break;
      case "End":
        ev.preventDefault();
        selectIndex(list.length - 1);
        break;
      case "Enter":
        if (
          opts.onConfirm &&
          !ev.target.closest(".picker-search") &&
          !ev.target.closest(".picker-begin-btn") &&
          !ev.target.closest(".picker-switch-btn")
        ) {
          ev.preventDefault();
          opts.onConfirm();
        }
        break;
      default:
        break;
    }
  };

  gridEl.addEventListener("keydown", onKeyDown);
  return () => gridEl.removeEventListener("keydown", onKeyDown);
}

/**
 * Sync tabindex for listbox roving focus — selected option is tabbable.
 * @param {ParentNode | null | undefined} root
 * @param {string | null | undefined} selectedId
 */
export function syncPickerCardTabIndex(root, selectedId) {
  if (!root) return;
  root.querySelectorAll?.(".companion-card").forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const selected = card.dataset.characterId === selectedId;
    card.tabIndex = selected ? 0 : -1;
  });
}

/** Toggle selection chrome without rebuilding the roster grid (avoids portrait flash). */
export function syncPickerGridSelection(root, selectedId) {
  if (!root) return;
  const id = String(selectedId || "").toLowerCase();
  root.querySelectorAll?.(".companion-card").forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const selected = card.dataset.characterId === id;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-selected", selected ? "true" : "false");
    card.tabIndex = selected ? 0 : -1;
  });
}
