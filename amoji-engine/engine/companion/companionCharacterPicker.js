/**
 * Gacha / visual-novel companion picker — hero preview, filters, confirm CTA.
 */
import {
  characterNumber,
  listCompanionCharacters,
  normalizeRosterCharacterId,
} from "./companionCharacterCatalog.js";
import {
  companionPreviewImgOnErrorAttr,
  wireCompanionPreviewFallback,
} from "./companionPreviewFallback.js";
import { formatPickerFootBuildLine } from "./companionAppAbout.mjs";
import {
  filterPickerCharacters,
  listPickerFeatured,
  pickerCopy,
  pickerFilterButtonsHtml,
  PICKER_FEATURED_ROW_HTML,
  PICKER_HERO_HTML,
  PICKER_TOOLBAR_HTML,
  syncPickerCardTabIndex,
  syncPickerGridSelection,
  updatePickerHero,
  wirePickerRosterKeyboard,
} from "./companionPickerChrome.js";
import {
  LOADING_BAR_HTML,
  LOADING_RING_HTML,
  wireLoadingBar,
} from "./companionLoadingUi.js";
import { closeUiOverlay, openUiOverlay } from "./companionUiEffects.js";
import { notifyCompanionMenuOverlayOpened } from "./companionMenuSpeechGate.js";
import {
  applySceneBackground,
  loadStoredSceneBackground,
  persistSceneBackground,
  scenePresetLabel,
  SCENE_BACKGROUND_PRESETS,
} from "./companionScenePresets.js";
import { wireScrollAffordances } from "./companionScrollAffordances.js";
import { applyPickerAaaBackgroundArt } from "./companionPickerAssets.mjs";
import {
  clearStartPickerBodyLocks,
  markStartPickerDismissed,
} from "./companionStartPickerGate.mjs";

export const COMPANION_CHARACTER_PICKER_SCHEMA =
  "amoji.companionCharacterPicker.v9-roster480-replacement";

export const COMPANION_START_PICKER_SCHEMA = "amoji.companionStartPicker.v11";

export const PICKER_SCENE_SECTION_HTML = `
  <section class="picker-scene-section" aria-label="Background">
    <p class="picker-scene-label"></p>
    <div class="picker-scene-row" role="listbox"></div>
  </section>
`.trim();

/**
 * Background swatches shared by start + in-session pickers.
 * @param {{
 *   root?: ParentNode | null,
 *   sceneRowEl?: HTMLElement | null,
 *   sceneLabelEl?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   atmosphereEl?: HTMLElement | null,
 *   initialBackgroundId?: string,
 *   onBackgroundChange?: (id: string) => void,
 *   canInteract?: () => boolean,
 * }} opts
 */
export function wirePickerSceneSection(opts = {}) {
  let isEnglish = Boolean(opts.isEnglish);
  const sceneRowEl =
    opts.sceneRowEl || opts.root?.querySelector?.(".picker-scene-row") || null;
  const sceneLabelEl =
    opts.sceneLabelEl || opts.root?.querySelector?.(".picker-scene-label") || null;
  const canInteract = opts.canInteract || (() => true);
  let activeBackgroundId =
    opts.initialBackgroundId || loadStoredSceneBackground(isEnglish).id;

  const renderPickerSceneRow = () => {
    if (!sceneRowEl) return;
    sceneRowEl.replaceChildren();
    for (const preset of SCENE_BACKGROUND_PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "picker-scene-chip" + (preset.id === activeBackgroundId ? " is-active" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute(
        "aria-selected",
        preset.id === activeBackgroundId ? "true" : "false",
      );
      btn.title = scenePresetLabel(preset, isEnglish);
      btn.innerHTML = `
        <span class="scene-preset__swatch scene-preset__swatch--${preset.id}" aria-hidden="true"></span>
        <span class="picker-scene-chip__label">${scenePresetLabel(preset, isEnglish)}</span>
      `.trim();
      btn.addEventListener("click", () => {
        if (!canInteract()) return;
        applyPickerBackground(preset.id);
      });
      sceneRowEl.appendChild(btn);
    }
    wireScrollAffordances(sceneRowEl, {
      labels: isEnglish
        ? { prev: "Previous backgrounds", next: "More backgrounds" }
        : { prev: "上一個背景", next: "更多背景" },
    });
  };

  const syncPickerSceneChrome = () => {
    const sectionEl = opts.root?.querySelector?.(".picker-scene-section");
    if (sectionEl) {
      sectionEl.setAttribute("aria-label", isEnglish ? "Background" : "背景");
    }
    if (sceneLabelEl) {
      sceneLabelEl.textContent = isEnglish ? "Background" : "背景";
    }
    renderPickerSceneRow();
  };

  const applyPickerBackground = (backgroundId, syncOpts = {}) => {
    const notify = syncOpts.notify !== false;
    activeBackgroundId = backgroundId;
    const atmosphere =
      opts.atmosphereEl || document.querySelector?.(".atmosphere") || null;
    applySceneBackground(atmosphere, backgroundId);
    persistSceneBackground(backgroundId);
    if (notify) opts.onBackgroundChange?.(backgroundId);
    renderPickerSceneRow();
  };

  return {
    getBackgroundId: () => activeBackgroundId,
    setBackgroundId: applyPickerBackground,
    sync: syncPickerSceneChrome,
    setLocale(nextEnglish) {
      isEnglish = Boolean(nextEnglish);
      syncPickerSceneChrome();
    },
    setOnBackgroundChange(handler) {
      opts.onBackgroundChange =
        typeof handler === "function" ? handler : undefined;
    },
  };
}

/** @deprecated Start picker uses the showcase layout (hero stage + roster strip). */
export const START_PICKER_ROSTER_FIRST_MAX = 12;

export const START_PICKER_PRELOAD_RING_HTML = `
  <div class="start-picker-preload-ring">
    ${LOADING_RING_HTML}
  </div>
`.trim();

export const START_PICKER_PRELOAD_BAR_HTML = LOADING_BAR_HTML;

/**
 * @param {ReturnType<typeof listCompanionCharacters>[number]} item
 * @param {{ selectedId?: string, compact?: boolean, eagerPreview?: boolean }} [ctx]
 */
export function companionCardInnerHtml(item, ctx = {}) {
  const compact = Boolean(ctx.compact);
  const eagerPreview = Boolean(ctx.eagerPreview);
  const imgAttrs = eagerPreview
    ? `loading="eager" fetchpriority="high" decoding="async" ${companionPreviewImgOnErrorAttr()}`
    : `loading="lazy" decoding="async" ${companionPreviewImgOnErrorAttr()}`;
  const number = cardNumber(item);
  const numberBadge = number
    ? `<span class="companion-card-number" aria-hidden="true">${number}</span>`
    : "";
  const labeledName = number ? `${number} ${item.name}` : item.name;
  const hideRoleChrome = Boolean(ctx.hideRoleStrip || ctx.hideRoleChrome);
  const roleBadge =
    !hideRoleChrome && item.roleBadge
      ? `<span class="companion-card-role companion-card-role--${item.companionRole || "girlfriend"}${compact ? " companion-card-role--mini" : ""}">${item.roleBadge}</span>`
      : "";
  const badge = item.badge
    ? `<span class="companion-card-badge${compact ? " companion-card-badge--mini" : ""}">${item.badge}</span>`
    : "";
  const faceChip =
    !compact && item.showFaceChip && item.faceLabel
      ? `<span class="companion-card-face">${item.faceLabel}</span>`
      : "";
  const traits = compact
    ? ""
    : (item.traits || [])
        .slice(0, 2)
        .map((t) => `<span class="companion-card-trait">${t}</span>`)
        .join("");
  const voiceChip =
    item.voiceLabel && !ctx.startMini
      ? `<span class="companion-card-voice">${item.voiceLabel}</span>`
      : "";

  if (compact && ctx.startMini) {
    return `
      <div class="companion-card-portrait">
        <img src="${item.previewImage}" alt="" ${imgAttrs} />
        <span class="companion-card-check" aria-hidden="true">✓</span>
      </div>
    `;
  }

  if (compact && ctx.startStrip) {
    const stripRole =
      !hideRoleChrome && item.roleBadge
        ? `<span class="companion-card-role-strip">${item.roleBadge}</span>`
        : "";
    const aaaBadge = item.aaaBadge
      ? `<span class="companion-card-aaa">${item.aaaBadge}</span>`
      : "";
    return `
      <div class="companion-card-portrait">
        <img src="${item.previewImage}" alt="" ${imgAttrs} />
        ${numberBadge}
        ${aaaBadge}
        <span class="companion-card-check" aria-hidden="true">✓</span>
      </div>
      <span class="companion-card-name">${labeledName}</span>
      ${stripRole}
    `;
  }

  if (compact) {
    return `
      <div class="companion-card-portrait">
        <img src="${item.previewImage}" alt="" ${imgAttrs} />
        ${numberBadge}
        ${roleBadge}
        ${badge}
        ${faceChip}
        <span class="companion-card-check" aria-hidden="true">✓</span>
      </div>
      <span class="companion-card-name">${labeledName}</span>
      ${voiceChip}
    `;
  }

  return `
    <div class="companion-card-portrait">
      <img src="${item.previewImage}" alt="" ${imgAttrs} />
      ${numberBadge}
      ${roleBadge}
      ${badge}
      ${faceChip}
      <span class="companion-card-check" aria-hidden="true">✓</span>
    </div>
    <div class="companion-card-body">
      <h3 class="companion-card-name">${labeledName}</h3>
      <p class="companion-card-tagline">${item.tagline}</p>
      <div class="companion-card-traits">${traits}${voiceChip}</div>
    </div>
  `;
}

/**
 * @param {{ id?: string, number?: number }} item
 */
function cardNumber(item) {
  const fromItem = Number(item?.number);
  if (Number.isFinite(fromItem) && fromItem > 0) return Math.round(fromItem);
  return characterNumber(item?.id);
}

/**
 * @param {HTMLElement | null} gridEl
 * @param {"yue" | "en"} langCode
 * @param {{
 *   selectedId?: string,
 *   compact?: boolean,
 *   disabled?: boolean,
 *   eagerPreview?: boolean,
 *   roster?: ReturnType<typeof listCompanionCharacters>,
 *   rosterStrip?: boolean,
 *   hideRoleStrip?: boolean,
 *   isEnglish?: boolean,
 *   onCardClick?: (id: string) => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} ctx
 */
export function renderCompanionPickerGrid(gridEl, langCode, ctx = {}) {
  if (!gridEl) return;
  const compact = ctx.compact !== false;
  const list = ctx.roster || listCompanionCharacters(langCode);
  gridEl.innerHTML = "";
  gridEl.classList.toggle("companion-picker-grid--roster", Boolean(ctx.rosterStrip));
  if (list.length === 0) {
    const empty = pickerCopy(ctx.isEnglish).emptyResults;
    gridEl.innerHTML = `<p class="picker-empty" role="status">${empty}</p>`;
    gridEl.classList.remove("companion-picker-grid--roster");
    return;
  }
  for (const item of list) {
    gridEl.appendChild(
      createCompanionCardButton(item, {
        selectedId: ctx.selectedId,
        compact,
        featured: ctx.featured,
        rosterStrip: ctx.rosterStrip,
        startMini: ctx.startMini,
        startStrip: ctx.startStrip,
        hideRoleStrip: ctx.hideRoleStrip,
        hideRoleChrome: ctx.hideRoleChrome,
        eagerPreview: ctx.eagerPreview,
        disabled: ctx.disabled,
        onCardTapFx: ctx.onCardTapFx,
        onClick: (id) => {
          if (ctx.disabled) return;
          ctx.onCardClick?.(id);
        },
      }),
    );
  }
  syncPickerCardTabIndex(gridEl, ctx.selectedId);
  if (ctx.rosterStrip || ctx.startStrip) {
    wireScrollAffordances(gridEl, {
      labels: ctx.isEnglish
        ? { prev: "Previous companions", next: "More companions" }
        : { prev: "上一個同伴", next: "更多同伴" },
    });
  }
}

/**
 * @param {HTMLElement | null} rowEl
 * @param {"yue" | "en"} langCode
 * @param {{
 *   selectedId?: string,
 *   disabled?: boolean,
 *   eagerPreview?: boolean,
 *   roster?: ReturnType<typeof listCompanionCharacters>,
 *   isEnglish?: boolean,
 *   onCardClick?: (id: string) => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} ctx
 */
export function renderPickerFeaturedRow(rowEl, langCode, ctx = {}) {
  if (!rowEl) return;
  const list = ctx.roster || listPickerFeatured(listCompanionCharacters(langCode));
  rowEl.innerHTML = "";
  rowEl.hidden = list.length === 0;
  for (const item of list) {
    rowEl.appendChild(
      createCompanionCardButton(item, {
        selectedId: ctx.selectedId,
        compact: true,
        featured: true,
        hideRoleStrip: ctx.hideRoleStrip,
        hideRoleChrome: ctx.hideRoleChrome,
        eagerPreview: ctx.eagerPreview,
        disabled: ctx.disabled,
        onCardTapFx: ctx.onCardTapFx,
        onClick: (id) => {
          if (ctx.disabled) return;
          ctx.onCardClick?.(id);
        },
      }),
    );
  }
  syncPickerCardTabIndex(rowEl, ctx.selectedId);
}

/**
 * @param {ReturnType<typeof listCompanionCharacters>[number]} item
 * @param {{
 *   selectedId?: string,
 *   compact?: boolean,
 *   featured?: boolean,
 *   rosterStrip?: boolean,
 *   eagerPreview?: boolean,
 *   disabled?: boolean,
 *   onClick?: (id: string) => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} ctx
 */
export function createCompanionCardButton(item, ctx = {}) {
  const compact = Boolean(ctx.compact);
  const card = document.createElement("button");
  card.type = "button";
  if (ctx.disabled) {
    card.disabled = true;
    card.setAttribute("aria-disabled", "true");
  }
  card.className = compact
    ? "companion-card companion-card--compact" +
      (ctx.featured ? " companion-card--featured" : "") +
      (ctx.rosterStrip ? " companion-card--roster" : "") +
      (ctx.startMini ? " companion-card--start-mini" : "") +
      (ctx.startStrip ? " companion-card--start-strip" : "")
    : "companion-card";
  card.dataset.characterId = item.id;
  card.dataset.characterNumber = String(cardNumber(item) || "");
  card.setAttribute("role", "option");
  const number = cardNumber(item);
  card.setAttribute(
    "aria-label",
    number ? `${number}. ${item.name}` : String(item.name || item.id),
  );
  card.setAttribute(
    "aria-selected",
    item.id === ctx.selectedId ? "true" : "false",
  );
  if (item.id === ctx.selectedId) card.classList.add("is-selected");
  card.tabIndex = item.id === ctx.selectedId ? 0 : -1;
  card.style.setProperty("--card-accent", item.accent || "#7fd4cf");
  card.innerHTML = companionCardInnerHtml(item, ctx);
  card.addEventListener("click", () => {
    ctx.onCardTapFx?.(card, item);
    ctx.onClick?.(item.id);
  });
  return card;
}

/**
 * @param {HTMLElement} shell
 * @param {{
 *   isEnglish: boolean,
 *   getFilter: () => string,
 *   setFilter: (id: string) => void,
 *   getQuery: () => string,
 *   setQuery: (q: string) => void,
 *   onChange: () => void,
 * }} opts
 */
function wirePickerToolbar(shell, opts) {
  const search = shell.querySelector(".picker-search");
  const filtersEl = shell.querySelector(".picker-filters");
  const resolveEnglish = () =>
    typeof opts.getIsEnglish === "function"
      ? Boolean(opts.getIsEnglish())
      : Boolean(opts.isEnglish);

  if (search) {
    search.placeholder = pickerCopy(resolveEnglish()).searchPlaceholder;
    search.value = opts.getQuery();
    search.oninput = () => {
      opts.setQuery(search.value);
      opts.onChange();
    };
  }

  const paintFilters = () => {
    if (!filtersEl) return;
    filtersEl.innerHTML = pickerFilterButtonsHtml(
      resolveEnglish(),
      opts.getFilter(),
    );
    filtersEl.querySelectorAll("[data-picker-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-picker-filter");
        if (!id || id === opts.getFilter()) return;
        opts.setFilter(id);
        paintFilters();
        opts.onChange();
      });
    });
  };
  paintFilters();

  return {
    syncLocale() {
      if (search) {
        search.placeholder = pickerCopy(resolveEnglish()).searchPlaceholder;
      }
      paintFilters();
    },
  };
}

/**
 * @param {ReturnType<typeof listCompanionCharacters>} list
 * @param {string | null | undefined} id
 */
function findPickerItem(list, id) {
  return list.find((item) => item.id === id) || list[0] || null;
}

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   selectedId?: string,
 *   onSelect?: (id: string) => void,
 *   onClose?: () => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 *   atmosphereEl?: HTMLElement | null,
 *   backgroundId?: string,
 *   onBackgroundChange?: (backgroundId: string) => void,
 * }} opts
 */
export function createCompanionCharacterPicker(opts = {}) {
  let isEnglish = Boolean(opts.isEnglish);
  let langCode = isEnglish ? "en" : "yue";
  /** Live session character — updated by setSelected after hot-swap. */
  let activeCharacterId = normalizeRosterCharacterId(opts.selectedId || "nova");
  let selectedId = activeCharacterId;
  let rosterProvider =
    typeof opts.rosterProvider === "function" ? opts.rosterProvider : null;
  let filterId = "all";
  let query = "";
  let open = false;
  let unwireFeaturedKeys = () => {};
  let unwireRosterKeys = () => {};
  /** @type {(() => void) | null} */
  let unwireFeaturedScroll = null;
  /** @type {(() => void) | null} */
  let unwireGridScroll = null;
  let sessionCopyOverrides = { ...(opts.pickerCopy || {}) };
  const mergePickerCopy = () => ({
    ...pickerCopy(isEnglish),
    ...sessionCopyOverrides,
  });
  let copy = mergePickerCopy();
  const fullList = () =>
    rosterProvider ? rosterProvider(langCode) : listCompanionCharacters(langCode);

  const shell = document.createElement("div");
  shell.className =
    "companion-picker companion-picker--v4 companion-picker--aaa-theme companion-picker--session hide";
  shell.id = "companion-character-picker";
  shell.hidden = true;
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.setAttribute("aria-label", isEnglish ? "Choose companion" : "揀同伴");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" data-picker-close></div>
    <div class="companion-picker-sheet">
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
        <button type="button" class="companion-picker-close" data-picker-close aria-label="Close">
          <svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
        </button>
      </header>
      <div class="picker-main">
        <aside class="picker-hero-panel">
          ${PICKER_HERO_HTML}
        </aside>
        <section class="picker-roster-panel">
          ${PICKER_TOOLBAR_HTML}
          ${PICKER_FEATURED_ROW_HTML}
          <div class="picker-roster-wrap">
            <div class="companion-picker-grid" role="listbox"></div>
          </div>
          ${PICKER_SCENE_SECTION_HTML}
        </section>
      </div>
      <div class="picker-session-actions">
        <button type="button" class="picker-confirm-btn picker-switch-btn"></button>
        <p class="companion-picker-foot"></p>
        <p class="companion-picker-foot-build" aria-hidden="true"></p>
      </div>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);
  applyPickerAaaBackgroundArt(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const footBuildEl = shell.querySelector(".companion-picker-foot-build");
  const confirmBtn = shell.querySelector(".picker-switch-btn");
  const featuredWrap = shell.querySelector(".picker-featured-wrap");
  const featuredLabel = shell.querySelector(".picker-featured-label");
  const featuredRow = shell.querySelector(".picker-featured-row");
  const sceneSection = wirePickerSceneSection({
    root: shell,
    isEnglish,
    atmosphereEl: opts.atmosphereEl,
    initialBackgroundId: opts.backgroundId,
    onBackgroundChange: opts.onBackgroundChange,
  });

  const paintCopy = () => {
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) subEl.textContent = copy.sub;
    if (footEl) footEl.textContent = copy.footSession;
    if (footBuildEl) footBuildEl.textContent = formatPickerFootBuildLine(isEnglish);
    if (confirmBtn) confirmBtn.textContent = copy.switch;
    if (featuredLabel) featuredLabel.textContent = copy.featuredLabel;
  };

  const applySelection = (id) => {
    selectedId = normalizeRosterCharacterId(id);
    renderAll();
  };

  const scrollLabels = () =>
    isEnglish
      ? { prev: "Previous", next: "More" }
      : { prev: "上一頁", next: "更多" };

  const renderFeatured = () => {
    renderPickerFeaturedRow(featuredRow, langCode, {
      selectedId,
      roster: fullList(),
      hideRoleStrip: true,
      eagerPreview: true,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    if (featuredWrap) {
      featuredWrap.hidden = !featuredRow?.childElementCount;
    }
    unwireFeaturedScroll?.();
    unwireFeaturedScroll = featuredRow
      ? wireScrollAffordances(featuredRow, {
          axis: "x",
          labels: scrollLabels(),
        })
      : null;
  };

  const renderGrid = () => {
    const filtered = filterPickerCharacters(fullList(), {
      filter: filterId,
      query,
    });
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      roster: filtered,
      isEnglish,
      hideRoleStrip: true,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    unwireGridScroll?.();
    unwireGridScroll = gridEl
      ? wireScrollAffordances(gridEl, {
          axis: "x",
          labels: scrollLabels(),
        })
      : null;
    updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
  };

  const renderAll = () => {
    renderFeatured();
    renderGrid();
  };

  const confirmSelection = () => {
    if (selectedId === activeCharacterId) {
      close();
      return;
    }
    opts.onSelect?.(selectedId);
  };

  unwireFeaturedKeys = wirePickerRosterKeyboard(featuredRow, {
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    onSelect: applySelection,
    onConfirm: confirmSelection,
  });
  unwireRosterKeys = wirePickerRosterKeyboard(gridEl, {
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    onSelect: applySelection,
    onConfirm: confirmSelection,
  });

  const toolbar = wirePickerToolbar(shell, {
    getIsEnglish: () => isEnglish,
    getFilter: () => filterId,
    setFilter: (id) => {
      filterId = id;
    },
    getQuery: () => query,
    setQuery: (q) => {
      query = q;
    },
    onChange: renderAll,
  });

  confirmBtn?.addEventListener("click", confirmSelection);

  const openPicker = () => {
    selectedId = activeCharacterId;
    paintCopy();
    sceneSection.sync();
    renderAll();
    shell.hidden = false;
    open = true;
    openUiOverlay(document, {
      panel: shell,
      bodyClass: "companion-picker-open",
      panelOpenClass: "is-open",
    });
    shell.querySelector(".companion-picker-close")?.focus?.();
  };

  const finalizePickerHidden = () => {
    shell.hidden = true;
    shell.classList.remove(
      "is-open",
      "ui-overlay-closing",
      "ui-overlay-entering",
    );
    document.body.classList.remove("companion-picker-open");
    opts.onClose?.();
  };

  const close = () => {
    if (!open && !shell.classList.contains("is-open")) return;
    open = false;
    closeUiOverlay(document, {
      panel: shell,
      bodyClass: "companion-picker-open",
      panelOpenClass: "is-open",
      hidePanelOnClose: false,
      onHidden: finalizePickerHidden,
    });
  };

  const onPickerShellClick = (ev) => {
    const target = ev.target;
    if (target instanceof Element && target.closest("[data-picker-close]")) {
      ev.preventDefault();
      ev.stopPropagation();
      close();
    }
  };

  shell.addEventListener("click", onPickerShellClick);
  shell.querySelector(".companion-picker-close")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    close();
  });

  globalThis.addEventListener?.("keydown", (ev) => {
    if (ev.key === "Escape" && open) close();
  });

  return {
    schema: COMPANION_CHARACTER_PICKER_SCHEMA,
    element: shell,
    open: openPicker,
    close,
    setSelected(id) {
      const next = normalizeRosterCharacterId(id);
      activeCharacterId = next;
      if (!open) {
        selectedId = next;
        return;
      }
      if (next === selectedId) return;
      selectedId = next;
      renderAll();
    },
    getActiveCharacterId() {
      return activeCharacterId;
    },
    isOpen() {
      return open;
    },
    getBackgroundId() {
      return sceneSection.getBackgroundId();
    },
    setBackgroundId(backgroundId, syncOpts) {
      sceneSection.setBackgroundId(backgroundId, syncOpts);
    },
    setOnBackgroundChange(handler) {
      sceneSection.setOnBackgroundChange(handler);
    },
    refreshSessionContext(ctx = {}) {
      if (typeof ctx.rosterProvider === "function") {
        rosterProvider = ctx.rosterProvider;
      }
      if (ctx.pickerCopy) {
        sessionCopyOverrides = { ...ctx.pickerCopy };
      }
      copy = mergePickerCopy();
      paintCopy();
      if (ctx.rerenderRoster) {
        renderAll();
      } else {
        updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
      }
    },
    syncFromSession(ctx = {}) {
      const nextId = String(ctx.selectedId ?? activeCharacterId).toLowerCase();
      const nextEnglish = ctx.isEnglish ?? isEnglish;
      const localeChanged = Boolean(nextEnglish) !== isEnglish;
      const idChanged = nextId !== activeCharacterId;
      if (typeof ctx.rosterProvider === "function") {
        rosterProvider = ctx.rosterProvider;
      }
      if (ctx.pickerCopy) {
        sessionCopyOverrides = { ...ctx.pickerCopy };
      }
      activeCharacterId = nextId;
      if (!open || idChanged) selectedId = nextId;
      if (localeChanged) {
        isEnglish = Boolean(nextEnglish);
        langCode = isEnglish ? "en" : "yue";
        shell.setAttribute(
          "aria-label",
          isEnglish ? "Choose companion" : "揀同伴",
        );
        sceneSection.setLocale(isEnglish);
        toolbar.syncLocale?.();
      }
      copy = mergePickerCopy();
      paintCopy();
      if (ctx.backgroundId != null) {
        sceneSection.setBackgroundId(ctx.backgroundId, { notify: false });
      }
      const rerender =
        Boolean(ctx.rerenderRoster) || localeChanged || (open && idChanged);
      if (rerender) {
        renderAll();
      } else if (open) {
        updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
      }
    },
    setLocale(nextEnglish) {
      isEnglish = Boolean(nextEnglish);
      langCode = isEnglish ? "en" : "yue";
      copy = mergePickerCopy();
      shell.setAttribute(
        "aria-label",
        isEnglish ? "Choose companion" : "揀同伴",
      );
      sceneSection.setLocale(isEnglish);
      toolbar.syncLocale?.();
      paintCopy();
      renderAll();
    },
    destroy() {
      unwireFeaturedKeys();
      unwireRosterKeys();
      shell.remove();
    },
  };
}

/**
 * Full-screen character roster before the first chat session.
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   selectedId?: string,
 *   onStart?: (id: string) => void,
 *   onBackgroundChange?: (backgroundId: string) => void,
 *   atmosphereEl?: HTMLElement | null,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} opts
 */
export function createCompanionStartPicker(opts = {}) {
  let isEnglish = Boolean(opts.isEnglish);
  let langCode = isEnglish ? "en" : "yue";
  let selectedId = normalizeRosterCharacterId(opts.selectedId || "nova");
  let rosterProvider =
    typeof opts.rosterProvider === "function" ? opts.rosterProvider : null;
  let starting = false;
  let pickable = true;
  let preloadPct = 0;
  let preloadReady = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let preloadHideTimer = null;
  let unwireRosterKeys = () => {};
  /** @type {(() => void) | null} */
  let unwireRosterScroll = null;
  let sessionCopyOverrides = { ...(opts.pickerCopy || {}) };
  const mergePickerCopy = () => ({
    ...pickerCopy(isEnglish),
    ...sessionCopyOverrides,
  });
  let copy = mergePickerCopy();
  const fullList = () =>
    rosterProvider ? rosterProvider(langCode) : listCompanionCharacters(langCode);

  const shell = document.createElement("div");
  shell.className =
    "companion-picker companion-picker--start companion-picker--v4 companion-picker--showcase companion-picker--stacked-layout companion-picker--aaa-theme hide";
  shell.id = "start-character-picker";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.setAttribute("aria-hidden", "true");
  shell.setAttribute("aria-label", isEnglish ? "Choose companion" : "揀同伴");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" aria-hidden="true"></div>
    <div class="companion-picker-sheet companion-picker-sheet--start">
      <div class="picker-aaa-layers" aria-hidden="true">
        <div class="picker-aaa-bg"></div>
        <div class="picker-aaa-vignette"></div>
      </div>
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
      </header>
      <div class="picker-main picker-main--stacked">
        <section class="picker-showcase-stage" aria-label="${isEnglish ? "Selected companion preview" : "已選同伴預覽"}">
          ${PICKER_HERO_HTML}
        </section>
        <section class="picker-roster-row picker-roster-dock" aria-label="${isEnglish ? "Companion roster" : "同伴名單"}">
          <p class="picker-roster-dock-label"></p>
          <p class="picker-roster-aaa-banner" hidden></p>
          <div class="start-picker-grid-wrap">
            <div class="companion-picker-grid companion-picker-grid--start companion-picker-grid--roster" role="listbox"></div>
          </div>
          <p class="start-picker-scroll-hint" hidden></p>
        </section>
        <div class="picker-background-row">
          ${PICKER_SCENE_SECTION_HTML}
        </div>
      </div>
      <footer class="picker-footer">
        <div class="picker-footer-preload-slot" aria-hidden="false">
          <div class="start-picker-preload is-loading" aria-live="polite">
            <div class="start-picker-preload-row">
              ${START_PICKER_PRELOAD_RING_HTML}
              ${START_PICKER_PRELOAD_BAR_HTML}
            </div>
          </div>
        </div>
        <button type="button" class="picker-confirm-btn picker-begin-btn"></button>
        <p class="companion-picker-foot"></p>
        <p class="companion-picker-foot-build" aria-hidden="true"></p>
      </footer>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);
  applyPickerAaaBackgroundArt(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const footBuildEl = shell.querySelector(".companion-picker-foot-build");
  const preloadSlotEl = shell.querySelector(".picker-footer-preload-slot");
  const preloadEl = shell.querySelector(".start-picker-preload");
  const preloadAnimator = wireLoadingBar(preloadEl);
  const gridWrapEl = shell.querySelector(".start-picker-grid-wrap");
  const scrollHintEl = shell.querySelector(".start-picker-scroll-hint");
  const beginBtn = shell.querySelector(".picker-begin-btn");
  const rosterDockLabelEl = shell.querySelector(".picker-roster-dock-label");
  const rosterAaaBannerEl = shell.querySelector(".picker-roster-aaa-banner");
  const sceneSection = wirePickerSceneSection({
    root: shell,
    isEnglish,
    atmosphereEl: opts.atmosphereEl,
    onBackgroundChange: opts.onBackgroundChange,
    canInteract: () => !starting && pickable,
  });

  const paintCopy = () => {
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) {
      subEl.hidden = false;
      subEl.textContent = isEnglish
        ? `${fullList().length} companions · swipe roster · unique voice & personality`
        : `${fullList().length} 位同伴 · 橫向滑動名單 · 各自語音同性格`;
    }
    if (rosterDockLabelEl) {
      rosterDockLabelEl.textContent = isEnglish
        ? `Roster · ${fullList().length} 3D models`
        : `名單 · 共 ${fullList().length} 個 3D 模型`;
    }
    if (rosterAaaBannerEl) {
      const aaa = fullList().filter((item) => (item.number || 0) >= 5 && (item.number || 0) <= 10);
      const names = aaa.map((item) => item.name).join(isEnglish ? ", " : "、");
      rosterAaaBannerEl.textContent = isEnglish
        ? `Featured AAA · ${names}`
        : `AAA 精選 · ${names}`;
      rosterAaaBannerEl.hidden = aaa.length === 0;
    }
    if (footEl) {
      footEl.textContent = starting
        ? copy.starting
        : !pickable
          ? copy.waiting
          : copy.footStart;
    }
    if (footBuildEl) footBuildEl.textContent = formatPickerFootBuildLine(isEnglish);
    if (beginBtn) {
      beginBtn.textContent = starting ? copy.starting : copy.begin;
      beginBtn.disabled = starting || !pickable;
      beginBtn.setAttribute(
        "aria-label",
        starting ? copy.starting : copy.begin,
      );
    }
  };

  const preloadStatusLabel = (clamped) => {
    if (clamped >= 100) {
      return isEnglish ? "Roster ready" : "同伴名單就緒";
    }
    return isEnglish ? `Loading roster… ${clamped}%` : `載入名單… ${clamped}%`;
  };

  const schedulePreloadHide = () => {
    if (!preloadEl || preloadHideTimer) return;
    preloadHideTimer = globalThis.setTimeout?.(() => {
      preloadHideTimer = null;
      if (!preloadEl?.classList.contains("is-ready")) return;
      preloadEl.classList.add("is-slot-collapsed");
      preloadEl.setAttribute("aria-hidden", "true");
      preloadSlotEl?.setAttribute("aria-hidden", "true");
    }, 1400);
  };

  const syncPreloadChrome = (clamped) => {
    if (!preloadEl) return;
    const ready = clamped >= 100;
    const loading = clamped > 0 && !ready;
    preloadEl.hidden = false;
    preloadEl.classList.toggle("is-ready", ready);
    preloadEl.classList.toggle("is-loading", loading);
    if (loading || !ready) {
      if (preloadHideTimer) {
        globalThis.clearTimeout?.(preloadHideTimer);
        preloadHideTimer = null;
      }
      preloadEl.classList.remove("is-slot-collapsed");
      preloadEl.removeAttribute("aria-hidden");
      preloadSlotEl?.setAttribute("aria-hidden", "false");
    }
    if (ready) schedulePreloadHide();
  };

  const renderPreload = () => {
    const clamped = Math.max(0, Math.min(100, Math.round(preloadPct)));
    preloadAnimator.set(clamped, preloadStatusLabel(clamped));
    if (clamped >= 100) preloadAnimator.flush();
    syncPreloadChrome(clamped);
  };

  const renderScrollHint = () => {
    if (!gridWrapEl || !scrollHintEl || !gridEl) return;
    const vertical = !gridEl.classList.contains("companion-picker-grid--roster");
    const overflow = vertical
      ? gridEl.scrollHeight > gridEl.clientHeight + 8
      : gridEl.scrollWidth > gridEl.clientWidth + 8;
    const atStart = vertical
      ? gridEl.scrollTop <= 8
      : gridEl.scrollLeft <= 8;
    const atEnd = vertical
      ? gridEl.scrollTop + gridEl.clientHeight >= gridEl.scrollHeight - 8
      : gridEl.scrollLeft + gridEl.clientWidth >= gridEl.scrollWidth - 8;
    scrollHintEl.hidden = !overflow || atEnd;
    scrollHintEl.textContent = vertical
      ? isEnglish
        ? `${fullList().length} companions · scroll for more`
        : `${fullList().length} 位同伴 · 向下捲動`
      : copy.rosterHint(fullList().length);
    gridWrapEl.classList.toggle("has-overflow", overflow);
    gridWrapEl.classList.toggle("at-bottom", atEnd);
    gridWrapEl.classList.toggle("at-end", atEnd);
    gridWrapEl.classList.toggle("at-start", atStart);
  };

  const pulseHeroStage = () => {
    const hero = shell.querySelector(".picker-showcase-stage .picker-hero");
    if (!hero) return;
    hero.classList.remove("is-highlight");
    void hero.offsetWidth;
    hero.classList.add("is-highlight");
  };

  const scrollSelectedIntoView = () => {
    if (!gridEl) return;
    const card = gridEl.querySelector(`[data-character-id="${selectedId}"]`);
    if (!(card instanceof HTMLElement)) return;
    const targetLeft =
      card.offsetLeft - (gridEl.clientWidth - card.clientWidth) / 2;
    gridEl.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  };

  /** @type {(id: string) => void} */
  let onStartHandler = (id) => {
    opts.onStart?.(id);
  };

  const beginSession = () => {
    if (!pickable || starting) return;
    onStartHandler(selectedId);
  };

  const applySelection = (id) => {
    if (!pickable || starting) return;
    const next = normalizeRosterCharacterId(id);
    if (next === selectedId) {
      scrollSelectedIntoView();
      return;
    }
    selectedId = next;
    renderAll();
    scrollSelectedIntoView();
    pulseHeroStage();
    opts.onSelectionChange?.(next);
  };

  const focusSelectedCard = () => {
    const card = gridEl?.querySelector(`[data-character-id="${selectedId}"]`);
    if (!(card instanceof HTMLElement)) return;
    if (
      document.activeElement?.closest?.("#start-character-picker .companion-picker-grid") ||
      card.tabIndex === 0
    ) {
      card.focus({ preventScroll: true });
    }
  };

  const renderGrid = () => {
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      roster: fullList(),
      rosterStrip: true,
      isEnglish,
      eagerPreview: true,
      startStrip: true,
      hideRoleStrip: true,
      disabled: starting || !pickable,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    unwireRosterScroll?.();
    unwireRosterScroll = wireScrollAffordances(gridEl, {
      axis: "x",
      labels: isEnglish
        ? { prev: "Previous companions", next: "More companions" }
        : { prev: "上一個同伴", next: "更多同伴" },
    });
    shell.classList.toggle("is-preloading", false);
    updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
    requestAnimationFrame(() => {
      renderScrollHint();
      focusSelectedCard();
    });
  };

  const renderAll = () => {
    renderGrid();
  };

  unwireRosterKeys();
  unwireRosterKeys = wirePickerRosterKeyboard(gridEl, {
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    onSelect: applySelection,
    onConfirm: beginSession,
    disabled: () => starting || !pickable,
  });

  beginBtn?.addEventListener("click", beginSession);
  shell.querySelector(".companion-picker-backdrop")?.addEventListener("click", () => {
    if (!starting && pickable) beginSession();
  });

  paintCopy();
  renderAll();
  renderPreload();
  sceneSection.sync();
  sceneSection.setBackgroundId(sceneSection.getBackgroundId(), { notify: false });
  gridEl?.addEventListener("scroll", renderScrollHint, { passive: true });
  globalThis.addEventListener?.("resize", renderScrollHint);

  return {
    schema: COMPANION_START_PICKER_SCHEMA,
    element: shell,
    setSelected(id) {
      const next = normalizeRosterCharacterId(id);
      if (next === selectedId) {
        scrollSelectedIntoView();
        return;
      }
      selectedId = next;
      if (gridEl?.querySelector?.(".companion-card")) {
        syncPickerGridSelection(gridEl, selectedId);
        updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
        scrollSelectedIntoView();
        return;
      }
      renderAll();
      scrollSelectedIntoView();
    },
    syncFromSession(opts = {}) {
      const nextId = normalizeRosterCharacterId(opts.selectedId ?? selectedId);
      const nextEnglish = opts.isEnglish ?? isEnglish;
      const localeChanged = Boolean(nextEnglish) !== isEnglish;
      const idChanged = nextId !== selectedId;
      if (typeof opts.rosterProvider === "function") {
        rosterProvider = opts.rosterProvider;
      }
      if (opts.pickerCopy) {
        sessionCopyOverrides = { ...opts.pickerCopy };
      }
      if (localeChanged) {
        isEnglish = Boolean(nextEnglish);
        langCode = isEnglish ? "en" : "yue";
        shell.setAttribute(
          "aria-label",
          isEnglish ? "Choose companion" : "揀同伴",
        );
        shell
          .querySelector(".picker-showcase-stage")
          ?.setAttribute(
            "aria-label",
            isEnglish ? "Selected companion preview" : "已選同伴預覽",
          );
        shell
          .querySelector(".picker-roster-row, .picker-roster-dock")
          ?.setAttribute(
            "aria-label",
            isEnglish ? "Companion roster" : "同伴名單",
          );
        sceneSection.setLocale(isEnglish);
      }
      selectedId = nextId;
      copy = mergePickerCopy();
      paintCopy();
      const rerender =
        Boolean(opts.rerenderRoster) || localeChanged || idChanged;
      if (rerender) {
        renderAll();
        renderPreload();
      } else {
        updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
      }
      if (idChanged || opts.scrollIntoView) scrollSelectedIntoView();
    },
    getSelectedId() {
      return selectedId;
    },
    getBackgroundId() {
      return sceneSection.getBackgroundId();
    },
    setBackgroundId(backgroundId, syncOpts) {
      sceneSection.setBackgroundId(backgroundId, syncOpts);
    },
    setOnBackgroundChange(handler) {
      sceneSection.setOnBackgroundChange(handler);
    },
    refreshSessionContext(ctx = {}) {
      if (typeof ctx.rosterProvider === "function") {
        rosterProvider = ctx.rosterProvider;
      }
      if (ctx.pickerCopy) {
        sessionCopyOverrides = { ...ctx.pickerCopy };
      }
      copy = mergePickerCopy();
      paintCopy();
      updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
      if (ctx.rerenderRoster) renderAll();
    },
    setLocale(nextEnglish) {
      isEnglish = Boolean(nextEnglish);
      langCode = isEnglish ? "en" : "yue";
      copy = mergePickerCopy();
      shell.setAttribute(
        "aria-label",
        isEnglish ? "Choose companion" : "揀同伴",
      );
      shell
        .querySelector(".picker-showcase-stage")
        ?.setAttribute(
          "aria-label",
          isEnglish ? "Selected companion preview" : "已選同伴預覽",
        );
      shell
        .querySelector(".picker-roster-row, .picker-roster-dock")
        ?.setAttribute(
          "aria-label",
          isEnglish ? "Companion roster" : "同伴名單",
        );
      sceneSection.setLocale(isEnglish);
      paintCopy();
      renderAll();
      renderPreload();
    },
    setPreloadProgress(pct, label) {
      const n = Number(pct);
      preloadPct =
        Number.isFinite(n) && n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n) || 0;
      preloadPct = Math.max(0, Math.min(100, preloadPct));
      const ready = preloadPct >= 100;
      if (ready !== preloadReady) {
        preloadReady = ready;
        paintCopy();
      }
      preloadAnimator.set(
        preloadPct,
        label || preloadStatusLabel(preloadPct),
      );
      syncPreloadChrome(preloadPct);
      if (ready) preloadAnimator.flush();
    },
    enablePicking(on = true) {
      const next = Boolean(on);
      if (next === pickable) return;
      pickable = next;
      renderAll();
      paintCopy();
    },
    setStarting(on) {
      starting = Boolean(on);
      shell.classList.toggle("is-starting", starting);
      shell.setAttribute("aria-busy", starting ? "true" : "false");
      renderAll();
      paintCopy();
    },
    isOpen() {
      return shell.isConnected && shell.classList.contains("is-open");
    },
    show() {
      const mount = opts.root || document.body;
      if (!shell.isConnected && mount) mount.appendChild(shell);
      shell.classList.remove("hide");
      shell.classList.add("is-open");
      shell.removeAttribute("aria-hidden");
      shell.hidden = false;
      document.body.classList.add("companion-start-pending", "companion-start-picker-open");
      notifyCompanionMenuOverlayOpened();
      scrollSelectedIntoView();
      requestAnimationFrame(renderScrollHint);
    },
    hide(opts = {}) {
      starting = false;
      shell.classList.remove("is-starting", "is-open");
      shell.classList.add("hide");
      shell.setAttribute("aria-hidden", "true");
      shell.hidden = true;
      shell.removeAttribute("aria-busy");
      if (opts.markDismissed !== false) {
        markStartPickerDismissed(globalThis.__amojiStart);
      }
      clearStartPickerBodyLocks();
    },
    setOnStart(handler) {
      if (typeof handler === "function") {
        onStartHandler = handler;
      }
    },
    close() {
      this.hide();
    },
    dismiss() {
      this.hide();
    },
    destroy() {
      if (preloadHideTimer) globalThis.clearTimeout?.(preloadHideTimer);
      preloadHideTimer = null;
      preloadAnimator.destroy();
      unwireRosterKeys();
      document.body.classList.remove(
        "companion-start-pending",
        "companion-start-picker-open",
        "companion-picker-open",
      );
      shell.remove();
    },
  };
}

/**
 * Lightweight loading overlay while a new companion model downloads.
 * @param {{ root?: HTMLElement | null }} [opts]
 */
export function createCompanionSwitchOverlay(opts = {}) {
  const root = opts.root || document.body;
  const el = document.createElement("div");
  el.className = "companion-switch-overlay";
  el.hidden = true;
  el.innerHTML = `
    <div class="companion-switch-card companion-gacha-card">
      <div class="companion-gacha-rays" aria-hidden="true"></div>
      <div class="companion-gacha-portrait-wrap" aria-hidden="true">
        <img class="companion-gacha-portrait" alt="" />
      </div>
      <div class="companion-switch-ring" style="--pct:0">
        <span class="companion-switch-pct">0%</span>
      </div>
      <p class="companion-gacha-name"></p>
      <p class="companion-switch-label">Loading…</p>
    </div>
  `;
  root.appendChild(el);

  const card = el.querySelector(".companion-switch-card");
  const ring = el.querySelector(".companion-switch-ring");
  const pctEl = el.querySelector(".companion-switch-pct");
  const labelEl = el.querySelector(".companion-switch-label");
  const nameEl = el.querySelector(".companion-gacha-name");
  const portraitEl = el.querySelector(".companion-gacha-portrait");

  return {
    element: el,
    show(label = "Loading…", character = null) {
      el.hidden = false;
      el.classList.remove("is-gacha-ready");
      if (labelEl) labelEl.textContent = label;
      if (ring) ring.style.setProperty("--pct", "0");
      if (pctEl) pctEl.textContent = "0%";
      if (character && portraitEl && nameEl && card) {
        wireCompanionPreviewFallback(portraitEl);
        portraitEl.src = String(character.previewImage || "");
        portraitEl.alt = String(character.name || "");
        nameEl.textContent = String(character.name || "");
        card.style.setProperty("--card-accent", character.accent || "#7fd4cf");
        el.classList.add("is-gacha-active");
      } else {
        if (portraitEl) portraitEl.removeAttribute("src");
        if (nameEl) nameEl.textContent = "";
        el.classList.remove("is-gacha-active");
      }
    },
    update(pct, label) {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (ring) ring.style.setProperty("--pct", String(clamped));
      if (pctEl) pctEl.textContent = `${clamped}%`;
      if (label && labelEl) labelEl.textContent = label;
      if (clamped >= 100) el.classList.add("is-gacha-ready");
    },
    celebrate() {
      el.classList.add("is-gacha-ready");
      card?.classList.add("gacha-reveal-burst");
      globalThis.setTimeout?.(() => card?.classList.remove("gacha-reveal-burst"), 900);
    },
    hide() {
      el.classList.remove("is-gacha-active", "is-gacha-ready");
      card?.classList.remove("gacha-reveal-burst");
      el.hidden = true;
    },
    destroy() {
      el.remove();
    },
  };
}
