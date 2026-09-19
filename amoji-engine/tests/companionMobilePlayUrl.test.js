import { describe, expect, it } from "vitest";
import {
  buildMobileCompanionPlayPath,
  isVoiceOutputDisabled,
} from "../engine/mobile/companionMobilePlayUrl.js";

describe("companionMobilePlayUrl", () => {
  it("builds secretary embed with today tab", () => {
    const path = buildMobileCompanionPlayPath({
      lang: "en",
      role: "secretary",
      characterId: "nova",
      build: "test-build",
    });
    expect(path).toContain("role=secretary");
    expect(path).toContain("tab=today");
    expect(path).toContain("mobile=1");
    expect(path).toContain("pick=0");
    expect(path).toContain("build=test-build");
  });

  it("maps voiceEnabled false to voice=off", () => {
    const path = buildMobileCompanionPlayPath({ voiceEnabled: false });
    expect(path).toContain("voice=off");
  });

  it("detects disabled voice URL tokens", () => {
    expect(isVoiceOutputDisabled("off")).toBe(true);
    expect(isVoiceOutputDisabled("openai-coral")).toBe(false);
  });
});
