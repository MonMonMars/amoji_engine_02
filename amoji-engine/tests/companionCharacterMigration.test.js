import { describe, expect, it } from "vitest";
import {
  AMOJI_MODEL_REVISION,
  RETIRED_VRM_BASENAMES,
  isRetiredModelUrl,
  stripLegacyModelSearchParams,
} from "../engine/companion/companionCharacterMigration.mjs";
import {
  LEGACY_CHARACTER_ALIASES,
  normalizeRosterCharacterId,
  persistCharacterId,
  resolveCharacterId,
} from "../engine/companion/companionCharacterCatalog.js";
import { modelFetchUrl } from "../engine/companion/companionModelAssets.mjs";

describe("companionCharacterMigration", () => {
  it("lists retired VRM basenames superseded by roster replacements", () => {
    expect(RETIRED_VRM_BASENAMES).toContain("companion-shiro.vrm");
    expect(RETIRED_VRM_BASENAMES).toContain("companion-chad.vrm");
    expect(isRetiredModelUrl("/prototypes/assets/companion-shiro.vrm")).toBe(true);
    expect(isRetiredModelUrl("/prototypes/assets/companion-chibi.vrm")).toBe(false);
  });

  it("maps legacy ids and retired model urls to current roster", () => {
    expect(normalizeRosterCharacterId("shiro")).toBe("nana");
    expect(normalizeRosterCharacterId("chad")).toBe("robert");
    expect(resolveCharacterId({ modelUrl: "/prototypes/assets/companion-shiro.vrm" })).toBe(
      "nana",
    );
    expect(LEGACY_CHARACTER_ALIASES.poly).toBe("lumi");
  });

  it("persists normalized roster ids only", () => {
    const storage = {
      data: {},
      setItem(k, v) {
        this.data[k] = v;
      },
      getItem(k) {
        return this.data[k] ?? null;
      },
    };
    persistCharacterId("shiro", storage);
    expect(storage.getItem("amoji.companion.characterId")).toBe("nana");
  });

  it("strips vrm deep-link params from URLs", () => {
    const url = new URL("https://example.com/play?character=nova&vrm=/old.vrm");
    const changed = stripLegacyModelSearchParams(url);
    expect(changed).toBe(true);
    expect(url.searchParams.get("vrm")).toBeNull();
    expect(url.searchParams.get("character")).toBe("nova");
  });

  it("cache-busts model fetch with roster revision", () => {
    const url = modelFetchUrl("/prototypes/assets/companion-nova.vrm", "build-x");
    expect(url).toContain(AMOJI_MODEL_REVISION);
  });
});
