/**
 * Grok Ani–style companion picker — grid sheet to browse and select characters.
 */
import { listCompanionCharacters } from "./companionCharacterCatalog.js";

export const COMPANION_CHARACTER_PICKER_SCHEMA =
  "amoji.companionCharacterPicker.v1";

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
        ? "Pick who you want to chat with — like Grok Ani."
        : "揀你想同邊個傾偈 — 類似 Grok Ani 同伴列表。";
    }
    if (footEl) {
      footEl.textContent = isEnglish
        ? "Tap a card to switch. Your companion keeps voice + personality per character."
        : "點選角色即可切換。每個同伴有獨立語音同性格。";
    }
  };

  const renderGrid = () => {
    if (!gridEl) return;
    gridEl.innerHTML = "";
    const list = listCompanionCharacters(langCode);
    for (const item of list) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "companion-card";
      card.dataset.characterId = item.id;
      card.setAttribute("role", "option");
      card.setAttribute(
        "aria-selected",
        item.id === selectedId ? "true" : "false",
      );
      if (item.id === selectedId) card.classList.add("is-selected");
      card.style.setProperty("--card-accent", item.accent || "#7fd4cf");

      const badge = item.badge
        ? `<span class="companion-card-badge">${item.badge}</span>`
        : "";
      const traits = (item.traits || [])
        .slice(0, 3)
        .map((t) => `<span class="companion-card-trait">${t}</span>`)
        .join("");

      card.innerHTML = `
        <div class="companion-card-portrait">
          <img src="${item.previewImage}" alt="" loading="lazy" decoding="async" />
          ${badge}
          <span class="companion-card-check" aria-hidden="true">✓</span>
        </div>
        <div class="companion-card-body">
          <h3 class="companion-card-name">${item.name}</h3>
          <p class="companion-card-tagline">${item.tagline}</p>
          <div class="companion-card-traits">${traits}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        if (item.id === selectedId) {
          close();
          return;
        }
        selectedId = item.id;
        renderGrid();
        opts.onSelect?.(item.id);
      });

      gridEl.appendChild(card);
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
      <p class="companion-switch-label">Loading…</p>
    </div>
  `;
  root.appendChild(el);

  const ring = el.querySelector(".companion-switch-ring");
  const pctEl = el.querySelector(".companion-switch-pct");
  const labelEl = el.querySelector(".companion-switch-label");

  return {
    show(label = "Loading…") {
      el.hidden = false;
      if (labelEl) labelEl.textContent = label;
      if (ring) ring.style.setProperty("--pct", "0");
      if (pctEl) pctEl.textContent = "0%";
    },
    update(pct, label) {
      const clamped = Math.max(0, Math.min(100, Math.round(pct)));
      if (ring) ring.style.setProperty("--pct", String(clamped));
      if (pctEl) pctEl.textContent = `${clamped}%`;
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
