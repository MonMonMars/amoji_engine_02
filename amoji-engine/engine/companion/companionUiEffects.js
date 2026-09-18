/**
 * Button special effects + overlay/tab page transitions for companion UIs.
 */
import { spawnUiParticles } from "./companionUiParticles.js";

export const COMPANION_UI_EFFECTS_SCHEMA = "amoji.companionUiEffects.v2";

export const UI_OVERLAY_OPEN_MS = 420;
export const UI_OVERLAY_CLOSE_MS = 380;
export const UI_TAB_SWITCH_MS = 280;

/** Interactive targets that receive ripple / press FX (mic keeps its own FX). */
export const UI_FX_BUTTON_SELECTOR = [
  "button:not([disabled]):not(.mic-btn)",
  "a.btn-secondary",
  ".companion-card",
  ".companion-chip",
  ".treat-card:not(.is-broke)",
  ".care-tools-toggle",
  ".care-tools-menu__btn",
  ".treat-tab",
  ".treat-sheet-close",
].join(", ");

/**
 * @param {Document} [doc]
 */
export function prefersReducedUiMotion(doc = document) {
  return (
    doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
    false
  );
}

/**
 * @param {Element} el
 * @param {number} clientX
 * @param {number} clientY
 * @param {Document} [doc]
 */
function viewOf(doc) {
  return doc.defaultView ?? globalThis;
}

function scheduleFrame(doc, fn) {
  const raf = viewOf(doc).requestAnimationFrame;
  if (typeof raf === "function") {
    raf(fn);
    return;
  }
  fn();
}

/**
 * @typedef {{
 *   play?: (id: string) => boolean,
 *   haptic?: (kind?: string) => boolean,
 * }} CompanionUiAudioLike
 */

/** @type {CompanionUiAudioLike | null} */
let uiAudio = null;

/**
 * @param {CompanionUiAudioLike | null | undefined} audio
 */
export function bindCompanionUiAudio(audio) {
  uiAudio = audio || null;
}

export function spawnUiRipple(el, clientX, clientY, doc = document) {
  if (
    !el ||
    typeof el.getBoundingClientRect !== "function" ||
    el.closest?.("[data-ui-fx-off]")
  ) {
    return null;
  }

  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height, 28) * 2.2;
  const ripple = doc.createElement("span");
  ripple.className = "ui-fx-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${clientX - rect.left - size / 2}px`;
  ripple.style.top = `${clientY - rect.top - size / 2}px`;

  el.classList.add("ui-fx-has-ripple");
  el.appendChild(ripple);
  uiAudio?.play?.("tap");
  uiAudio?.haptic?.("light");
  spawnUiParticles({
    x: clientX,
    y: clientY,
    hue: 212,
    count: 8,
    spread: Math.max(rect.width, 28) * 0.45,
  });
  ripple.addEventListener(
    "animationend",
    () => {
      ripple.remove();
      if (!el.querySelector(".ui-fx-ripple")) {
        el.classList.remove("ui-fx-has-ripple");
      }
    },
    { once: true },
  );
  return ripple;
}

/**
 * @param {ParentNode} root
 * @param {Document} [doc]
 */
export function markUiFxButtons(root, doc = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll(UI_FX_BUTTON_SELECTOR).forEach((el) => {
    if (el.closest("[data-ui-fx-off]")) return;
    el.classList.add("ui-fx-btn");
  });
}

/**
 * @param {Document} [doc]
 * @param {{ reducedMotion?: boolean, audio?: CompanionUiAudioLike | null }} [opts]
 */
export function initCompanionUiEffects(doc = document, opts = {}) {
  const reduced = opts.reducedMotion ?? prefersReducedUiMotion(doc);
  if (opts.audio) bindCompanionUiAudio(opts.audio);
  if (reduced) {
    opts.audio?.setReducedMotion?.(true);
    return {
      schema: COMPANION_UI_EFFECTS_SCHEMA,
      destroy: () => {},
    };
  }

  doc.body.classList.add("ui-fx-enabled");
  markUiFxButtons(doc.body, doc);

  /** @param {PointerEvent} ev */
  const onPointerDown = (ev) => {
    const target = ev.target?.closest?.(UI_FX_BUTTON_SELECTOR);
    if (!target || target.disabled) return;
    if (target.closest("[data-ui-fx-off]")) return;

    spawnUiRipple(target, ev.clientX, ev.clientY, doc);
    target.classList.add("ui-fx-pressed");

    const clearPress = () => {
      target.classList.remove("ui-fx-pressed");
    };
    doc.addEventListener("pointerup", clearPress, { once: true });
    doc.addEventListener("pointercancel", clearPress, { once: true });
  };

  doc.addEventListener("pointerdown", onPointerDown, { passive: true });

  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      rec.addedNodes.forEach((node) => {
        if (node && typeof node.querySelectorAll === "function") {
          markUiFxButtons(node, doc);
        }
      });
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true });

  return {
    schema: COMPANION_UI_EFFECTS_SCHEMA,
    destroy() {
      doc.body.classList.remove("ui-fx-enabled");
      doc.removeEventListener("pointerdown", onPointerDown);
      observer.disconnect();
    },
  };
}

/**
 * @param {Document} doc
 * @param {{
 *   panel: HTMLElement | null,
 *   backdrop?: HTMLElement | null,
 *   bodyClass?: string,
 *   panelOpenClass?: string,
 *   backdropOpenClass?: string,
 * }} cfg
 */
export function openUiOverlay(doc, cfg) {
  const {
    panel,
    backdrop = null,
    bodyClass = "",
    panelOpenClass = "open",
    backdropOpenClass = "is-open",
  } = cfg;
  if (!panel) return;

  panel.removeAttribute("hidden");
  backdrop?.removeAttribute("hidden");
  panel.classList.remove("ui-overlay-closing");
  panel.classList.add("ui-overlay-entering");
  if (bodyClass) doc.body.classList.add(bodyClass);
  doc.body.classList.add("ui-page-entering");
  uiAudio?.play?.("sheet-open");
  uiAudio?.haptic?.("light");

  scheduleFrame(doc, () => {
    scheduleFrame(doc, () => {
      backdrop?.classList.add(backdropOpenClass);
      panel.classList.add(panelOpenClass);
      panel.classList.remove("ui-overlay-entering");
      doc.body.classList.remove("ui-page-entering");
      doc.body.classList.add("ui-page-open");
    });
  });
}

/**
 * @param {Document} doc
 * @param {{
 *   panel: HTMLElement | null,
 *   backdrop?: HTMLElement | null,
 *   bodyClass?: string,
 *   panelOpenClass?: string,
 *   backdropOpenClass?: string,
 *   hideDelay?: number,
 *   hidePanelOnClose?: boolean,
 *   onHidden?: () => void,
 * }} cfg
 */
export function closeUiOverlay(doc, cfg) {
  const {
    panel,
    backdrop = null,
    bodyClass = "",
    panelOpenClass = "open",
    backdropOpenClass = "is-open",
    hideDelay = UI_OVERLAY_CLOSE_MS,
    hidePanelOnClose = true,
    onHidden,
  } = cfg;
  if (!panel) return;

  panel.classList.add("ui-overlay-closing");
  panel.classList.remove(panelOpenClass);
  backdrop?.classList.remove(backdropOpenClass);
  if (bodyClass) doc.body.classList.remove(bodyClass);
  doc.body.classList.remove("ui-page-open");
  doc.body.classList.add("ui-page-leaving");
  uiAudio?.play?.("sheet-close");
  uiAudio?.haptic?.("light");

  viewOf(doc).setTimeout(() => {
    if (panel.classList.contains(panelOpenClass)) return;
    panel.classList.remove("ui-overlay-closing");
    if (hidePanelOnClose) panel.setAttribute("hidden", "");
    backdrop?.setAttribute("hidden", "");
    doc.body.classList.remove("ui-page-leaving");
    onHidden?.();
  }, hideDelay);
}

/**
 * Animated tab panel swap (secretary lite).
 * @param {Document} doc
 * @param {{
 *   panels: Record<string, HTMLElement | null | undefined>,
 *   tabs: HTMLElement[],
 *   nextId: string,
 *   durationMs?: number,
 * }} cfg
 */
export function switchUiTabPanel(doc, cfg) {
  const { panels, tabs, nextId, durationMs = UI_TAB_SWITCH_MS } = cfg;
  const nextPanel = panels[nextId];
  if (!nextPanel) return nextId;

  for (const tab of tabs) {
    tab.classList.toggle("active", tab.dataset.tab === nextId);
  }

  if (prefersReducedUiMotion(doc)) {
    for (const [id, panel] of Object.entries(panels)) {
      panel?.classList.toggle("hidden", id !== nextId);
    }
    return nextId;
  }

  let currentId = null;
  for (const [id, panel] of Object.entries(panels)) {
    if (panel && !panel.classList.contains("hidden")) currentId = id;
  }
  if (currentId === nextId) return nextId;

  const currentPanel = currentId ? panels[currentId] : null;

  const revealNext = () => {
    nextPanel.classList.remove("hidden", "ui-tab-leaving");
    nextPanel.classList.add("ui-tab-entering");
    scheduleFrame(doc, () => {
      scheduleFrame(doc, () => {
        nextPanel.classList.remove("ui-tab-entering");
        nextPanel.classList.add("ui-tab-active");
      });
    });
    viewOf(doc).setTimeout(() => {
      nextPanel.classList.remove("ui-tab-active");
    }, durationMs);
  };

  if (currentPanel && currentPanel !== nextPanel) {
    currentPanel.classList.add("ui-tab-leaving");
    currentPanel.classList.remove("ui-tab-active");
    viewOf(doc).setTimeout(() => {
      currentPanel.classList.add("hidden");
      currentPanel.classList.remove("ui-tab-leaving");
      revealNext();
    }, Math.round(durationMs * 0.85));
  } else {
    revealNext();
  }

  return nextId;
}
