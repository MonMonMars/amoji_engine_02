/**
 * Progress dock + centered overlay for downloads, avatar load, and other waits.
 */
export const COMPANION_PROGRESS_OVERLAY_SCHEMA =
  "amoji.companionProgressOverlay.v2";

/**
 * @param {number | null | undefined} value 0..1 or 0..100
 * @returns {number}
 */
export function clampProgressPct(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** SVG ring radius in viewBox units (36×36). */
export const PROGRESS_RING_RADIUS = 15.5;
export const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RING_RADIUS;

/**
 * @param {number} pct 0..100
 * @param {number} [circumference]
 */
export function progressRingOffset(pct, circumference = PROGRESS_RING_CIRCUMFERENCE) {
  const clamped = Math.max(0, Math.min(100, pct));
  return circumference * (1 - clamped / 100);
}

/**
 * Shared ring paint for dock + center loaders.
 * @param {{
 *   fillEl: SVGCircleElement | null,
 *   pctEl?: HTMLElement | null,
 *   ringEl?: HTMLElement | null,
 *   hostEl?: HTMLElement | null,
 * }} parts
 */
function applyProgressRingState(parts, ctx = {}) {
  const indeterminate = Boolean(ctx.indeterminate);
  const pct = clampProgressPct(ctx.progress);
  if (parts.pctEl) {
    parts.pctEl.textContent = indeterminate ? "" : `${pct}%`;
  }
  if (parts.fillEl) {
    parts.fillEl.style.strokeDashoffset = indeterminate
      ? ""
      : String(progressRingOffset(pct));
  }
  parts.ringEl?.classList.toggle("is-indeterminate", indeterminate);
  const hint = [ctx.phase, ctx.label].filter(Boolean).join(" — ");
  if (parts.hostEl) {
    parts.hostEl.title = hint;
    parts.hostEl.setAttribute(
      "aria-label",
      hint || (indeterminate ? "Loading" : `Loading ${pct}%`),
    );
    parts.hostEl.setAttribute("aria-valuemin", "0");
    parts.hostEl.setAttribute("aria-valuemax", "100");
    parts.hostEl.setAttribute(
      "aria-valuenow",
      indeterminate ? "0" : String(pct),
    );
  }
}

/**
 * Center-screen load ring — no card, border, or portrait (3D model loads in background).
 * @param {{ root?: HTMLElement | null }} [opts]
 */
export function createCompanionCenterLoadRing(opts = {}) {
  const root = opts.root || document.body;
  const el = document.createElement("div");
  el.className = "companion-center-load-ring";
  el.hidden = true;
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <svg class="companion-center-load-ring-svg" viewBox="0 0 36 36" aria-hidden="true">
      <circle class="companion-center-load-ring-track" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
      <circle class="companion-center-load-ring-fill" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
    </svg>
  `;
  root.appendChild(el);

  const ringEl = el;
  const fillEl = el.querySelector(".companion-center-load-ring-fill");
  if (fillEl) {
    fillEl.setAttribute("stroke-dasharray", String(PROGRESS_RING_CIRCUMFERENCE));
    fillEl.setAttribute("stroke-dashoffset", String(PROGRESS_RING_CIRCUMFERENCE));
  }

  const paint = (ctx = {}) => {
    applyProgressRingState(
      { fillEl, ringEl, hostEl: el },
      ctx,
    );
  };

  return {
    schema: COMPANION_PROGRESS_OVERLAY_SCHEMA,
    element: el,
    show(ctx = {}) {
      el.hidden = false;
      el.classList.add("is-visible");
      paint(ctx);
    },
    update(ctx = {}) {
      if (el.hidden) this.show(ctx);
      else paint(ctx);
    },
    hide() {
      el.classList.remove("is-visible", "is-indeterminate");
      el.hidden = true;
    },
    isVisible() {
      return !el.hidden;
    },
    destroy() {
      el.remove();
    },
  };
}

/**
 * Bottom progress dock — visible during motion download, avatar load, thinking, etc.
 * @param {{ root?: HTMLElement | null }} [opts]
 */
export function createCompanionProgressDock(opts = {}) {
  const root = opts.root || document.body;
  const el = document.createElement("div");
  el.className = "companion-progress-dock";
  el.hidden = true;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <div class="companion-progress-dock-inner">
      <div class="companion-progress-ring">
        <svg class="companion-progress-ring-svg" viewBox="0 0 36 36" aria-hidden="true">
          <circle class="companion-progress-ring-track" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
          <circle class="companion-progress-ring-fill" cx="18" cy="18" r="${PROGRESS_RING_RADIUS}" />
        </svg>
        <span class="companion-progress-pct">0%</span>
      </div>
    </div>
  `;
  root.appendChild(el);

  const innerEl = el.querySelector(".companion-progress-dock-inner");
  const ringEl = el.querySelector(".companion-progress-ring");
  const pctEl = el.querySelector(".companion-progress-pct");
  const fillEl = el.querySelector(".companion-progress-ring-fill");
  let indeterminate = false;

  if (fillEl) {
    fillEl.setAttribute("stroke-dasharray", String(PROGRESS_RING_CIRCUMFERENCE));
    fillEl.setAttribute("stroke-dashoffset", String(PROGRESS_RING_CIRCUMFERENCE));
  }

  const apply = ({
    progress = 0,
    label = "",
    phase = "",
    indeterminate: indet = false,
  } = {}) => {
    indeterminate = Boolean(indet);
    const pct = clampProgressPct(progress);
    applyProgressRingState(
      { fillEl, pctEl, ringEl, hostEl: el },
      { progress: pct, label, phase, indeterminate },
    );
    if (innerEl) innerEl.title = [phase, label].filter(Boolean).join(" — ");
    el.dataset.pct = indeterminate ? "" : String(pct);
  };

  return {
    schema: COMPANION_PROGRESS_OVERLAY_SCHEMA,
    element: el,
    show(ctx = {}) {
      el.hidden = false;
      el.classList.add("is-visible");
      apply(ctx);
    },
    update(ctx = {}) {
      if (el.hidden) this.show(ctx);
      else apply(ctx);
    },
    hide() {
      el.classList.remove("is-visible");
      el.hidden = true;
      indeterminate = false;
    },
    isVisible() {
      return !el.hidden;
    },
    destroy() {
      el.remove();
    },
  };
}

/**
 * Human label for a learn/download phase.
 * @param {string} phase
 * @param {boolean} [isEnglish]
 */
export function progressPhaseLabel(phase, isEnglish = false) {
  const map = isEnglish
    ? {
        connecting: "Connecting",
        waking: "Waking",
        searching: "Searching",
        assembling: "Assembling",
        downloading: "Downloading",
        warming: "Warming up",
        learning: "Learning",
        installing: "Installing",
        settling: "Settling",
        almost: "Almost",
        ready: "Ready",
        failed: "Failed",
        thinking: "Thinking",
        "avatar-load": "Loading avatar",
        "character-switch": "Switching",
        "motion-pack": "Motion library",
      }
    : {
        connecting: "連線中",
        waking: "醒緊",
        searching: "搜尋中",
        assembling: "組合中",
        downloading: "下載中",
        warming: "熱身中",
        learning: "學習中",
        installing: "安裝中",
        settling: "定定",
        almost: "就快",
        ready: "完成",
        failed: "失敗",
        thinking: "思考中",
        "avatar-load": "載入角色",
        "character-switch": "切換同伴",
        "motion-pack": "動作庫",
      };
  return map[phase] || (isEnglish ? "Loading" : "載入中");
}
