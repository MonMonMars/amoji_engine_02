/**
 * ChatGPT-style companion mic button — emotion-linked glow, rings, and waveform.
 */
export const COMPANION_MIC_BUTTON_SCHEMA = "amoji.companionMicButton.v2";

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
 * @param {HTMLElement} el
 * @param {{ emotion?: string, nuance?: string }} [opts]
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
  if (!el.querySelector(".mic-btn__icon")) {
    el.innerHTML = companionMicButtonInnerHtml();
  }

  /** @type {MicButtonState} */
  let state = "idle";
  let emotion = opts.emotion || "neutral";
  let nuance = opts.nuance || "none";
  let theme = resolveMicButtonThemeForState("idle", { emotion, nuance });

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
    const titles = {
      idle: "Tap to turn mic on",
      listening: "Mic on — listening",
      speaking: "Mic on — companion speaking",
      disabled: "Mic unavailable",
    };
    el.title = titles[state] || titles.idle;
    applyStateTheme();
  };

  const setEmotion = (nextEmotion, nextNuance = "none") => {
    emotion = String(nextEmotion || "neutral");
    nuance = String(nextNuance || "none");
    applyStateTheme();
  };

  const setLevel = (level) => {
    if (state !== "listening" && state !== "speaking") {
      el.style.removeProperty("--mic-level");
      el.style.removeProperty("--mic-bounce");
      return;
    }
    const clamped = clamp(Number(level) || 0, 0, 1);
    const bouncePx = 3 + clamped * 12;
    el.style.setProperty("--mic-level", clamped.toFixed(3));
    el.style.setProperty("--mic-bounce", `${bouncePx.toFixed(2)}px`);
  };

  const reset = () => {
    el.style.removeProperty("--mic-level");
    el.style.removeProperty("--mic-bounce");
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

  return {
    setState,
    setEmotion,
    setLevel,
    sync,
    reset,
    setOnStateChange(fn) {
      onStateChange = typeof fn === "function" ? fn : null;
    },
    getState: () => state,
    getTheme: () => theme,
  };
}
