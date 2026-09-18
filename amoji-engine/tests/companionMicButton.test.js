import { describe, expect, it } from "vitest";
import {
  companionMicButtonInnerHtml,
  createCompanionMicButton,
  MIC_BUTTON_CHATGPT_LIVE,
  resolveMicButtonTheme,
  resolveMicButtonThemeForState,
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

  it("uses muted gray when mic is off and ChatGPT blue when live", () => {
    const idle = resolveMicButtonThemeForState("idle");
    const listening = resolveMicButtonThemeForState("listening");
    const speaking = resolveMicButtonThemeForState("speaking", { emotion: "happy" });
    expect(idle.sat).toBeLessThan(20);
    expect(listening.hue).toBe(MIC_BUTTON_CHATGPT_LIVE.hue);
    expect(listening.sat).toBeGreaterThan(60);
    expect(speaking.hue).toBeGreaterThanOrEqual(198);
    expect(speaking.hue).toBeLessThanOrEqual(228);
  });
});
