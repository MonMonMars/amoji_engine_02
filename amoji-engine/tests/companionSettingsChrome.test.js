import { describe, expect, it } from "vitest";
import { buildSettingsChromeLabels } from "../engine/companion/companionSettingsChrome.js";

describe("companionSettingsChrome", () => {
  it("builds English settings labels", () => {
    const labels = buildSettingsChromeLabels(true, {
      companionName: "Nova",
      backgroundLabel: "Sunset",
      speed: 0.45,
      chatVisible: true,
      speakerOn: true,
    });
    expect(labels.menuTitle).toBe("Menu");
    expect(labels.chat).toBe("Chat: visible");
    expect(labels.companion).toBe("Companion: Nova");
    expect(labels.background).toBe("Background: Sunset");
    expect(labels.camera).toBe("Reset camera view");
    expect(labels.companionSection).toBe("Companion");
    expect(labels.talkSpeed).toMatch(/1\.6|1\.61/);
    expect(labels.rosterModelsHint).toMatch(/27/);
    expect(labels.rosterModelsHint).toMatch(/Mei|Atlas|VRoid/i);
    expect(labels.rosterDetailsSummary).toBe("View full 3D roster");
    expect(labels.modelLabel).toContain("LLM");
    expect(labels.roleHint).toMatch(/personality/i);
  });

  it("builds Cantonese settings labels", () => {
    const labels = buildSettingsChromeLabels(false, {
      chatVisible: false,
      speakerOn: false,
    });
    expect(labels.menuTitle).toBe("選單");
    expect(labels.chat).toBe("對話：收起");
    expect(labels.speaker).toBe("喇叭：關");
    expect(labels.camera).toBe("重置鏡頭視角");
  });
});
