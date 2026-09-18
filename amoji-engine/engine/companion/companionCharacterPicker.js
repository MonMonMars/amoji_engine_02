/**
 * Grok Ani–style companion picker — grid sheet + compact start-screen grid.
 */
import {
  characterNumber,
  highPolyFacePickerHint,
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";
import {
  PROGRESS_RING_CIRCUMFERENCE,
  PROGRESS_RING_RADIUS,
  progressRingOffset,
} from "./companionProgressOverlay.js";
import { closeUiOverlay, openUiOverlay } from "./companionUiEffects.js";

export const COMPANION_CHARACTER_PICKER_SCHEMA =
  "amoji.companionCharacterPicker.v3";

export const COMPANION_START_PICKER_SCHEMA = "amoji.companionStartPicker.v2";

export const START_PICKER_PRELOAD_RING_HTML = `
  <div class="start-picker-preload-ring companion-progress-ring" aria-hidden="true">
    <svg class="companion-progress-ring-svg" viewBox="0 0 36 36">
      <circle class="companion-progress-ring-track" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
      <circle class="companion-progress-ring-fill" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
    </svg>
    <span class="start-picker-preload-pct">0%</span>
  </div>
`.trim();

/**
 * @param {ReturnType<typeof listCompanionCharacters>[number]} item
 * @param {{ selectedId?: string, compact?: boolean, eagerPreview?: boolean }} [ctx]
 */
export function companionCardInnerHtml(item, ctx = {}) {
  const compact = Boolean(ctx.compact);
  const eagerPreview = Boolean(ctx.eagerPreview);
  const imgAttrs = eagerPreview
    ? 'loading="eager" fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';
  const number = cardNumber(item);
  const numberBadge = number
    ? `<span class="companion-card-number" aria-hidden="true">${number}</span>`
    : "";
  const labeledName = number ? `${number} ${item.name}` : item.name;
  const badge = item.badge
    ? `<span class="companion-card-badge${compact ? " companion-card-badge--mini" : ""}">${item.badge}</span>`
    : "";
  const faceChip =
    item.showFaceChip && item.faceLabel
      ? `<span class="companion-card-face${compact ? " companion-card-face--mini" : ""}">${item.faceLabel}</span>`
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
 *   onCardClick?: (id: string) => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} ctx
 */
export function renderCompanionPickerGrid(gridEl, langCode, ctx = {}) {
  if (!gridEl) return;
  const compact = ctx.compact !== false;
  gridEl.innerHTML = "";
  const list = listCompanionCharacters(langCode);
  for (const item of list) {
    gridEl.appendChild(
      createCompanionCardButton(item, {
        selectedId: ctx.selectedId,
        compact,
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
}

/**
 * @param {ReturnType<typeof listCompanionCharacters>[number]} item
 * @param {{
 *   selectedId?: string,
 *   compact?: boolean,
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
    ? "companion-card companion-card--compact"
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
  card.style.setProperty("--card-accent", item.accent || "#7fd4cf");
  card.innerHTML = companionCardInnerHtml(item, ctx);
  card.addEventListener("click", () => {
    ctx.onCardTapFx?.(card, item);
    ctx.onClick?.(item.id);
  });
  return card;
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
  let selectedId = opts.selectedId || "nova";
  let open = false;

  const shell = document.createElement("div");
  shell.className = "companion-picker";
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
      <div class="companion-picker-grid" role="listbox"></div>
      <p class="companion-picker-foot"></p>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");

  const copy = () => {
    if (titleEl) {
      titleEl.textContent = isEnglish ? "Companions" : "同伴";
    }
    if (subEl) {
      subEl.textContent = isEnglish
        ? "Pick who you want to chat with."
        : "揀你想同邊個傾偈。";
    }
    if (footEl) {
      footEl.textContent = `${isEnglish ? "Tap a card to switch companion." : "點選角色即可切換同伴。"} ${highPolyFacePickerHint(langCode)}`;
    }
  };

  const renderGrid = () => {
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      compact: true,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: (id) => {
        if (id === selectedId) {
          close();
          return;
        }
        selectedId = id;
        renderGrid();
        opts.onSelect?.(id);
      },
    });
  };

  const openPicker = () => {
    copy();
    renderGrid();
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
      selectedId = id;
      renderGrid();
    },
    isOpen() {
      return open;
    },
    destroy() {
      shell.remove();
    },
  };
}

/**
 * Full-screen character grid shown before the first chat session starts.
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   selectedId?: string,
 *   fullPage?: boolean,
 *   onStart?: (id: string) => void,
 *   onCardTapFx?: (card: HTMLButtonElement, item: ReturnType<typeof listCompanionCharacters>[number]) => void,
 * }} opts
 */
export function createCompanionStartPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  let selectedId = opts.selectedId || "nova";
  let starting = false;
  let pickable = true;
  let preloadPct = 0;
  let preloadReady = false;

  const shell = document.createElement("div");
  shell.className = "companion-picker companion-picker--start hide";
  shell.id = "start-character-picker";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.setAttribute("aria-hidden", "true");
  shell.setAttribute("aria-label", isEnglish ? "Choose companion" : "揀同伴");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" aria-hidden="true"></div>
    <div class="companion-picker-sheet">
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
      </header>
      <div class="start-picker-preload" aria-live="polite">
        ${START_PICKER_PRELOAD_RING_HTML}
        <p class="start-picker-preload-label"></p>
      </div>
      <div class="start-picker-grid-wrap">
        <div class="companion-picker-grid companion-picker-grid--start" role="listbox"></div>
        <p class="start-picker-scroll-hint" hidden></p>
      </div>
      <p class="companion-picker-foot"></p>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const preloadEl = shell.querySelector(".start-picker-preload");
  const preloadFill = shell.querySelector(".companion-progress-ring-fill");
  const preloadPctEl = shell.querySelector(".start-picker-preload-pct");
  const preloadLabel = shell.querySelector(".start-picker-preload-label");
  const gridWrapEl = shell.querySelector(".start-picker-grid-wrap");
  const scrollHintEl = shell.querySelector(".start-picker-scroll-hint");

  const copy = () => {
    if (titleEl) {
      titleEl.textContent = isEnglish ? "Companions" : "同伴";
    }
    if (subEl) {
      subEl.textContent = isEnglish
        ? "Pick who you want to chat with."
        : "揀你想同邊個傾偈。";
    }
    if (footEl) {
      footEl.textContent = starting
        ? isEnglish
          ? "Starting…"
          : "開始中…"
        : !pickable
          ? isEnglish
            ? "Almost ready — pick a companion in a moment"
            : "快好喇 — 等陣就可以揀同伴"
          : isEnglish
            ? `★ picks are gallery pretty-girl models — tap to start, 3D loads in background. ${highPolyFacePickerHint(langCode)}`
            : `★ 推介係你揀嘅靚女模型 — 點選就可以傾偈，3D 背景載入。${highPolyFacePickerHint(langCode)}`;
    }
  };

  const renderPreload = () => {
    const clamped = Math.max(0, Math.min(100, Math.round(preloadPct)));
    if (preloadFill) {
      preloadFill.setAttribute("stroke-dasharray", String(PROGRESS_RING_CIRCUMFERENCE));
      preloadFill.style.strokeDashoffset = String(progressRingOffset(clamped));
    }
    if (preloadPctEl) preloadPctEl.textContent = `${clamped}%`;
    if (preloadLabel) {
      preloadLabel.textContent =
        clamped >= 100
          ? isEnglish
            ? "All companions cached"
            : "全部同伴已快取"
          : isEnglish
            ? `Background loading… ${clamped}%`
            : `背景載入中… ${clamped}%`;
    }
    if (preloadEl) {
      preloadEl.classList.toggle("is-ready", clamped >= 100);
    }
  };

  const renderScrollHint = () => {
    if (!gridWrapEl || !scrollHintEl || !gridEl) return;
    const overflow = gridEl.scrollHeight > gridEl.clientHeight + 8;
    const atBottom =
      gridEl.scrollTop + gridEl.clientHeight >= gridEl.scrollHeight - 8;
    scrollHintEl.hidden = !overflow || atBottom;
    scrollHintEl.textContent = isEnglish
      ? `Scroll for more companions (${listCompanionCharacters(langCode).length} total)`
      : `向下滑查看更多同伴（共 ${listCompanionCharacters(langCode).length} 位）`;
    gridWrapEl.classList.toggle("has-overflow", overflow);
    gridWrapEl.classList.toggle("at-bottom", atBottom);
  };

  const renderGrid = () => {
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      compact: true,
      eagerPreview: true,
      disabled: starting || !pickable,
      onCardTapFx: opts.onCardTapFx,
      onCardClick: (id) => {
        if (!pickable || starting) return;
        selectedId = id;
        renderGrid();
        opts.onStart?.(id);
      },
    });
    shell.classList.toggle("is-preloading", preloadPct < 100 && !starting);
    requestAnimationFrame(renderScrollHint);
  };

  copy();
  renderGrid();
  renderPreload();
  gridEl?.addEventListener("scroll", renderScrollHint, { passive: true });
  globalThis.addEventListener?.("resize", renderScrollHint);

  return {
    schema: COMPANION_START_PICKER_SCHEMA,
    element: shell,
    setSelected(id) {
      selectedId = id;
      renderGrid();
    },
    setPreloadProgress(pct, label) {
      preloadPct = Number(pct) || 0;
      if (label && preloadLabel) preloadLabel.textContent = label;
      const ready = preloadPct >= 100;
      if (ready !== preloadReady) {
        preloadReady = ready;
        copy();
      }
      renderPreload();
    },
    enablePicking(on = true) {
      pickable = Boolean(on);
      renderGrid();
      copy();
    },
    setStarting(on) {
      starting = Boolean(on);
      shell.classList.toggle("is-starting", starting);
      shell.setAttribute("aria-busy", starting ? "true" : "false");
      renderGrid();
      copy();
    },
    show() {
      shell.classList.remove("hide");
      shell.classList.add("is-open");
      shell.removeAttribute("aria-hidden");
      shell.removeAttribute("hidden");
      document.body.classList.add("companion-start-pending", "companion-picker-open");
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
