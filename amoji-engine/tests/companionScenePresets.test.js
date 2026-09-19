import { describe, expect, it, beforeEach } from "vitest";
import {
  applySceneBackground,
  applySceneOutfit,
  loadChatPanelVisible,
  loadStoredSceneBackground,
  loadStoredSceneOutfit,
  outfitPresetAvailableForCharacter,
  persistChatPanelVisible,
  persistSceneBackground,
  persistSceneOutfit,
  resolveSceneBackgroundId,
  resolveSceneEnvironment,
  isOutdoorSceneBackground,
  resolveSceneOutfitId,
  CHAT_PANEL_STORAGE_KEY,
  SCENE_OUTFIT_STORAGE_KEY,
  SCENE_STORAGE_KEY,
} from "../engine/companion/companionScenePresets.js";

function createStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    clear: () => {
      map.clear();
    },
  };
}

describe("companionScenePresets", () => {
  /** @type {ReturnType<typeof createStorage>} */
  let storage;

  beforeEach(() => {
    storage = createStorage();
    globalThis.localStorage = storage;
  });

  it("resolves unknown background to default", () => {
    expect(resolveSceneBackgroundId("unknown")).toBe("night-city");
    expect(resolveSceneBackgroundId("studio")).toBe("studio");
  });

  it("persists and loads background choice", () => {
    persistSceneBackground("sunset");
    const loaded = loadStoredSceneBackground(true);
    expect(loaded.id).toBe("sunset");
    expect(localStorage.getItem(SCENE_STORAGE_KEY)).toContain("sunset");
  });

  it("applies data attribute on atmosphere element", () => {
    const el = { dataset: {} };
    expect(applySceneBackground(el, "aurora")).toBe("aurora");
    expect(el.dataset.sceneBg).toBe("aurora");
    expect(el.dataset.sceneEnvironment).toBe("outdoor");
  });

  it("resolves indoor vs outdoor environments", () => {
    expect(resolveSceneEnvironment("studio")).toBe("indoor");
    expect(resolveSceneEnvironment("cozy-room")).toBe("indoor");
    expect(resolveSceneEnvironment("cafe")).toBe("indoor");
    expect(resolveSceneEnvironment("library")).toBe("indoor");
    expect(resolveSceneEnvironment("minimal")).toBe("indoor");
    expect(resolveSceneEnvironment("night-city")).toBe("outdoor");
    expect(resolveSceneEnvironment("rooftop")).toBe("outdoor");
    expect(resolveSceneEnvironment("park")).toBe("outdoor");
    expect(resolveSceneEnvironment("beach")).toBe("outdoor");
    expect(isOutdoorSceneBackground("sunset")).toBe(true);
    expect(isOutdoorSceneBackground("cafe")).toBe(false);
  });

  it("sets indoor environment on applySceneBackground", () => {
    const el = { dataset: {} };
    applySceneBackground(el, "library");
    expect(el.dataset.sceneBg).toBe("library");
    expect(el.dataset.sceneEnvironment).toBe("indoor");
  });

  it("persists chat panel visibility preference", () => {
    expect(loadChatPanelVisible()).toBe(true);
    persistChatPanelVisible(false);
    expect(loadChatPanelVisible()).toBe(false);
    expect(localStorage.getItem(CHAT_PANEL_STORAGE_KEY)).toBe("false");
    persistChatPanelVisible(true);
    expect(loadChatPanelVisible()).toBe(true);
  });

  it("resolves outfit presets per character", () => {
    expect(resolveSceneOutfitId("formal")).toBe("formal");
    expect(outfitPresetAvailableForCharacter({ characters: ["nova"] }, "nova")).toBe(
      true,
    );
    expect(outfitPresetAvailableForCharacter({ characters: ["nova"] }, "amoji")).toBe(
      false,
    );
    persistSceneOutfit("nova", "casual");
    expect(loadStoredSceneOutfit("nova")).toBe("casual");
    persistSceneOutfit("amoji", "formal");
    expect(loadStoredSceneOutfit("amoji")).toBe("formal");
    expect(localStorage.getItem(SCENE_OUTFIT_STORAGE_KEY)).toContain("casual");
    const stage = { dataset: {} };
    expect(applySceneOutfit(stage, "formal")).toBe("formal");
    expect(stage.dataset.sceneOutfit).toBe("formal");
  });
});
