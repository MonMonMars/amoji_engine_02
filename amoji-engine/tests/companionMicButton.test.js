import { describe, expect, it } from "vitest";
import {
  companionMicButtonInnerHtml,
  createCompanionMicButton,
  micHudEmotionLabel,
  micButtonVisualForState,
  MIC_BUTTON_CHATGPT_LIVE,
  MIC_BUTTON_CHATGPT_IDLE,
  resolveMicButtonTheme,
  resolveMicButtonThemeForState,
  syncMicButtonGlow,
  syncMicVoiceHud,
  EMOTION_MIC_THEME,
} from "../engine/companion/companionMicButton.js";

describe("companionMicButton", () => {
  it("maps emotions to distinct accent hues", () => {
    const happy = resolveMicButtonTheme({ emotion: "happy" });
    const sad = resolveMicButtonTheme({ emotion: "sad" });
    expect(happy.hue).not.toBe(sad.hue);
    expect(happy.accent).toContain("hsl(");
    expect(sad.glowA).toContain("/ 0.62)");
  });

  it("shifts theme with nuance", () => {
    const base = resolveMicButtonTheme({ emotion: "neutral", nuance: "none" });
    const excited = resolveMicButtonTheme({ emotion: "neutral", nuance: "excited" });
    expect(excited.ringSpeed).toBeGreaterThan(base.ringSpeed);
  });

  it("maps emotion aliases onto the same orb hues", () => {
    const happy = resolveMicButtonTheme({ emotion: "happy" });
    const joy = resolveMicButtonTheme({ emotion: "joy" });
    const sorrow = resolveMicButtonTheme({ emotion: "sorrow" });
    const sad = resolveMicButtonTheme({ emotion: "sad" });
    expect(joy.hue).toBe(happy.hue);
    expect(sorrow.hue).toBe(sad.hue);
  });

  it("falls back to neutral for unknown emotions", () => {
    const theme = resolveMicButtonTheme({ emotion: "mystery" });
    expect(theme.hue).toBe(EMOTION_MIC_THEME.neutral.hue);
  });

  it("renders mic layers without emoji", () => {
    const html = companionMicButtonInnerHtml();
    expect(html).toContain("mic-btn__wave");
    expect(html).toContain("mic-btn__halo");
    expect(html).toContain("mic-btn__ring--c");
    expect(html).toContain("mic-btn__icon");
    expect((html.match(/<i><\/i>/g) || []).length).toBe(7);
    expect(html).not.toContain("🎤");
  });

  it("upgrades legacy mic markup to full ChatGPT layers", () => {
    if (typeof document === "undefined") return;
    const el = document.createElement("button");
    el.innerHTML = `
      <span class="mic-btn__wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      <span class="mic-btn__icon" aria-hidden="true"></span>
    `;
    createCompanionMicButton(el);
    expect(el.querySelector(".mic-btn__halo")).toBeTruthy();
    expect(el.querySelector(".mic-btn__ring--c")).toBeTruthy();
    expect(el.querySelectorAll(".mic-btn__wave i").length).toBe(7);
  });

  it("encodes emotion and volume on the mic button glow", () => {
    if (typeof document === "undefined") return;
    const btn = document.createElement("button");
    btn.className = "mic-btn";
    syncMicButtonGlow(btn, {
      state: "listening",
      emotion: "happy",
      level: 0.62,
      isEnglish: true,
      live: true,
    });
    expect(btn.classList.contains("mic-live")).toBe(true);
    expect(btn.dataset.micEmotion).toBe("happy");
    expect(btn.dataset.micPulse).toBe("active");
    expect(btn.getAttribute("aria-label")).toContain(micHudEmotionLabel("happy", true));
    expect(btn.style.getPropertyValue("--mic-glow-inset")).toBeTruthy();
    expect(btn.classList.contains("mic-glow-inset")).toBe(true);
    expect(Number(btn.style.getPropertyValue("--mic-halo-scale"))).toBeGreaterThan(1);
  });

  it("syncMicVoiceHud delegates to mic button when passed the button", () => {
    if (typeof document === "undefined") return;
    const btn = document.createElement("button");
    btn.className = "mic-btn";
    syncMicVoiceHud(btn, {
      state: "speaking",
      emotion: "thinking",
      level: 0.4,
      isEnglish: true,
      live: true,
    });
    expect(btn.dataset.micEmotion).toBe("thinking");
    expect(btn.dataset.micPulse).toBe("soft");
  });

  it("uses muted gray when mic is off and ChatGPT blue when live", () => {
    const idle = resolveMicButtonThemeForState("idle");
    const listening = resolveMicButtonThemeForState("listening");
    const speaking = resolveMicButtonThemeForState("speaking", { emotion: "happy" });
    expect(idle.sat).toBeLessThan(20);
    expect(idle.iconColor).toBe(MIC_BUTTON_CHATGPT_IDLE.iconColor);
    expect(listening.hue).toBe(MIC_BUTTON_CHATGPT_LIVE.hue);
    expect(listening.sat).toBeGreaterThan(60);
    expect(speaking.hue).toBeGreaterThanOrEqual(198);
    expect(speaking.hue).toBeLessThanOrEqual(228);
  });

  it("maps mic chrome to grey icon off and cloud orb on", () => {
    expect(micButtonVisualForState("idle")).toBe("icon");
    expect(micButtonVisualForState("disabled")).toBe("icon");
    expect(micButtonVisualForState("listening")).toBe("cloud");
    expect(micButtonVisualForState("speaking")).toBe("cloud");
  });

  it("sets data-mic-visual and grey icon color when idle", () => {
    if (typeof document === "undefined") return;
    const el = document.createElement("button");
    const ui = createCompanionMicButton(el);
    expect(el.dataset.micVisual).toBe("icon");
    expect(el.style.getPropertyValue("--mic-icon-color")).toContain("hsl(");
    expect(el.querySelector(".mic-btn__icon")).toBeTruthy();
    ui.setState("listening");
    expect(el.dataset.micVisual).toBe("cloud");
    expect(el.style.getPropertyValue("--mic-icon-color")).toBe("");
  });
});
