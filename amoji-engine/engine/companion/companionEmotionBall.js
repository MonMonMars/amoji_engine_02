/**
 * ChatGPT-style emotion orb — canvas fluid blob + spectrum + emotion/volume HUD.
 */
import { resolveMicButtonTheme } from "./companionMicButton.js";
import {
  buildSpectrumLevels,
  clamp,
  drawEmotionOrbFrame,
  smoothStep,
} from "./companionEmotionOrbCanvas.js";

export const COMPANION_EMOTION_BALL_SCHEMA = "amoji.companionEmotionBall.v2";

/** @typedef {"idle" | "listening" | "thinking" | "speaking" | "disabled"} EmotionBallState */

const STATE_LABEL_EN = Object.freeze({
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  disabled: "Off",
});

const STATE_LABEL_YUE = Object.freeze({
  idle: "待命",
  listening: "聽緊",
  thinking: "諗緊",
  speaking: "講緊",
  disabled: "停用",
});

const EMOTION_LABEL = Object.freeze({
  neutral: { en: "Neutral", yue: "平靜" },
  happy: { en: "Happy", yue: "開心" },
  thinking: { en: "Thinking", yue: "思考" },
  sad: { en: "Sad", yue: "傷心" },
  surprised: { en: "Surprised", yue: "驚訝" },
  angry: { en: "Angry", yue: "生氣" },
});

/** ChatGPT-inspired layered orb markup. */
export function companionEmotionBallInnerHtml() {
  return `
    <canvas class="emotion-ball__canvas" aria-hidden="true"></canvas>
    <div class="emotion-ball__hud" aria-hidden="true">
      <span class="emotion-ball__emotion-chip" data-emotion-chip>Neutral</span>
      <span class="emotion-ball__volume-meter">
        <span class="emotion-ball__volume-fill" data-volume-fill></span>
      </span>
    </div>
    <div class="emotion-ball__spectrum" data-spectrum aria-hidden="true"></div>
    <div class="emotion-ball__halo" aria-hidden="true"></div>
  `;
}

/**
 * @param {HTMLElement} root
 * @param {number} count
 */
function ensureSpectrumBars(root, count = 16) {
  const spectrum = root.querySelector("[data-spectrum]");
  if (!spectrum) return [];
  if (spectrum.childElementCount === count) {
    return [...spectrum.querySelectorAll(".emotion-ball__bar")];
  }
  spectrum.innerHTML = "";
  /** @type {HTMLElement[]} */
  const bars = [];
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("span");
    bar.className = "emotion-ball__bar";
    bar.style.setProperty("--bar-i", String(i));
    spectrum.appendChild(bar);
    bars.push(bar);
  }
  return bars;
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
  if (!el.querySelector(".emotion-ball__canvas")) {
    el.innerHTML = companionEmotionBallInnerHtml();
  }

  const canvas = el.querySelector(".emotion-ball__canvas");
  const ctx = canvas?.getContext?.("2d") || null;
  const labelEl =
    el.parentElement?.querySelector?.(".emotion-ball__caption") || null;
  const emotionChip =
    el.querySelector("[data-emotion-chip]") || null;
  const volumeFill =
    el.querySelector("[data-volume-fill]") || null;
  const spectrumBars = ensureSpectrumBars(el, 16);

  /** @type {EmotionBallState} */
  let state = "idle";
  let theme = resolveMicButtonTheme({ emotion: "neutral", nuance: "none" });
  let emotion = "neutral";
  let nuance = "none";
  let targetVolume = 0;
  let displayVolume = 0;
  /** @type {number[]} */
  let spectrumLevels = new Array(16).fill(0.15);
  let rafId = 0;
  let startTime = 0;
  let visible = false;

  const emotionLabel = (key) => {
    const row = EMOTION_LABEL[key] || EMOTION_LABEL.neutral;
    return isEnglish ? row.en : row.yue;
  };

  const stateLabel = (key) =>
    isEnglish
      ? STATE_LABEL_EN[key] || key
      : STATE_LABEL_YUE[key] || key;

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
    el.dataset.emotion = emotion;
    if (emotionChip) {
      emotionChip.textContent = emotionLabel(emotion);
    }
  };

  const resizeCanvas = () => {
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const rect = el.getBoundingClientRect();
    const size = Math.max(48, Math.round(rect.width || 68));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const updateSpectrumDom = (time) => {
    spectrumLevels = buildSpectrumLevels(
      spectrumLevels,
      displayVolume,
      time,
      spectrumBars.length || 16,
    );
    for (let i = 0; i < spectrumBars.length; i++) {
      const h = spectrumLevels[i] ?? 0.15;
      spectrumBars[i].style.setProperty("--bar-level", h.toFixed(3));
    }
    if (volumeFill) {
      volumeFill.style.width = `${Math.round(displayVolume * 100)}%`;
    }
    el.style.setProperty("--ball-level", displayVolume.toFixed(3));
    el.style.setProperty(
      "--ball-scale",
      (1 + displayVolume * 0.24).toFixed(3),
    );
  };

  const updateCaption = () => {
    if (!labelEl) return;
    const volPct = Math.round(displayVolume * 100);
    const volLabel = isEnglish ? `${volPct}% vol` : `音量 ${volPct}%`;
    labelEl.textContent = `${stateLabel(state)} · ${emotionLabel(emotion)} · ${volLabel}`;
  };

  const renderFrame = (timestamp) => {
    if (!visible) return;
    if (!startTime) startTime = timestamp;
    const time = (timestamp - startTime) / 1000;
    displayVolume = smoothStep(displayVolume, targetVolume, 0.28);
    updateSpectrumDom(time);
    updateCaption();

    if (ctx && canvas) {
      const w = canvas.width / (globalThis.devicePixelRatio || 1);
      const h = canvas.height / (globalThis.devicePixelRatio || 1);
      drawEmotionOrbFrame(ctx, w, h, {
        time,
        volume: displayVolume,
        hue: theme.hue,
        sat: theme.sat,
        light: theme.light,
        state,
      });
    }
    rafId = globalThis.requestAnimationFrame(renderFrame);
  };

  const startLoop = () => {
    if (rafId || !visible) return;
    resizeCanvas();
    rafId = globalThis.requestAnimationFrame(renderFrame);
  };

  const stopLoop = () => {
    if (rafId) {
      globalThis.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    startTime = 0;
  };

  const setState = (next) => {
    const allowed = ["idle", "listening", "thinking", "speaking", "disabled"];
    state = allowed.includes(next) ? next : "idle";
    el.dataset.ballState = state;
    el.classList.toggle(
      "is-live",
      state === "listening" || state === "speaking",
    );
    el.classList.toggle("is-thinking", state === "thinking");
    el.classList.toggle("is-idle", state === "idle");
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
    if (state === "disabled") {
      targetVolume = 0;
      return;
    }
    if (state === "idle") {
      targetVolume = clamp(Number(level) || 0, 0, 1) * 0.35;
      return;
    }
    targetVolume = clamp(Number(level) || 0, 0, 1);
  };

  const reset = () => {
    targetVolume = 0;
    displayVolume = 0;
    spectrumLevels = new Array(spectrumBars.length || 16).fill(0.12);
    el.style.removeProperty("--ball-level");
    el.style.removeProperty("--ball-scale");
    updateSpectrumDom(0);
    updateCaption();
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
   *   level?: number,
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
      if (ctx.level != null) setLevel(ctx.level);
      return;
    }
    if (sessionState === "speaking" || ctx.speaking || ctx.assistantActive) {
      setState("speaking");
      if (ctx.level != null) setLevel(ctx.level);
      return;
    }
    if (ctx.micOn || sessionState === "listening") {
      setState("listening");
      if (ctx.level != null) setLevel(ctx.level);
      return;
    }
    setState("idle");
    if (ctx.level != null) setLevel(ctx.level);
    else reset();
  };

  const stackEl = () =>
    el.parentElement?.classList?.contains?.("emotion-ball-stack")
      ? el.parentElement
      : null;

  const show = () => {
    visible = true;
    el.hidden = false;
    el.removeAttribute("aria-hidden");
    const stack = stackEl();
    stack?.classList?.remove?.("is-hidden");
    stack?.removeAttribute?.("aria-hidden");
    startLoop();
  };

  const hide = () => {
    visible = false;
    stopLoop();
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    const stack = stackEl();
    stack?.classList?.add?.("is-hidden");
    stack?.setAttribute?.("aria-hidden", "true");
  };

  if (globalThis.ResizeObserver && canvas) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(el);
  }

  setEmotion("neutral", "none");
  setState("idle");
  applyTheme();
  updateSpectrumDom(0);

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
    getVolume: () => displayVolume,
  };
}

/**
 * Drive the top-left chip dot like a ChatGPT mini emotion ball.
 * @param {HTMLElement | null} el
 * @param {{ emotion?: string, nuance?: string, level?: number, state?: string }} [opts]
 */
export function syncMiniEmotionBall(el, opts = {}) {
  if (!el?.style) return null;
  const theme = resolveMicButtonTheme({
    emotion: opts.emotion,
    nuance: opts.nuance,
  });
  const level = clamp(Number(opts.level) || 0, 0, 1);
  const state = String(opts.state || "idle");
  const speaking = state === "speaking" || state === "listening";
  const scale = 1 + level * (speaking ? 1.35 : 1.05);
  const bright = 0.92 + level * 0.45;
  el.dataset.state = state;
  el.dataset.emotion = String(opts.emotion || "neutral");
  const bg = `hsl(${theme.hue} ${theme.sat}% ${theme.light}%)`;
  const glow = 8 + level * 26;
  const shadow = `0 0 ${glow}px hsl(${theme.hue} ${theme.sat}% ${theme.light}% / ${0.42 + level * 0.5}), 0 0 ${glow * 1.8}px hsl(${theme.hue} ${Math.max(40, theme.sat - 8)}% ${Math.min(72, theme.light + 8)}% / ${0.22 + level * 0.28})`;
  el.style.setProperty("--mini-ball-bg", bg);
  el.style.setProperty("--mini-ball-shadow", shadow);
  el.style.setProperty("--mini-ball-scale", scale.toFixed(3));
  el.style.setProperty("--mini-ball-bright", bright.toFixed(3));
  return { ...theme, scale, level, state, bright };
}
