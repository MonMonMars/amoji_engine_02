/**
 * ChatGPT-style emotion orb — large reactive glow tied to mood + voice state.
 */
import { resolveMicButtonTheme } from "./companionMicButton.js";

export const COMPANION_EMOTION_BALL_SCHEMA = "amoji.companionEmotionBall.v1";

/** @typedef {"idle" | "listening" | "thinking" | "speaking" | "disabled"} EmotionBallState */

const STATE_LABEL = Object.freeze({
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  disabled: "Off",
});

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** ChatGPT-inspired layered orb markup. */
export function companionEmotionBallInnerHtml() {
  return `
    <div class="emotion-ball__halo" aria-hidden="true"></div>
    <div class="emotion-ball__ring emotion-ball__ring--a" aria-hidden="true"></div>
    <div class="emotion-ball__ring emotion-ball__ring--b" aria-hidden="true"></div>
    <div class="emotion-ball__core" aria-hidden="true"></div>
    <div class="emotion-ball__shine" aria-hidden="true"></div>
    <div class="emotion-ball__wave" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
  `;
}

/**
 * @param {HTMLElement | null} el
 * @param {{ isEnglish?: boolean }} [opts]
 */
export function createCompanionEmotionBall(el, opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  if (!el) {
    return {
      show() {},
      hide() {},
      setState() {},
      setEmotion() {},
      setLevel() {},
      sync() {},
      reset() {},
    };
  }

  el.classList.add("emotion-ball");
  if (!el.querySelector(".emotion-ball__core")) {
    el.innerHTML = companionEmotionBallInnerHtml();
  }

  const labelEl =
    el.parentElement?.querySelector?.(".emotion-ball__caption") || null;

  /** @type {EmotionBallState} */
  let state = "idle";
  let theme = resolveMicButtonTheme({ emotion: "neutral", nuance: "none" });
  let emotion = "neutral";
  let nuance = "none";

  const applyTheme = () => {
    el.style.setProperty("--ball-hue", String(theme.hue));
    el.style.setProperty("--ball-sat", `${theme.sat}%`);
    el.style.setProperty("--ball-light", `${theme.light}%`);
    el.style.setProperty("--ball-accent", theme.accent);
    el.style.setProperty("--ball-glow-a", theme.glowA);
    el.style.setProperty("--ball-glow-b", theme.glowB);
    el.style.setProperty("--ball-surface", theme.surface);
    el.style.setProperty("--ball-border", theme.border);
    el.style.setProperty("--ball-ring-speed", `${theme.ringSpeed.toFixed(2)}s`);
  };

  const updateCaption = () => {
    if (!labelEl) return;
    const stateLabel = isEnglish
      ? STATE_LABEL[state] || state
      : state === "listening"
        ? "聽緊"
        : state === "thinking"
          ? "諗緊"
          : state === "speaking"
            ? "講緊"
            : state === "disabled"
              ? "停用"
              : "待命";
    labelEl.textContent = `${stateLabel} · ${emotion}`;
  };

  const setState = (next) => {
    const allowed = ["idle", "listening", "thinking", "speaking", "disabled"];
    state = allowed.includes(next) ? next : "idle";
    el.dataset.ballState = state;
    el.classList.toggle("is-live", state === "listening" || state === "speaking");
    el.classList.toggle("is-thinking", state === "thinking");
    updateCaption();
  };

  const setEmotion = (nextEmotion, nextNuance = "none") => {
    emotion = String(nextEmotion || "neutral").toLowerCase();
    nuance = String(nextNuance || "none").toLowerCase();
    theme = resolveMicButtonTheme({ emotion, nuance });
    applyTheme();
    updateCaption();
  };

  const setLevel = (level) => {
    if (state !== "listening" && state !== "speaking") {
      el.style.removeProperty("--ball-level");
      el.style.removeProperty("--ball-scale");
      return;
    }
    const clamped = clamp(Number(level) || 0, 0, 1);
    const scale = 1 + clamped * 0.22;
    el.style.setProperty("--ball-level", clamped.toFixed(3));
    el.style.setProperty("--ball-scale", scale.toFixed(3));
  };

  const reset = () => {
    el.style.removeProperty("--ball-level");
    el.style.removeProperty("--ball-scale");
  };

  /**
   * @param {{
   *   sessionState?: string,
   *   micOn?: boolean,
   *   speaking?: boolean,
   *   assistantActive?: boolean,
   *   disabled?: boolean,
   *   emotion?: string,
   *   nuance?: string,
   * }} ctx
   */
  const sync = (ctx = {}) => {
    if (ctx.emotion) setEmotion(ctx.emotion, ctx.nuance || nuance);
    if (ctx.disabled) {
      setState("disabled");
      reset();
      return;
    }
    const sessionState = String(ctx.sessionState || "").toLowerCase();
    if (sessionState === "thinking" || sessionState === "loading") {
      setState("thinking");
      return;
    }
    if (sessionState === "speaking" || ctx.speaking || ctx.assistantActive) {
      setState("speaking");
      return;
    }
    if (ctx.micOn || sessionState === "listening") {
      setState("listening");
      return;
    }
    setState("idle");
    reset();
  };

  const stackEl = () =>
    el.parentElement?.classList?.contains?.("emotion-ball-stack")
      ? el.parentElement
      : null;

  const show = () => {
    el.hidden = false;
    el.removeAttribute("aria-hidden");
    const stack = stackEl();
    stack?.classList?.remove?.("is-hidden");
    stack?.removeAttribute?.("aria-hidden");
  };

  const hide = () => {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    const stack = stackEl();
    stack?.classList?.add?.("is-hidden");
    stack?.setAttribute?.("aria-hidden", "true");
  };

  setEmotion("neutral", "none");
  setState("idle");
  applyTheme();

  return {
    schema: COMPANION_EMOTION_BALL_SCHEMA,
    show,
    hide,
    setState,
    setEmotion,
    setLevel,
    sync,
    reset,
    getState: () => state,
    getTheme: () => theme,
  };
}
