/**
 * Lightweight UI helpers for the companion demo (status, loading, typewriter).
 */
export const COMPANION_UI_SCHEMA = "amoji.companionUi.v1";

/**
 * @param {{
 *   onState?: (state: string) => void,
 * }} [opts]
 */
export function createCompanionStatus(opts = {}) {
  let state = "idle";
  const set = (next) => {
    state = next;
    opts.onState?.(state);
    return state;
  };
  return {
    get state() {
      return state;
    },
    idle: () => set("idle"),
    loading: () => set("loading"),
    listening: () => set("listening"),
    thinking: () => set("thinking"),
    speaking: () => set("speaking"),
  };
}

/**
 * @param {HTMLElement} root
 */
export function createLoadingOverlay(root) {
  const el = document.createElement("div");
  el.className = "avatar-loading";
  el.innerHTML = `
    <div class="avatar-loading-card">
      <div class="avatar-loading-ring" aria-hidden="true"></div>
      <p class="avatar-loading-title">Loading Amoji</p>
      <p class="avatar-loading-sub">VRM anime girl · expressions · spring bones</p>
    </div>
  `;
  root.appendChild(el);
  return {
    show() {
      el.classList.remove("hide");
    },
    hide() {
      el.classList.add("hide");
    },
    remove() {
      el.remove();
    },
  };
}

/**
 * Typewriter reveal for assistant bubbles.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {{ cps?: number, onTick?: () => void }} [opts]
 */
export async function typewriter(el, text, opts = {}) {
  const full = String(text || "");
  const cps = opts.cps ?? 42;
  const delay = 1000 / Math.max(12, cps);
  el.textContent = "";
  for (let i = 0; i < full.length; i += 1) {
    el.textContent = full.slice(0, i + 1);
    opts.onTick?.();
    await sleep(delay);
  }
  return full;
}

/**
 * @param {HTMLElement} transcript
 */
export function createInterimBubble(transcript) {
  let row = null;
  let el = null;
  const ensure = () => {
    if (el?.isConnected) return el;
    row = document.createElement("div");
    row.className = "msg-row user";
    el = document.createElement("div");
    el.className = "bubble user interim";
    el.setAttribute("aria-live", "polite");
    row.appendChild(el);
    transcript.appendChild(row);
    transcript.scrollTop = transcript.scrollHeight;
    return el;
  };
  return {
    set(text) {
      const t = String(text || "").trim();
      if (!t) {
        this.clear();
        return;
      }
      ensure().textContent = t;
      transcript.scrollTop = transcript.scrollHeight;
    },
    clear() {
      if (row?.parentNode) row.remove();
      row = null;
      el = null;
    },
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
