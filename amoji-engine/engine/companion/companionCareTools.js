/**
 * One draggable toggle for pet-care / raising UI — stage stays clean until tapped.
 * Snack opens the treat sheet; talk/walk run raising actions then collapse.
 */
import { ACTIVITY_COMMANDS, activityCommandLabel } from "./companionRaisingUi.js";

export const COMPANION_CARE_TOOLS_SCHEMA = "amoji.companionCareTools.v2";
export const CARE_TOOLS_POS_STORAGE_KEY = "amoji.careToolsPos.v1";

const DRAG_THRESHOLD_PX = 7;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clampCareToolsCoord(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} vw
 * @param {number} vh
 * @param {number} stackW
 * @param {number} stackH
 * @param {number} [margin]
 */
export function clampCareToolsPosition(
  x,
  y,
  vw,
  vh,
  stackW,
  stackH,
  margin = 8,
) {
  return {
    x: clampCareToolsCoord(x, margin, Math.max(margin, vw - stackW - margin)),
    y: clampCareToolsCoord(y, margin, Math.max(margin, vh - stackH - margin)),
  };
}

/**
 * @param {Storage | null | undefined} storage
 */
export function loadCareToolsPosition(storage) {
  try {
    const raw = storage?.getItem?.(CARE_TOOLS_POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.x) || !Number.isFinite(parsed?.y)) return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

/**
 * @param {Storage | null | undefined} storage
 * @param {{ x: number, y: number }} pos
 */
export function saveCareToolsPosition(storage, pos) {
  try {
    storage?.setItem?.(
      CARE_TOOLS_POS_STORAGE_KEY,
      JSON.stringify({ x: Math.round(pos.x), y: Math.round(pos.y) }),
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {number} vw
 * @param {number} vh
 * @param {number} [stackW]
 * @param {number} [stackH]
 */
export function defaultCareToolsPosition(vw, vh, stackW = 44, stackH = 44) {
  const margin = 12;
  return clampCareToolsPosition(
    vw - stackW - margin,
    vh - stackH - margin - 104,
    vw,
    vh,
    stackW,
    stackH,
    margin,
  );
}

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean | (() => boolean),
 *   onActivity?: (kind: string) => void,
 *   onOpenChange?: (open: boolean) => void,
 *   storage?: Storage,
 * }} [opts]
 */
export function createCompanionCareTools(opts = {}) {
  const root = opts.root || document.body;
  const storage = opts.storage ?? globalThis.localStorage;
  const english = () =>
    typeof opts.isEnglish === "function"
      ? Boolean(opts.isEnglish())
      : Boolean(opts.isEnglish);

  let open = false;
  let hungry = false;
  let lonely = false;
  let suppressToggleClick = false;

  const stack = document.createElement("div");
  stack.className = "care-tools-stack";
  stack.id = "care-tools-stack";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "care-tools-toggle";
  toggle.id = "care-tools-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-haspopup", "true");

  const menu = document.createElement("div");
  menu.className = "care-tools-menu";
  menu.id = "care-tools-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");

  stack.appendChild(menu);
  stack.appendChild(toggle);

  const paintToggle = () => {
    const en = english();
    toggle.setAttribute(
      "aria-label",
      en
        ? open
          ? "Hide care tools"
          : "Care — drag to move · tap for snack, talk, walk"
        : open
          ? "收起照顧工具"
          : "照顧 — 拖曳移動 · 點一下開小食、傾偈、散步",
    );
    toggle.innerHTML = `<span class="care-tools-toggle__icon" aria-hidden="true">${hungry ? "🍽️" : "💗"}</span>`;
    toggle.classList.toggle("is-hungry", hungry);
    toggle.classList.toggle("is-lonely", lonely && !hungry);
  };

  const paintMenu = () => {
    menu.replaceChildren(
      ...ACTIVITY_COMMANDS.map((cmd) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "care-tools-menu__btn";
        btn.dataset.activity = cmd.kind;
        btn.setAttribute("role", "menuitem");
        btn.setAttribute("aria-label", activityCommandLabel(cmd, english()));
        btn.innerHTML = `<span class="care-tools-menu__icon" aria-hidden="true">${cmd.icon}</span>`;
        btn.addEventListener("click", () => {
          opts.onActivity?.(cmd.kind);
          if (cmd.kind === "snack") openPanel(false);
          else close();
        });
        return btn;
      }),
    );
  };

  let menuVisible = false;

  const applyBodyState = () => {
    document.body.classList.toggle("companion-care-collapsed", !open);
    document.body.classList.toggle("companion-care-open", open);
    menu.hidden = !menuVisible;
    toggle.setAttribute("aria-expanded", menuVisible ? "true" : "false");
    toggle.classList.toggle("is-open", menuVisible);
    stack.classList.toggle("is-open", menuVisible);
    paintToggle();
  };

  const hideMenu = () => {
    menuVisible = false;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
    stack.classList.remove("is-open");
  };

  const showMenu = () => {
    menuVisible = true;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("is-open");
    stack.classList.add("is-open");
  };

  const openPanel = (withMenu = true) => {
    const wasOpen = open;
    open = true;
    menuVisible = withMenu;
    applyBodyState();
    if (!wasOpen) opts.onOpenChange?.(true);
  };

  const close = () => {
    if (!open) return;
    open = false;
    menuVisible = false;
    applyBodyState();
    opts.onOpenChange?.(false);
  };

  const togglePanel = () => {
    if (!open) openPanel(true);
    else if (menuVisible) close();
    else showMenu();
  };

  toggle.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (suppressToggleClick) {
      suppressToggleClick = false;
      return;
    }
    togglePanel();
  });

  document.addEventListener("click", (ev) => {
    if (!open) return;
    if (stack.contains(ev.target)) return;
    if (menuVisible) {
      hideMenu();
      applyBodyState();
    } else close();
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || !open) return;
    if (menuVisible) {
      hideMenu();
      applyBodyState();
    } else close();
  });

  let dragActive = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  const applyStackPosition = (pos) => {
    stack.style.left = `${pos.x}px`;
    stack.style.top = `${pos.y}px`;
  };

  const measureAndClamp = (x, y) => {
    const rect = stack.getBoundingClientRect();
    const w = rect.width || toggle.offsetWidth || 44;
    const h = rect.height || toggle.offsetHeight || 44;
    return clampCareToolsPosition(
      x,
      y,
      globalThis.innerWidth || 360,
      globalThis.innerHeight || 640,
      w,
      h,
    );
  };

  const placeStack = () => {
    const saved = loadCareToolsPosition(storage);
    const rect = stack.getBoundingClientRect();
    const w = rect.width || 44;
    const h = rect.height || 44;
    const pos =
      saved ||
      defaultCareToolsPosition(
        globalThis.innerWidth || 360,
        globalThis.innerHeight || 640,
        w,
        h,
      );
    applyStackPosition(measureAndClamp(pos.x, pos.y));
  };

  toggle.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    dragActive = true;
    dragMoved = false;
    dragStartX = ev.clientX;
    dragStartY = ev.clientY;
    const rect = stack.getBoundingClientRect();
    dragOriginX = rect.left;
    dragOriginY = rect.top;
    toggle.setPointerCapture?.(ev.pointerId);
  });

  toggle.addEventListener("pointermove", (ev) => {
    if (!dragActive) return;
    const dx = ev.clientX - dragStartX;
    const dy = ev.clientY - dragStartY;
    if (!dragMoved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    dragMoved = true;
    stack.classList.add("is-dragging");
    const next = measureAndClamp(dragOriginX + dx, dragOriginY + dy);
    applyStackPosition(next);
  });

  const finishDrag = (ev) => {
    if (!dragActive) return;
    dragActive = false;
    stack.classList.remove("is-dragging");
    toggle.releasePointerCapture?.(ev.pointerId);
    if (dragMoved) {
      const rect = stack.getBoundingClientRect();
      saveCareToolsPosition(storage, { x: rect.left, y: rect.top });
      suppressToggleClick = true;
      ev.preventDefault();
    }
  };

  toggle.addEventListener("pointerup", finishDrag);
  toggle.addEventListener("pointercancel", finishDrag);

  globalThis.addEventListener?.("resize", () => {
    const rect = stack.getBoundingClientRect();
    applyStackPosition(measureAndClamp(rect.left, rect.top));
  });

  root.appendChild(stack);
  paintMenu();
  applyBodyState();
  requestAnimationFrame(() => placeStack());

  return {
    schema: COMPANION_CARE_TOOLS_SCHEMA,
    stack,
    toggle,
    menu,
    open: openPanel,
    close,
    hideMenu,
    togglePanel,
    isOpen: () => open,
    isMenuVisible: () => menuVisible,
    setNeedsHint: ({ hungry: h, lonely: l } = {}) => {
      hungry = Boolean(h);
      lonely = Boolean(l);
      paintToggle();
    },
    refreshLabels: () => {
      paintMenu();
      paintToggle();
    },
    placeStack,
    dispose: () => {
      close();
      stack.remove();
      document.body.classList.remove("companion-care-collapsed", "companion-care-open");
    },
  };
}
