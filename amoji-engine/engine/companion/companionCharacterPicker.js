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
    if (!gridEl) return;
    gridEl.innerHTML = "";
    const list = listCompanionCharacters(langCode);
    for (const item of list) {
      gridEl.appendChild(
        createCompanionCardButton(item, {
          selectedId,
          compact: true,
          onClick: (id) => {
            if (id === selectedId) {
              close();
              return;
            }
            selectedId = id;
            renderGrid();
            opts.onSelect?.(id);
          },
        }),
      );
    }
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
 * Compact character grid shown before the first chat session starts.
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   selectedId?: string,
 *   onStart?: (id: string) => void,
 * }} opts
 */
export function createCompanionStartPicker(opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const langCode = isEnglish ? "en" : "yue";
  let selectedId = opts.selectedId || "amoji";
  let starting = false;

  const shell = document.createElement("div");
  shell.className = "start-character-picker";
  shell.id = "start-character-picker";
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-label", isEnglish ? "Choose companion" : "揀同伴");
  shell.innerHTML = `
    <p class="start-picker-title"></p>
    <p class="start-picker-sub"></p>
    <div class="start-picker-grid" role="listbox"></div>
    <p class="start-picker-hint"></p>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const titleEl = shell.querySelector(".start-picker-title");
  const subEl = shell.querySelector(".start-picker-sub");
  const gridEl = shell.querySelector(".start-picker-grid");
  const hintEl = shell.querySelector(".start-picker-hint");

  const copy = () => {
    if (titleEl) {
      titleEl.textContent = isEnglish
        ? "Pick your companion"
        : "揀同伴開始";
    }
    if (subEl) {
      subEl.textContent = isEnglish
        ? "Tap a character to start chatting"
        : "點選角色開始傾偈";
    }
    if (hintEl) {
      hintEl.textContent = isEnglish
        ? "Voice + mic unlock on first tap"
        : "第一次點選會開啟語音同麥克風";
    }
  };

  const renderGrid = () => {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    const list = listCompanionCharacters(langCode);
    for (const item of list) {
      gridEl.appendChild(
        createCompanionCardButton(item, {
          selectedId,
          compact: true,
          onClick: (id) => {
            if (starting) return;
            selectedId = id;
            renderGrid();
            opts.onStart?.(id);
          },
        }),
      );
    }
  };

  copy();
  renderGrid();

  return {
    schema: COMPANION_START_PICKER_SCHEMA,
    element: shell,
    setSelected(id) {
      selectedId = id;
      renderGrid();
    },
    setStarting(on) {
      starting = Boolean(on);
      shell.classList.toggle("is-starting", starting);
      shell.setAttribute("aria-busy", starting ? "true" : "false");
      if (hintEl) {
        hintEl.textContent = starting
          ? isEnglish
            ? "Starting…"
            : "開始中…"
          : isEnglish
            ? "Voice + mic unlock on first tap"
            : "第一次點選會開啟語音同麥克風";
      }
    },
    show() {
      shell.classList.remove("hide");
      shell.removeAttribute("aria-hidden");
      shell.removeAttribute("hidden");
    },
    hide() {
      shell.classList.add("hide");
      shell.setAttribute("aria-hidden", "true");
    },
    dismiss() {
      starting = false;
      shell.classList.remove("is-starting");
      shell.remove();
    },
    destroy() {
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
