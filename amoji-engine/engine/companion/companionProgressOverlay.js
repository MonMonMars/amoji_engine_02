/**
 * Progress dock + centered overlay for downloads, avatar load, and other waits.
 */
export const COMPANION_PROGRESS_OVERLAY_SCHEMA =
  "amoji.companionProgressOverlay.v1";

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
    if (pctEl) pctEl.textContent = indeterminate ? "…" : `${pct}%`;
    if (fillEl) {
      fillEl.style.strokeDashoffset = indeterminate
        ? ""
        : String(progressRingOffset(pct));
    }
    ringEl?.classList.toggle("is-indeterminate", indeterminate);
    const hint = [phase, label].filter(Boolean).join(" — ");
    if (innerEl) innerEl.title = hint;
    el.setAttribute(
      "aria-label",
      hint || (indeterminate ? "Loading" : `Loading ${pct}%`),
    );
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
        searching: "Searching",
        downloading: "Downloading",
        learning: "Learning",
        installing: "Installing",
        ready: "Ready",
        failed: "Failed",
        thinking: "Thinking",
        "avatar-load": "Loading avatar",
        "character-switch": "Switching",
        "motion-pack": "Motion library",
      }
    : {
        connecting: "連線中",
        searching: "搜尋中",
        downloading: "下載中",
        learning: "學習中",
        installing: "安裝中",
        ready: "完成",
        failed: "失敗",
        thinking: "思考中",
        "avatar-load": "載入角色",
        "character-switch": "切換同伴",
        "motion-pack": "動作庫",
      };
  return map[phase] || (isEnglish ? "Loading" : "載入中");
}
