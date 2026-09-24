import { describe, expect, it } from "vitest";
import {
  migrateLegacyCharacterStorage,
  normalizeRosterCharacterId,
  CHARACTER_STORAGE_KEY,
} from "../engine/companion/companionCharacterCatalog.js";

describe("companionCharacterMigration", () => {
  it("maps retired roster ids to current characters", () => {
    expect(normalizeRosterCharacterId("chad")).toBe("kael");
    expect(normalizeRosterCharacterId("olivia")).toBe("yuki");
    expect(normalizeRosterCharacterId("rose")).toBe("mei");
    expect(normalizeRosterCharacterId("sakura")).toBe("shibu");
    expect(normalizeRosterCharacterId("sienna")).toBe("fumiriya");
  });

  it("rewrites legacy storage to keep user selection", () => {
    let saved = "chad";
    const storage = {
      getItem: (key) => (key === CHARACTER_STORAGE_KEY ? saved : null),
      setItem: (key, value) => {
        if (key === CHARACTER_STORAGE_KEY) saved = value;
      },
    };
    const next = migrateLegacyCharacterStorage(storage);
    expect(next).toBe("kael");
    expect(saved).toBe("kael");
  });
});
