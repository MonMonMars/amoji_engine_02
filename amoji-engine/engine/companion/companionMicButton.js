/**
 * ChatGPT-style companion mic button — emotion-linked glow, rings, and waveform.
 */
export const COMPANION_MIC_BUTTON_SCHEMA = "amoji.companionMicButton.v4";

const EMOTION_HUD_LABEL = Object.freeze({
  neutral: { en: "Neutral", yue: "平靜" },
  happy: { en: "Happy", yue: "開心" },
  thinking: { en: "Thinking", yue: "思考" },
  sad: { en: "Sad", yue: "傷心" },
  surprised: { en: "Surprised", yue: "驚訝" },
  angry: { en: "Angry", yue: "生氣" },
});

const STATE_HUD_LABEL = Object.freeze({
  idle: { en: "Ready", yue: "待命" },
  listening: { en: "Listening", yue: "聽緊" },
  speaking: { en: "Speaking", yue: "講緊" },
  disabled: { en: "Off", yue: "停用" },
});

/** ChatGPT inline voice — gray waveform when off, blue when live. */
export const MIC_BUTTON_CHATGPT_IDLE = Object.freeze({
  hue: 218,
  sat: 10,
  light: 52,
  ringSpeed: 1,
});

export const MIC_BUTTON_CHATGPT_LIVE = Object.freeze({
  hue: 212,
  sat: 72,
  light: 50,
  ringSpeed: 1.05,
});

/** @typedef {"idle" | "listening" | "speaking" | "disabled"} MicButtonState */

export const EMOTION_MIC_THEME = Object.freeze({
  neutral: { hue: 175, sat: 62, light: 58, ringSpeed: 1 },
  happy: { hue: 38, sat: 88, light: 58, ringSpeed: 1.15 },
  thinking: { hue: 258, sat: 58, light: 62, ringSpeed: 0.88 },
  sad: { hue: 215, sat: 42, light: 50, ringSpeed: 0.75 },
  surprised: { hue: 192, sat: 90, light: 55, ringSpeed: 1.35 },
  angry: { hue: 12, sat: 82, light: 52, ringSpeed: 1.2 },
});

export const NUANCE_MIC_DELTA = Object.freeze({
  none: { hue: 0, sat: 0, ringSpeed: 1 },
  shy: { hue: 14, sat: -10, ringSpeed: 0.85 },
  curious: { hue: 10, sat: 8, ringSpeed: 1.08 },
  excited: { hue: -6, sat: 12, ringSpeed: 1.28 },
  love: { hue: -18, sat: 10, ringSpeed: 0.95 },
  stress: { hue: 6, sat: -8, ringSpeed: 1.18 },
});

/** Border-radius presets — shape language on the mic orb. */
export const EMOTION_MIC_SHAPE = Object.freeze({
  neutral: "50%",
  happy: "50%",
  thinking: "44%",
  sad: "48%",
  surprised: "46%",
  angry: "38%",
});

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const EMOTION_THEME_ALIASES = Object.freeze({
  joy: "happy",
  cheerful: "happy",
  laughing: "happy",
  laughter: "happy",
  calm: "neutral",
  idle: "neutral",
  curious: "thinking",
  confused: "thinking",
  sorrow: "sad",
  cry: "sad",
  surprise: "surprised",
  shocked: "surprised",
  fearful: "surprised",
  fear: "surprised",
  anger: "angry",
  mad: "angry",
  disgusted: "angry",
  disgust: "angry",
});

/**
 * @param {string | null | undefined} emotion
 * @returns {keyof typeof EMOTION_MIC_THEME}
 */
export function normalizeEmotionThemeKey(emotion) {
  const key = String(emotion || "neutral").toLowerCase();
  if (EMOTION_MIC_THEME[key]) return key;
  return EMOTION_THEME_ALIASES[key] || "neutral";
}

/**
 * @param {{ emotion?: string, nuance?: string }} [opts]
 */
export function resolveMicButtonTheme(opts = {}) {
  const emotion = normalizeEmotionThemeKey(opts.emotion);
  const nuance = String(opts.nuance || "none").toLowerCase();
  const base = EMOTION_MIC_THEME[emotion] || EMOTION_MIC_THEME.neutral;
  const delta = NUANCE_MIC_DELTA[nuance] || NUANCE_MIC_DELTA.none;

  const hue = clamp(base.hue + delta.hue, 0, 360);
  const sat = clamp(base.sat + delta.sat, 28, 100);
  const light = base.light;
  const ringSpeed = clamp(base.ringSpeed * delta.ringSpeed, 0.6, 1.6);

  const accent = `hsl(${hue} ${sat}% ${light}%)`;
  const glowA = `hsl(${hue} ${Math.min(96, sat + 8)}% ${Math.min(72, light + 8)}% / 0.62)`;
  const glowB = `hsl(${clamp(hue + 42, 0, 360)} ${Math.max(48, sat - 6)}% ${Math.min(78, light + 12)}% / 0.38)`;
  const surface = `hsl(${hue} ${Math.max(32, sat - 18)}% 18% / 0.92)`;
  const border = `hsl(${hue} ${sat}% ${Math.min(70, light + 6)}% / 0.72)`;

  return {
    hue,
    sat,
    light,
    ringSpeed,
    accent,
    glowA,
    glowB,
    surface,
    border,
  };
}

/**
 * ChatGPT-style mic chrome: muted gray when off, saturated blue when live.
 * @param {MicButtonState | string} state
 * @param {{ emotion?: string, nuance?: string }} [opts]
 */
export function resolveMicButtonThemeForState(state, opts = {}) {
  const key = String(state || "idle").toLowerCase();
  if (key === "disabled") {
    const muted = resolveMicButtonTheme({ emotion: "neutral", nuance: "none" });
    return {
      ...muted,
      hue: 218,
      sat: 8,
      light: 44,
      accent: "rgba(255,255,255,0.42)",
      glowA: "rgba(255,255,255,0.08)",
      glowB: "rgba(255,255,255,0.04)",
      surface: "rgba(16, 20, 28, 0.72)",
      border: "rgba(255,255,255,0.1)",
    };
  }
  if (key === "idle") {
    const base = MIC_BUTTON_CHATGPT_IDLE;
    const hue = base.hue;
    const sat = base.sat;
    const light = base.light;
    return {
      hue,
      sat,
      light,
      ringSpeed: base.ringSpeed,
      accent: `hsl(${hue} 16% 78%)`,
      glowA: `hsl(${hue} 18% 72% / 0.12)`,
      glowB: `hsl(${hue} 12% 68% / 0.06)`,
      surface: "rgba(16, 20, 28, 0.94)",
      border: "rgba(255, 255, 255, 0.16)",
    };
  }
  const liveBase = MIC_BUTTON_CHATGPT_LIVE;
  const emotionTheme = resolveMicButtonTheme(opts);
  const hue =
    key === "speaking"
      ? clamp(emotionTheme.hue * 0.22 + liveBase.hue * 0.78, 198, 228)
      : liveBase.hue;
  const sat = key === "speaking" ? clamp(liveBase.sat * 0.72 + emotionTheme.sat * 0.28, 58, 88) : liveBase.sat;
  const light = liveBase.light;
  return {
    hue,
    sat,
    light,
    ringSpeed: liveBase.ringSpeed,
    accent: `hsl(${hue} ${Math.min(96, sat + 6)}% 68%)`,
    glowA: `hsl(${hue} ${Math.min(96, sat + 8)}% 58% / 0.62)`,
    glowB: `hsl(${clamp(hue + 28, 0, 360)} ${Math.max(48, sat - 6)}% 68% / 0.38)`,
    surface: `hsl(${hue} ${Math.max(36, sat - 12)}% 42% / 0.96)`,
    border: `hsl(${hue} ${sat}% 62% / 0.88)`,
  };
}

/**
 * @param {string} emotion
 * @param {boolean} [isEnglish]
 */
export function micHudEmotionLabel(emotion, isEnglish = false) {
  const key = normalizeEmotionThemeKey(emotion);
  const row = EMOTION_HUD_LABEL[key] || EMOTION_HUD_LABEL.neutral;
  return isEnglish ? row.en : row.yue;
}

/**
 * @param {MicButtonState | string} state
 * @param {boolean} [isEnglish]
 */
export function micHudStateLabel(state, isEnglish = false) {
  const key = String(state || "idle").toLowerCase();
  const row = STATE_HUD_LABEL[key] || STATE_HUD_LABEL.idle;
  return isEnglish ? row.en : row.yue;
}

/** Mic icon + waveform layers (ChatGPT Advanced Voice inspired). */
export function companionMicButtonInnerHtml() {
  return `
    <span class="mic-btn__halo" aria-hidden="true"></span>
    <span class="mic-btn__aura" aria-hidden="true"></span>
    <span class="mic-btn__ring mic-btn__ring--a" aria-hidden="true"></span>
    <span class="mic-btn__ring mic-btn__ring--b" aria-hidden="true"></span>
    <span class="mic-btn__ring mic-btn__ring--c" aria-hidden="true"></span>
    <span class="mic-btn__wave" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </span>
    <span class="mic-btn__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 14.2a3.2 3.2 0 0 0 3.2-3.2V7.8a3.2 3.2 0 1 0-6.4 0v3.2a3.2 3.2 0 0 0 3.2 3.2Z"
          fill="currentColor"
        />
        <path
          d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <path
          d="M12 16.8V19.2M9.6 19.2h4.8"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </span>
  `;
}

/**
 * Encode voice state on the mic button itself — glow size/color/speed/shape (no external HUD).
 * @param {HTMLElement | null} el
 * @param {{
 *   state?: string,
 *   emotion?: string,
 *   level?: number,
 *   isEnglish?: boolean,
 *   live?: boolean,
 * }} [opts]
 */
export function syncMicButtonGlow(el, opts = {}) {
  if (!el) return;
  const state = String(opts.state || "idle").toLowerCase();
  const live =
    opts.live ?? (state === "listening" || state === "speaking");
  const emotion = normalizeEmotionThemeKey(opts.emotion);
  const level = clamp(Number(opts.level) || 0, 0, 1);
  const isEnglish = Boolean(opts.isEnglish);

  el.classList.toggle("mic-live", live);
  el.dataset.micEmotion = emotion;
  if (live) el.dataset.micLive = "true";
  else el.removeAttribute("data-mic-live");

  const shape = EMOTION_MIC_SHAPE[emotion] || EMOTION_MIC_SHAPE.neutral;
  el.style.setProperty("--mic-shape-radius", shape);

  const insetGlow = live ? 6 + level * 22 : 2 + level * 4;
  const glowIntensity = live ? 0.42 + level * 0.52 : 0.1 + level * 0.12;
  const haloScale = live ? 1 + level * 0.1 : 1;
  el.style.setProperty("--mic-glow-inset", `${insetGlow.toFixed(1)}px`);
  el.style.setProperty("--mic-glow-intensity", glowIntensity.toFixed(3));
  el.style.setProperty("--mic-halo-scale", haloScale.toFixed(3));
  el.classList.toggle("mic-glow-inset", true);

  if (state === "speaking") {
    el.dataset.micPulse = "soft";
  } else if (state === "listening") {
    el.dataset.micPulse = "active";
  } else {
    el.removeAttribute("data-mic-pulse");
  }

  const ariaLabel = live
    ? `${micHudStateLabel(state, isEnglish)} — ${micHudEmotionLabel(emotion, isEnglish)}`
    : micHudStateLabel(state, isEnglish);
  el.setAttribute("aria-label", ariaLabel);
}

/**
 * @deprecated External HUD removed — use syncMicButtonGlow on the mic button.
 */
export function syncMicVoiceHud(hudRoot, opts = {}) {
  if (hudRoot?.classList?.contains("mic-btn")) {
    syncMicButtonGlow(hudRoot, opts);
  }
}

/**
 * @param {HTMLElement} el
 * @param {{ emotion?: string, nuance?: string, isEnglish?: boolean | (() => boolean) }} [opts]
 */
export function createCompanionMicButton(el, opts = {}) {
  if (!el) {
    return {
      setState() {},
      setEmotion() {},
      setLevel() {},
      sync() {},
      reset() {},
    };
  }

  el.classList.add("mic-btn");
  const waveBars = el.querySelectorAll(".mic-btn__wave i").length;
  const needsUpgrade =
    !el.querySelector(".mic-btn__halo") ||
    !el.querySelector(".mic-btn__ring--c") ||
    waveBars < 7;
  if (!el.querySelector(".mic-btn__icon") || needsUpgrade) {
    el.innerHTML = companionMicButtonInnerHtml();
  }

  const isEnglish = () =>
    typeof opts.isEnglish === "function"
      ? Boolean(opts.isEnglish())
      : Boolean(opts.isEnglish);

  /** @type {MicButtonState} */
  let state = "idle";
  let emotion = opts.emotion || "neutral";
  let nuance = opts.nuance || "none";
  let hudLevel = 0;
  let theme = resolveMicButtonThemeForState("idle", { emotion, nuance });

  const syncHud = () => {
    syncMicButtonGlow(el, {
      state,
      emotion,
      level: hudLevel,
      isEnglish: isEnglish(),
    });
  };

  const applyTheme = () => {
    el.style.setProperty("--mic-hue", String(theme.hue));
    el.style.setProperty("--mic-sat", `${theme.sat}%`);
    el.style.setProperty("--mic-light", `${theme.light}%`);
    el.style.setProperty("--mic-accent", theme.accent);
    el.style.setProperty("--mic-glow-a", theme.glowA);
    el.style.setProperty("--mic-glow-b", theme.glowB);
    el.style.setProperty("--mic-surface", theme.surface);
    el.style.setProperty("--mic-border", theme.border);
    el.style.setProperty("--mic-ring-speed", `${theme.ringSpeed.toFixed(2)}s`);
  };

  const applyStateTheme = () => {
    theme = resolveMicButtonThemeForState(state, { emotion, nuance });
    applyTheme();
  };

  /** @type {((from: string, to: string) => void) | null} */
  let onStateChange = null;

  const setState = (next) => {
    const allowed = ["idle", "listening", "speaking", "disabled"];
    const prev = state;
    state = allowed.includes(next) ? next : "idle";
    if (prev !== state) {
      el.classList.add("mic-state-flash");
      globalThis.setTimeout?.(() => el.classList.remove("mic-state-flash"), 320);
      onStateChange?.(prev, state);
    }
    el.dataset.micState = state;
    el.dataset.micLive = state === "listening" || state === "speaking" ? "true" : "false";
    el.classList.toggle("mic-live", state === "listening" || state === "speaking");
    el.classList.toggle("mic-off", state === "idle");
    el.classList.toggle("on", state === "listening" || state === "speaking");
    el.setAttribute("aria-pressed", state === "listening" || state === "speaking" ? "true" : "false");
    applyStateTheme();
    syncHud();
  };

  const setEmotion = (nextEmotion, nextNuance = "none") => {
    emotion = String(nextEmotion || "neutral");
    nuance = String(nextNuance || "none");
    applyStateTheme();
    syncHud();
  };

  const setLevel = (level) => {
    if (state !== "listening" && state !== "speaking") {
      el.style.removeProperty("--mic-level");
      el.style.removeProperty("--mic-bounce");
      hudLevel = 0;
      syncHud();
      return;
    }
    const clamped = clamp(Number(level) || 0, 0, 1);
    hudLevel = clamped;
    const bouncePx = 3 + clamped * 12;
    el.style.setProperty("--mic-level", clamped.toFixed(3));
    el.style.setProperty("--mic-bounce", `${bouncePx.toFixed(2)}px`);
    syncHud();
  };

  const reset = () => {
    el.style.removeProperty("--mic-level");
    el.style.removeProperty("--mic-bounce");
    hudLevel = 0;
    syncHud();
  };

  /**
   * @param {{
   *   micOn?: boolean,
   *   speaking?: boolean,
   *   assistantActive?: boolean,
   *   disabled?: boolean,
   * }} ctx
   */
  const sync = (ctx = {}) => {
    if (ctx.disabled) {
      setState("disabled");
      reset();
      return;
    }
    if (!ctx.micOn) {
      setState("idle");
      reset();
      return;
    }
    if (ctx.speaking || ctx.assistantActive) {
      setState("speaking");
      return;
    }
    setState("listening");
  };

  setState("idle");
  syncHud();

  return {
    setState,
    setEmotion,
    setLevel,
    sync,
    reset,
    syncHud,
    setHudRoot() {
      syncHud();
    },
    setOnStateChange(fn) {
      onStateChange = typeof fn === "function" ? fn : null;
    },
    getState: () => state,
    getTheme: () => theme,
  };
}
