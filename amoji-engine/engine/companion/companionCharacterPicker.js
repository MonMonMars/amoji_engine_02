/**
 * Grok Ani–style companion picker — grid sheet + compact start-screen grid.
 */
import { listCompanionCharacters } from "./companionCharacterCatalog.js";

export const COMPANION_CHARACTER_PICKER_SCHEMA =
  "amoji.companionCharacterPicker.v2";

export const COMPANION_START_PICKER_SCHEMA = "amoji.companionStartPicker.v1";

/**
 * @param {ReturnType<typeof listCompanionCharacters>[number]} item
 * @param {{ selectedId?: string, compact?: boolean }} [ctx]
 */
export function companionCardInnerHtml(item, ctx = {}) {
  const compact = Boolean(ctx.compact);
  const selected = item.id === ctx.selectedId;
  const badge = item.badge
    ? `<span class="companion-card-badge${compact ? " companion-card-badge--mini" : ""}">${item.badge}</span>`
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
        <img src="${item.previewImage}" alt="" loading="lazy" decoding="async" />
        ${badge}
        <span class="companion-card-check" aria-hidden="true">✓</span>
      </div>
      <span class="companion-card-name">${item.name}</span>
      ${voiceChip}
    `;
  }

  return `
    <div class="companion-card-portrait">
      <img src="${item.previewImage}" alt="" loading="lazy" decoding="async" />
      ${badge}
      <span class="companion-card-check" aria-hidden="true">✓</span>
    </div>
    <div class="companion-card-body">
      <h3 class="companion-card-name">${item.name}</h3>
      <p class="companion-card-tagline">${item.tagline}</p>
      <div class="companion-card-traits">${traits}${voiceChip}</div>
    </div>
  `;
}

/**
 * @param {HTMLElement | null} gridEl
 * @param {"yue" | "en"} langCode
 * @param {{
 *   selectedId?: string,
 *   compact?: boolean,
 *   disabled?: boolean,
 *   onCardClick?: (id: string) => void,
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
 *   onClick?: (id: string) => void,
 * }} ctx
 */
export function createCompanionCardButton(item, ctx = {}) {
  const compact = Boolean(ctx.compact);
  const card = document.createElement("button");
  card.type = "button";
  card.className = compact
    ? "companion-card companion-card--compact"
    : "companion-card";
  card.dataset.characterId = item.id;
  card.setAttribute("role", "option");
  card.setAttribute(
    "aria-selected",
    item.id === ctx.selectedId ? "true" : "false",
  );
  if (item.id === ctx.selectedId) card.classList.add("is-selected");
  card.style.setProperty("--card-accent", item.accent || "#7fd4cf");
  card.innerHTML = companionCardInnerHtml(item, ctx);
  card.addEventListener("click", () => ctx.onClick?.(item.id));
  return card;
}

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   selectedId?: string,
 *   onSelect?: (id: string) => void,
 *   onClose?: () => void,
 * }} opts
 */
export function createCompanionCharacterPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  let selectedId = opts.selectedId || "amoji";
  let open = false;

  const shell = document.createElement("div");
  shell.className = "companion-picker";
  shell.hidden = true;
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" data-picker-close></div>
    <div class="companion-picker-sheet">
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
        <button type="button" class="companion-picker-close" data-picker-close aria-label="Close">✕</button>
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
      footEl.textContent = isEnglish
        ? "Tap a card to switch companion."
        : "點選角色即可切換同伴。";
    }
  };

  const renderGrid = () => {
    renderCompanionPickerGrid(gridEl, langCode, {
      selectedId,
      compact: true,
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
    shell.classList.add("is-open");
    open = true;
    document.body.classList.add("companion-picker-open");
    shell.querySelector(".companion-picker-close")?.focus?.();
  };

  const close = () => {
    shell.classList.remove("is-open");
    shell.hidden = true;
    open = false;
    document.body.classList.remove("companion-picker-open");
    opts.onClose?.();
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
 * }} opts
 */
export function createCompanionStartPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  let selectedId = opts.selectedId || "amoji";
  let starting = false;
  let preloadPct = 0;

  const shell = document.createElement("div");
  shell.className = "companion-picker companion-picker--start is-open";
  shell.id = "start-character-picker";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
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
        <div class="start-picker-preload-track" aria-hidden="true">
          <div class="start-picker-preload-fill"></div>
        </div>
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
  document.body.classList.add("companion-start-pending", "companion-picker-open");

  const titleEl = shell.querySelector(".companion-picker-title");
  const subEl = shell.querySelector(".companion-picker-sub");
  const gridEl = shell.querySelector(".companion-picker-grid");
  const footEl = shell.querySelector(".companion-picker-foot");
  const preloadEl = shell.querySelector(".start-picker-preload");
  const preloadFill = shell.querySelector(".start-picker-preload-fill");
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
        : isEnglish
          ? "Tap a card to start — voice and mic unlock when you pick someone"
          : "點選角色開始 — 揀好就會開啟語音同麥克風";
    }
  };

  const renderPreload = () => {
    const clamped = Math.max(0, Math.min(100, Math.round(preloadPct)));
    if (preloadFill) preloadFill.style.width = `${clamped}%`;
    if (preloadLabel) {
      preloadLabel.textContent =
        clamped >= 100
          ? isEnglish
            ? "Companions ready — pick one"
            : "同伴已準備好 — 請揀一位"
          : isEnglish
            ? `Loading companions… ${clamped}%`
            : `載入同伴中… ${clamped}%`;
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
      disabled: starting,
      onCardClick: (id) => {
        selectedId = id;
        renderGrid();
        opts.onStart?.(id);
      },
    });
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
      renderPreload();
    },
    setStarting(on) {
      starting = Boolean(on);
      shell.classList.toggle("is-starting", starting);
      shell.setAttribute("aria-busy", starting ? "true" : "false");
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
    <div class="companion-switch-card">
      <div class="companion-switch-ring" style="--pct:0">
        <span class="companion-switch-pct">0%</span>
      </div>
      <div class="companion-switch-bar" aria-hidden="true">
        <div class="companion-switch-bar-fill"></div>
      </div>
      <p class="companion-switch-label">Loading…</p>
    </div>
  `;
  root.appendChild(el);

  const ring = el.querySelector(".companion-switch-ring");
  const pctEl = el.querySelector(".companion-switch-pct");
  const labelEl = el.querySelector(".companion-switch-label");
  const barFill = el.querySelector(".companion-switch-bar-fill");

  return {
    show(label = "Loading…") {
      el.hidden = false;
      if (labelEl) labelEl.textContent = label;
      if (ring) ring.style.setProperty("--pct", "0");
      if (pctEl) pctEl.textContent = "0%";
      if (barFill) barFill.style.width = "0%";
    },
    update(pct, label) {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (ring) ring.style.setProperty("--pct", String(clamped));
      if (pctEl) pctEl.textContent = `${clamped}%`;
      if (barFill) barFill.style.width = `${clamped}%`;
      if (label && labelEl) labelEl.textContent = label;
    },
    hide() {
      el.hidden = true;
    },
    destroy() {
      el.remove();
    },
  };
}
