/**
 * Shared loading UI — smooth progress animation + professional bar markup.
 */
import {
  PROGRESS_RING_CIRCUMFERENCE,
  PROGRESS_RING_RADIUS,
  progressRingOffset,
} from "./companionProgressOverlay.js";

export const COMPANION_LOADING_UI_SCHEMA = "amoji.companionLoadingUi.v1";

export const LOADING_BAR_HTML = `
  <div class="amoji-load-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <div class="amoji-load-bar__track">
      <div class="amoji-load-bar__fill"></div>
      <div class="amoji-load-bar__shine" aria-hidden="true"></div>
    </div>
    <div class="amoji-load-bar__meta">
      <span class="amoji-load-bar__pct">0%</span>
      <span class="amoji-load-bar__label"></span>
    </div>
  </div>
`.trim();

export const LOADING_RING_HTML = `
  <div class="amoji-load-ring companion-progress-ring" aria-hidden="true">
    <svg class="companion-progress-ring-svg" viewBox="0 0 36 36">
      <circle class="companion-progress-ring-track" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
      <circle class="companion-progress-ring-fill" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
    </svg>
    <span class="amoji-load-ring__pct">0%</span>
  </div>
`.trim();

/**
 * @param {number | null | undefined} value
 * @returns {number}
 */
export function clampLoadingPct(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Smoothly animates displayed progress toward target (never stuck at 0%).
 * @param {(pct: number, label?: string) => void} paint
 * @param {{
 *   minVisibleMs?: number,
 *   creepPerFrame?: number,
 *   lerp?: number,
 * }} [opts]
 */
export function createSmoothProgressAnimator(paint, opts = {}) {
  const minVisibleMs = opts.minVisibleMs ?? 480;
  const creepPerFrame = opts.creepPerFrame ?? 0.35;
  const lerp = opts.lerp ?? 0.14;
  let target = 0;
  let display = 0;
  let label = "";
  let startedAt = 0;
  /** @type {number | null} */
  let raf = null;

  const apply = () => {
    paint(Math.round(display), label);
  };

  const tick = (now) => {
    if (!startedAt) startedAt = now;
    const elapsed = now - startedAt;
    if (display < target) {
      const step = Math.max(0.8, (target - display) * lerp);
      display = Math.min(target, display + step);
    } else if (target < 100 && display < 99 && elapsed > minVisibleMs) {
      display = Math.min(99, display + creepPerFrame);
    }
    apply();
    const creepWindow = minVisibleMs + 4200;
    if (display < target) {
      raf = globalThis.requestAnimationFrame?.(tick) ?? null;
    } else if (target < 100 && display < 99 && elapsed <= creepWindow) {
      raf = globalThis.requestAnimationFrame?.(tick) ?? null;
    } else {
      raf = null;
    }
  };

  const schedule = () => {
    if (raf != null) return;
    raf = globalThis.requestAnimationFrame?.(tick) ?? null;
    if (raf == null) apply();
  };

  return {
    set(pct, nextLabel) {
      target = clampLoadingPct(pct);
      if (nextLabel != null) label = String(nextLabel);
      if (target > display && display === 0 && target > 0) {
        display = Math.min(4, target * 0.08);
      }
      schedule();
    },
    flush() {
      display = target;
      if (raf != null) {
        globalThis.cancelAnimationFrame?.(raf);
        raf = null;
      }
      apply();
    },
    destroy() {
      if (raf != null) globalThis.cancelAnimationFrame?.(raf);
      raf = null;
    },
  };
}

/**
 * Wire ring + bar nodes under `root` to a smooth animator.
 * @param {ParentNode | null | undefined} root
 * @param {{ onUpdate?: (pct: number) => void }} [opts]
 */
export function wireLoadingBar(root, opts = {}) {
  if (!root) {
    return {
      set: () => {},
      flush: () => {},
      destroy: () => {},
    };
  }

  const bar = root.querySelector?.(".amoji-load-bar");
  const fill = root.querySelector?.(".amoji-load-bar__fill");
  const pctEl =
    root.querySelector?.(".amoji-load-bar__pct") ||
    root.querySelector?.(".start-picker-preload-pct");
  const labelEl =
    root.querySelector?.(".amoji-load-bar__label") ||
    root.querySelector?.(".start-picker-preload-label");
  const track = root.querySelector?.(".start-picker-preload-track");
  const legacyFill = root.querySelector?.(".start-picker-preload-fill");
  const ringFill = root.querySelector?.(".companion-progress-ring-fill");
  const ring = root.querySelector?.(".companion-progress-ring");

  const paint = (pct, label) => {
    const clamped = clampLoadingPct(pct);
    const activeFill = fill || legacyFill;
    if (activeFill) activeFill.style.width = `${clamped}%`;
    if (track) track.setAttribute("aria-valuenow", String(clamped));
    if (bar) bar.setAttribute("aria-valuenow", String(clamped));
    if (pctEl) pctEl.textContent = `${clamped}%`;
    if (labelEl && label) labelEl.textContent = label;
    if (ringFill) {
      ringFill.setAttribute("stroke-dasharray", String(PROGRESS_RING_CIRCUMFERENCE));
      ringFill.style.strokeDashoffset = String(progressRingOffset(clamped));
    }
    ring?.classList.toggle("is-indeterminate", clamped <= 0);
    root.classList?.toggle?.("is-loading", clamped > 0 && clamped < 100);
    root.classList?.toggle?.("is-ready", clamped >= 100);
    opts.onUpdate?.(clamped);
  };

  const animator = createSmoothProgressAnimator(paint);
  return animator;
}
