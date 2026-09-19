/**
 * Gacha / visual-novel companion picker — hero preview, filters, confirm CTA.
 */
import {
  characterNumber,
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";
import {
  companionPreviewImgOnErrorAttr,
  wireCompanionPreviewFallback,
} from "./companionPreviewFallback.js";
import {
  filterPickerCharacters,
  listPickerFeatured,
  pickerCopy,
  pickerFilterButtonsHtml,
  PICKER_FEATURED_ROW_HTML,
  PICKER_HERO_HTML,
  PICKER_TOOLBAR_HTML,
  syncPickerCardTabIndex,
  updatePickerHero,
  wirePickerRosterKeyboard,
} from "./companionPickerChrome.js";
import {
  LOADING_BAR_HTML,
  LOADING_RING_HTML,
  wireLoadingBar,
} from "./companionLoadingUi.js";
import { closeUiOverlay, openUiOverlay } from "./companionUiEffects.js";

export const COMPANION_CHARACTER_PICKER_SCHEMA =
  "amoji.companionCharacterPicker.v4";

export const COMPANION_START_PICKER_SCHEMA = "amoji.companionStartPicker.v3";

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
  const roleBadge = item.roleBadge
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
  const voiceChip = item.voiceLabel
    ? `<span class="companion-card-voice">${item.voiceLabel}</span>`
    : "";

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
}

/**
 * @param {HTMLElement | null} rowEl
 * @param {"yue" | "en"} langCode
 * @param {{
 *   selectedId?: string,
 *   disabled?: boolean,
 *   eagerPreview?: boolean,
 *   roster?: ReturnType<typeof listCompanionCharacters>,
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
      (ctx.rosterStrip ? " companion-card--roster" : "")
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
  const labels = pickerCopy(opts.isEnglish);

  if (search) {
    search.placeholder = labels.searchPlaceholder;
    search.value = opts.getQuery();
    search.oninput = () => {
      opts.setQuery(search.value);
      opts.onChange();
    };
  }

  const paintFilters = () => {
    if (!filtersEl) return;
    filtersEl.innerHTML = pickerFilterButtonsHtml(opts.isEnglish, opts.getFilter());
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
 * }} opts
 */
export function createCompanionCharacterPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  /** Live session character — updated by setSelected after hot-swap. */
  let activeCharacterId = opts.selectedId || "nova";
  let selectedId = activeCharacterId;
  const roleRoster =
    typeof opts.rosterProvider === "function" ? opts.rosterProvider : null;
  let filterId = "all";
  let query = "";
  let open = false;
  let unwireFeaturedKeys = () => {};
  let unwireRosterKeys = () => {};
  const copy = { ...pickerCopy(isEnglish), ...(opts.pickerCopy || {}) };
  const fullList = () =>
    roleRoster ? roleRoster(langCode) : listCompanionCharacters(langCode);

  const shell = document.createElement("div");
  shell.className = "companion-picker companion-picker--v4";
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
        </section>
      </div>
      <div class="picker-session-actions">
        <button type="button" class="picker-confirm-btn picker-switch-btn"></button>
        <p class="companion-picker-foot"></p>
      </div>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const confirmBtn = shell.querySelector(".picker-switch-btn");
  const featuredWrap = shell.querySelector(".picker-featured-wrap");
  const featuredLabel = shell.querySelector(".picker-featured-label");
  const featuredRow = shell.querySelector(".picker-featured-row");

  const paintCopy = () => {
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) subEl.textContent = copy.sub;
    if (footEl) footEl.textContent = copy.footSession;
    if (confirmBtn) confirmBtn.textContent = copy.switch;
    if (featuredLabel) featuredLabel.textContent = copy.featuredLabel;
  };

  const applySelection = (id) => {
    selectedId = id;
    renderAll();
  };

  const renderFeatured = () => {
    renderPickerFeaturedRow(featuredRow, langCode, {
      selectedId,
      roster: listPickerFeatured(fullList()),
      eagerPreview: true,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    if (featuredWrap) {
      featuredWrap.hidden = !featuredRow?.childElementCount;
    }
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
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
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

  wirePickerToolbar(shell, {
    isEnglish,
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

  const close = () => {
    open = false;
    closeUiOverlay(document, {
      panel: shell,
      bodyClass: "companion-picker-open",
      panelOpenClass: "is-open",
      hidePanelOnClose: false,
      onHidden: () => {
        shell.hidden = true;
        opts.onClose?.();
      },
    });
  };

  shell.addEventListener("click", (ev) => {
    const target = ev.target;
    if (target instanceof Element && target.closest("[data-picker-close]")) {
      close();
    }
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
      activeCharacterId = id;
      selectedId = id;
      renderAll();
    },
    getActiveCharacterId() {
      return activeCharacterId;
    },
    isOpen() {
      return open;
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
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} opts
 */
export function createCompanionStartPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  let selectedId = opts.selectedId || "nova";
  const roleRoster =
    typeof opts.rosterProvider === "function" ? opts.rosterProvider : null;
  let filterId = "all";
  let query = "";
  let starting = false;
  let pickable = true;
  let preloadPct = 0;
  let preloadReady = false;
  let unwireFeaturedKeys = () => {};
  let unwireRosterKeys = () => {};
  const copy = { ...pickerCopy(isEnglish), ...(opts.pickerCopy || {}) };
  const fullList = () =>
    roleRoster ? roleRoster(langCode) : listCompanionCharacters(langCode);

  const shell = document.createElement("div");
  shell.className = "companion-picker companion-picker--start companion-picker--v4 hide";
  shell.id = "start-character-picker";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.setAttribute("aria-hidden", "true");
  shell.setAttribute("aria-label", isEnglish ? "Choose companion" : "揀同伴");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" aria-hidden="true"></div>
    <div class="companion-picker-sheet companion-picker-sheet--start">
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
      </header>
      <div class="picker-main">
        <aside class="picker-hero-panel" aria-label="${isEnglish ? "Selected companion preview" : "已選同伴預覽"}">
          ${PICKER_HERO_HTML}
        </aside>
        <section class="picker-roster-panel" aria-label="${isEnglish ? "Companion roster" : "同伴名單"}">
          ${PICKER_TOOLBAR_HTML}
          ${PICKER_FEATURED_ROW_HTML}
          <div class="start-picker-grid-wrap">
            <div class="companion-picker-grid companion-picker-grid--start" role="listbox"></div>
            <p class="start-picker-scroll-hint" hidden></p>
          </div>
        </section>
      </div>
      <footer class="picker-footer">
        <div class="start-picker-preload is-loading" aria-live="polite">
          <div class="start-picker-preload-row">
            ${START_PICKER_PRELOAD_RING_HTML}
            ${START_PICKER_PRELOAD_BAR_HTML}
          </div>
        </div>
        <button type="button" class="picker-confirm-btn picker-begin-btn"></button>
        <p class="companion-picker-foot"></p>
      </footer>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const preloadEl = shell.querySelector(".start-picker-preload");
  const preloadAnimator = wireLoadingBar(preloadEl);
  const gridWrapEl = shell.querySelector(".start-picker-grid-wrap");
  const scrollHintEl = shell.querySelector(".start-picker-scroll-hint");
  const beginBtn = shell.querySelector(".picker-begin-btn");
  const featuredWrap = shell.querySelector(".picker-featured-wrap");
  const featuredLabel = shell.querySelector(".picker-featured-label");
  const featuredRow = shell.querySelector(".picker-featured-row");

  const paintCopy = () => {
    if (titleEl) titleEl.textContent = copy.title;
    if (subEl) subEl.textContent = copy.sub;
    if (footEl) {
      footEl.textContent = starting
        ? copy.starting
        : !pickable
          ? copy.waiting
          : copy.footStart;
    }
    if (beginBtn) {
      beginBtn.textContent = starting ? copy.starting : copy.begin;
      beginBtn.disabled = starting || !pickable;
      beginBtn.setAttribute(
        "aria-label",
        starting ? copy.starting : copy.begin,
      );
    }
    if (featuredLabel) featuredLabel.textContent = copy.featuredLabel;
  };

  const preloadStatusLabel = (clamped) => {
    if (clamped >= 100) {
      return isEnglish ? "Roster ready" : "同伴名單就緒";
    }
    return isEnglish ? `Loading roster… ${clamped}%` : `載入名單… ${clamped}%`;
  };

  const renderPreload = () => {
    const clamped = Math.max(0, Math.min(100, Math.round(preloadPct)));
    preloadAnimator.set(clamped, preloadStatusLabel(clamped));
    if (clamped >= 100) preloadAnimator.flush();
    if (preloadEl) {
      preloadEl.hidden = false;
      preloadEl.classList.toggle("is-ready", clamped >= 100);
      preloadEl.classList.toggle("is-loading", clamped > 0 && clamped < 100);
    }
  };

  const renderScrollHint = () => {
    if (!gridWrapEl || !scrollHintEl || !gridEl) return;
    const vertical = !gridEl.classList.contains("companion-picker-grid--roster");
    const overflow = vertical
      ? gridEl.scrollHeight > gridEl.clientHeight + 8
      : gridEl.scrollWidth > gridEl.clientWidth + 8;
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
  };

  const scrollSelectedIntoView = () => {
    const sel = `[data-character-id="${selectedId}"]`;
    const card = featuredRow?.querySelector(sel) || gridEl?.querySelector(sel);
    card?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const beginSession = () => {
    if (!pickable || starting) return;
    opts.onStart?.(selectedId);
  };

  const applySelection = (id) => {
    if (!pickable || starting) return;
    selectedId = id;
    renderAll();
    scrollSelectedIntoView();
    opts.onSelectionChange?.(id);
  };

  const renderFeatured = () => {
    renderPickerFeaturedRow(featuredRow, langCode, {
      selectedId,
      roster: listPickerFeatured(fullList()),
      eagerPreview: true,
      disabled: starting || !pickable,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    if (featuredWrap) {
      featuredWrap.hidden = !featuredRow?.childElementCount;
    }
  };

  const renderGrid = () => {
    const filtered = filterPickerCharacters(fullList(), {
      filter: filterId,
      query,
    });
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      roster: filtered,
      rosterStrip: false,
      isEnglish,
      eagerPreview: false,
      disabled: starting || !pickable,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: applySelection,
    });
    shell.classList.toggle("is-preloading", false);
    updatePickerHero(shell, findPickerItem(fullList(), selectedId), isEnglish);
    requestAnimationFrame(renderScrollHint);
  };

  const renderAll = () => {
    renderFeatured();
    renderGrid();
  };

  unwireFeaturedKeys();
  unwireFeaturedKeys = wirePickerRosterKeyboard(featuredRow, {
    getSelectedId: () => selectedId,
    setSelectedId: (id) => {
      selectedId = id;
    },
    onSelect: applySelection,
    onConfirm: beginSession,
    disabled: () => starting || !pickable,
  });
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

  wirePickerToolbar(shell, {
    isEnglish,
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

  beginBtn?.addEventListener("click", beginSession);

  paintCopy();
  renderAll();
  renderPreload();
  gridEl?.addEventListener("scroll", renderScrollHint, { passive: true });
  globalThis.addEventListener?.("resize", renderScrollHint);

  return {
    schema: COMPANION_START_PICKER_SCHEMA,
    element: shell,
    setSelected(id) {
      selectedId = id;
      renderAll();
      scrollSelectedIntoView();
    },
    getSelectedId() {
      return selectedId;
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
      if (preloadEl) {
        preloadEl.hidden = false;
        preloadEl.classList.toggle("is-ready", ready);
        preloadEl.classList.toggle("is-loading", preloadPct > 0 && !ready);
      }
      if (ready) preloadAnimator.flush();
    },
    enablePicking(on = true) {
      pickable = Boolean(on);
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
    show() {
      shell.classList.remove("hide");
      shell.classList.add("is-open");
      shell.removeAttribute("aria-hidden");
      shell.removeAttribute("hidden");
      document.body.classList.add("companion-start-pending", "companion-picker-open");
      scrollSelectedIntoView();
    },
    hide() {
      shell.classList.remove("is-open");
      shell.classList.add("hide");
      shell.setAttribute("aria-hidden", "true");
    },
    dismiss() {
      starting = false;
      shell.classList.remove("is-starting", "is-open");
      document.body.classList.remove("companion-start-pending", "companion-picker-open");
      shell.remove();
    },
    destroy() {
      preloadAnimator.destroy();
      unwireFeaturedKeys();
      unwireRosterKeys();
      document.body.classList.remove("companion-start-pending", "companion-picker-open");
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
