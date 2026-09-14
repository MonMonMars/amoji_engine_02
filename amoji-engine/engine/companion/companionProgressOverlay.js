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
      <div class="companion-progress-head">
        <span class="companion-progress-phase"></span>
        <span class="companion-progress-pct">0%</span>
      </div>
      <div class="companion-progress-track" aria-hidden="true">
        <div class="companion-progress-fill"></div>
      </div>
      <p class="companion-progress-label"></p>
    </div>
  `;
  root.appendChild(el);

  const phaseEl = el.querySelector(".companion-progress-phase");
  const pctEl = el.querySelector(".companion-progress-pct");
  const fillEl = el.querySelector(".companion-progress-fill");
  const labelEl = el.querySelector(".companion-progress-label");
  const trackEl = el.querySelector(".companion-progress-track");
  let indeterminate = false;

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
      fillEl.style.width = indeterminate ? "38%" : `${pct}%`;
      fillEl.classList.toggle("is-indeterminate", indeterminate);
    }
    if (trackEl) trackEl.classList.toggle("is-indeterminate", indeterminate);
    if (phaseEl) phaseEl.textContent = phase || "";
    if (labelEl) labelEl.textContent = label || "";
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
