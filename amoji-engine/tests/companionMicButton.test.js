import { describe, expect, it } from "vitest";
import {
  companionMicButtonInnerHtml,
  resolveMicButtonTheme,
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

  it("falls back to neutral for unknown emotions", () => {
    const theme = resolveMicButtonTheme({ emotion: "mystery" });
    expect(theme.hue).toBe(EMOTION_MIC_THEME.neutral.hue);
  });

  it("renders mic layers without emoji", () => {
    const html = companionMicButtonInnerHtml();
    expect(html).toContain("mic-btn__wave");
    expect(html).toContain("mic-btn__icon");
    expect(html).not.toContain("🎤");
  });
});
