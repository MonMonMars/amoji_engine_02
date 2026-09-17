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
 * Size, color, and motion for the top-left ChatGPT-style mini emotion ball.
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   state?: string,
 *   level?: number,
 *   time?: number,
 * }} [opts]
 */
export function computeMiniEmotionBallFrame(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const nuance = String(opts.nuance || "none").toLowerCase();
  const state = String(opts.state || "idle").toLowerCase();
  const time = Number(opts.time) || 0;
  const raw = clamp(Number(opts.level) || 0, 0, 1);
  const theme = resolveMicButtonTheme({ emotion, nuance });
  const speaking = state === "speaking";
  const listening = state === "listening";
  const thinking = state === "thinking" || state === "loading";
  const live = speaking || listening;
  const breath = Math.sin(time * 1.45) * 0.5 + 0.5;
  const thinkWave = Math.sin(time * 2.35) * 0.5 + 0.5;

  let volume = raw;
  if (live) volume = raw;
  else if (thinking) volume = 0.2 + thinkWave * 0.28;
  else volume = 0.07 + breath * 0.12 + raw * 0.22;

  const scale = live
    ? 1.06 + volume * 0.82
    : thinking
      ? 1.05 + volume * 0.28
      : 1.02 + volume * 0.2;
  const wobble = live
    ? 0.07 + volume * 0.2
    : thinking
      ? 0.055 + thinkWave * 0.035
      : 0.03 + breath * 0.02;
  const glow = 7 + volume * (live ? 26 : thinking ? 16 : 10);
  const bright = live
    ? 0.96 + volume * 0.42
    : thinking
      ? 0.98 + thinkWave * 0.14
      : 0.94 + breath * 0.1;

  return {
    emotion,
    nuance,
    state,
    theme,
    hue: theme.hue,
    sat: theme.sat,
    light: theme.light,
    volume,
    scale,
    wobble,
    glow,
    bright,
    live,
    thinking,
  };
}

/**
 * Paint CSS variables from a computed mini-ball frame.
 * @param {HTMLElement | null} el
 * @param {ReturnType<typeof computeMiniEmotionBallFrame>} frame
 */
export function applyMiniEmotionBallFrame(el, frame) {
  if (!el?.style || !frame) return null;
  el.dataset.state = frame.state;
  el.dataset.emotion = frame.emotion;
  const bg = `hsl(${frame.hue} ${frame.sat}% ${frame.light}%)`;
  const shadow = `0 0 ${frame.glow}px hsl(${frame.hue} ${frame.sat}% ${frame.light}% / ${0.4 + frame.volume * 0.5}), 0 0 ${frame.glow * 1.8}px hsl(${frame.hue} ${Math.max(40, frame.sat - 8)}% ${Math.min(72, frame.light + 8)}% / ${0.2 + frame.volume * 0.28})`;
  el.style.setProperty("--mini-ball-bg", bg);
  el.style.setProperty("--mini-ball-shadow", shadow);
  el.style.setProperty("--mini-ball-scale", frame.scale.toFixed(3));
  el.style.setProperty("--mini-ball-bright", frame.bright.toFixed(3));
  el.style.setProperty("--mini-ball-wobble", frame.wobble.toFixed(3));
  el.style.setProperty("--mini-ball-hue", String(frame.hue));
  return frame;
}

/**
 * Paint CSS variables for the chip orb (used by the controller and tests).
 * @param {HTMLElement | null} el
 * @param {{ emotion?: string, nuance?: string, level?: number, state?: string, time?: number }} [opts]
 */
export function syncMiniEmotionBall(el, opts = {}) {
  if (!el?.style) return null;
  return applyMiniEmotionBallFrame(el, computeMiniEmotionBallFrame(opts));
}

const emptyMiniBall = () => ({
  sync() {},
  setState() {},
  setEmotion() {},
  setLevel() {},
  destroy() {},
  getFrame: () => computeMiniEmotionBallFrame(),
  getState: () => "idle",
  getVolume: () => 0,
});

/**
 * Live controller for the top-left mini emotion ball.
 * Color = character emotion, size = mic/mouth volume, motion = idle/think/talk.
 * @param {HTMLElement | null} el
 */
export function createMiniEmotionBall(el) {
  if (!el) return emptyMiniBall();

  el.classList.add("mini-emotion-ball");
  let canvas = el.querySelector?.("canvas.companion-chip__dot-canvas") || null;
  if (!canvas && typeof document !== "undefined") {
    canvas = document.createElement("canvas");
    canvas.className = "companion-chip__dot-canvas";
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);
  }
  const ctx = canvas?.getContext?.("2d") || null;

  let emotion = "neutral";
  let nuance = "none";
  let state = "idle";
  let targetVolume = 0;
  let displayVolume = 0;
  let rafId = 0;
  let startTime = 0;
  let lastFrame = computeMiniEmotionBallFrame();

  const resizeCanvas = () => {
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const rect = el.getBoundingClientRect?.() || { width: 28, height: 28 };
    const size = Math.max(28, Math.round(Math.max(rect.width || 0, rect.height || 0) * 1.36));
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    if (typeof ctx.setTransform === "function") {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  const paint = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const time = (timestamp - startTime) / 1000;
    displayVolume = smoothStep(displayVolume, targetVolume, 0.32);
    lastFrame = computeMiniEmotionBallFrame({
      emotion,
      nuance,
      state,
      level: displayVolume,
      time,
    });
    applyMiniEmotionBallFrame(el, lastFrame);
    if (ctx && canvas) {
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const w = (canvas.width || 36) / dpr;
      const h = (canvas.height || 36) / dpr;
      if (typeof ctx.setTransform === "function") {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      drawEmotionOrbFrame(ctx, w || 36, h || 36, {
        time,
        volume: lastFrame.volume,
        hue: lastFrame.hue,
        sat: lastFrame.sat,
        light: lastFrame.light,
        state: lastFrame.live ? state : lastFrame.thinking ? "thinking" : "idle",
        compact: true,
      });
    }
    rafId = typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame(paint)
      : 0;
  };

  const startLoop = () => {
    if (rafId) return;
    resizeCanvas();
    const raf = globalThis.requestAnimationFrame;
    if (typeof raf === "function") {
      rafId = raf(paint);
    }
  };

  const stopLoop = () => {
    if (rafId) {
      globalThis.cancelAnimationFrame?.(rafId);
      rafId = 0;
    }
    startTime = 0;
  };

  const setState = (next) => {
    state = String(next || "idle").toLowerCase();
  };

  const setEmotion = (nextEmotion, nextNuance = nuance) => {
    emotion = String(nextEmotion || "neutral").toLowerCase();
    nuance = String(nextNuance || "none").toLowerCase();
  };

  const setLevel = (level) => {
    targetVolume = clamp(Number(level) || 0, 0, 1);
  };

  const sync = (ctxIn = {}) => {
    if (ctxIn.emotion) setEmotion(ctxIn.emotion, ctxIn.nuance || nuance);
    else if (ctxIn.nuance) nuance = String(ctxIn.nuance).toLowerCase();
    if (ctxIn.state) setState(ctxIn.state);
    if (ctxIn.level != null) setLevel(ctxIn.level);
    startLoop();
  };

  if (globalThis.ResizeObserver && canvas) {
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(el);
  }

  startLoop();

  return {
    schema: COMPANION_EMOTION_BALL_SCHEMA,
    sync,
    setState,
    setEmotion,
    setLevel,
    destroy: stopLoop,
    getFrame: () => lastFrame,
    getState: () => state,
    getVolume: () => displayVolume,
  };
}
