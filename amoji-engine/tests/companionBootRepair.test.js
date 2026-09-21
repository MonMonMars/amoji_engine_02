import { describe, expect, it, beforeEach } from "vitest";
import {
  ensureAtmosphereAnimeBackground,
  repairCompanionSessionBoot,
} from "../engine/companion/companionBootRepair.js";
import {
  SCENE_STORAGE_KEY,
  COMPANION_SCENE_PRESETS_SCHEMA,
} from "../engine/companion/companionScenePresets.js";
import { CHARACTER_STORAGE_KEY } from "../engine/companion/companionCharacterCatalog.js";

describe("companionBootRepair", () => {
  beforeEach(() => {
    globalThis.localStorage = {
      store: new Map(),
      getItem(k) {
        return this.store.get(k) ?? null;
      },
      setItem(k, v) {
        this.store.set(k, String(v));
      },
    };
  });

  it("repairs legacy character + flat scene storage", () => {
    localStorage.setItem(CHARACTER_STORAGE_KEY, "chad");
    localStorage.setItem(
      SCENE_STORAGE_KEY,
      JSON.stringify({ backgroundId: "minimal", schema: "old" }),
    );
    const el = { dataset: {}, style: {} };
    globalThis.document = { querySelector: () => el };
    globalThis.getComputedStyle = () => ({ backgroundImage: "none" });
    const report = repairCompanionSessionBoot();
    expect(report.characterId).toBe("lantern");
    expect(report.sceneId).toBe("cozy-room");
    expect(el.dataset.sceneBg).toBe("cozy-room");
    const saved = JSON.parse(localStorage.getItem(SCENE_STORAGE_KEY));
    expect(saved.schema).toBe(COMPANION_SCENE_PRESETS_SCHEMA);
  });

  it("inlines atmosphere art when computed background is empty", () => {
    const el = {
      dataset: {},
      style: {},
    };
    globalThis.getComputedStyle = () => ({ backgroundImage: "none" });
    ensureAtmosphereAnimeBackground(el, "rain-street");
    expect(el.dataset.sceneBg).toBe("rain-street");
    expect(String(el.style.backgroundImage)).toContain("rain-street");
  });
});
