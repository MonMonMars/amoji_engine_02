import { describe, expect, it } from "vitest";
import {
  buildUnifiedSessionPrompt,
  normalizeUnifiedEntryParams,
  resolveAppRole,
  resolveSessionRoleFromCharacter,
  resolveRoleDefaultCharacter,
  rolePickBadge,
  applySessionRoleBadgeOverrides,
  pickerCopyForRole,
  rosterCharactersForPicker,
  rosterCharactersForRole,
} from "../engine/companion/companionUnifiedApp.js";

describe("companionUnifiedApp", () => {
  it("maps legacy lite entry to secretary role on full app", () => {
    const params = normalizeUnifiedEntryParams(
      new URLSearchParams("kind=lite&lang=en&tab=today"),
    );
    expect(params.get("role")).toBe("secretary");
    expect(params.get("kind")).toBeNull();
    expect(params.get("lite")).toBeNull();
    expect(params.get("tab")).toBe("today");
  });

  it("maps secretary tabs without explicit role", () => {
    for (const tab of ["today", "tasks", "me"]) {
      const params = normalizeUnifiedEntryParams(
        new URLSearchParams(`tab=${tab}&lang=en`),
      );
      expect(params.get("role")).toBe("secretary");
      expect(params.get("tab")).toBe(tab);
    }
  });

  it("injects LLM context database when characterId is provided", () => {
    const prompt = buildUnifiedSessionPrompt({
      characterPrompt: "You are Nova.",
      role: "girlfriend",
      isEnglish: true,
      characterId: "nova",
      langCode: "en",
      menuState: { companionName: "Nova" },
    });
    expect(prompt).toContain("LLM CONTEXT DATABASE");
    expect(prompt).toContain("USER MENU");
    expect(prompt).toContain("ACTIVE 3D CHARACTER");
  });

  it("returns localized role pick badges", () => {
    expect(rolePickBadge("secretary", true)).toContain("Secretary");
    expect(rolePickBadge("boyfriend", false)).toContain("男朋友");
  });

  it("resolves role from url or storage default", () => {
    const storage = {
      getItem(key) {
        return key === "amoji.companionRole.v1" ? "boyfriend" : null;
      },
    };
    expect(resolveAppRole(new URLSearchParams("role=secretary"))).toBe("secretary");
    expect(resolveAppRole(new URLSearchParams(""), storage)).toBe("boyfriend");
  });

  it("derives role from selected character when character param is explicit", () => {
    expect(
      resolveAppRole(
        new URLSearchParams("character=mio&role=girlfriend"),
        null,
        "mio",
      ),
    ).toBe("girlfriend");
    expect(
      resolveAppRole(new URLSearchParams("character=rex"), null, "rex"),
    ).toBe("boyfriend");
  });

  it("maps legacy ?character= ids to current roster for role default", () => {
    expect(
      resolveRoleDefaultCharacter(
        "chad",
        "boyfriend",
        new URLSearchParams("character=chad&lang=en"),
      ),
    ).toBe("lantern");
    expect(
      resolveRoleDefaultCharacter(
        "olivia",
        "girlfriend",
        new URLSearchParams("character=olivia&lang=en"),
      ),
    ).toBe("yuki");
  });

  it("honors secretary role for legacy kate alias and default nova", () => {
    expect(
      resolveAppRole(
        new URLSearchParams("character=kate&tab=today&lang=en"),
        null,
        "nova",
      ),
    ).toBe("secretary");
    expect(
      resolveAppRole(
        new URLSearchParams("character=nova&role=secretary&lang=en"),
        null,
        "nova",
      ),
    ).toBe("secretary");
  });

  it("honors ?role=secretary for the secretary default character id", () => {
    expect(
      resolveSessionRoleFromCharacter(
        "nova",
        new URLSearchParams("role=secretary&lang=en"),
      ),
    ).toBe("secretary");
    expect(
      resolveSessionRoleFromCharacter(
        "ember",
        new URLSearchParams("role=secretary&lang=en"),
      ),
    ).toBe("girlfriend");
  });

  it("uses role default character when none picked", () => {
    expect(resolveRoleDefaultCharacter("", "secretary", new URLSearchParams())).toBe(
      "nova",
    );
    expect(
      resolveRoleDefaultCharacter("nova", "girlfriend", new URLSearchParams()),
    ).toBe("nova");
  });

  it("overrides default character badge for secretary entry", () => {
    const roster = applySessionRoleBadgeOverrides(
      rosterCharactersForPicker("en"),
      "secretary",
      true,
    );
    const nova = roster.find((c) => c.id === "nova");
    expect(nova?.roleBadge).toBe("Secretary");
    expect(nova?.companionRole).toBe("secretary");
    expect(roster.find((c) => c.id === "kizuna")?.roleBadge).toBe("Girlfriend");
  });

  it("uses unified picker titles regardless of role param", () => {
    expect(pickerCopyForRole("secretary", true).title).toBe("Choose your companion");
    expect(pickerCopyForRole("boyfriend", false).title).toBe("揀你嘅同伴");
    expect(pickerCopyForRole("secretary", true).sub).toMatch(/personality/i);
  });

  it("lists roster with embedded function labels", () => {
    const roster = rosterCharactersForPicker("en");
    expect(roster.every((c) => c.companionRole && c.roleBadge)).toBe(true);
    expect(roster.some((c) => c.companionRole === "boyfriend")).toBe(true);
    expect(roster.length).toBeGreaterThanOrEqual(23);
    const secretaries = rosterCharactersForRole("en", "secretary");
    expect(secretaries.every((c) => c.companionRole === "secretary")).toBe(true);
  });

  it("merges character, role, and secretary prompts", () => {
    const prompt = buildUnifiedSessionPrompt({
      characterPrompt: "You are Nova.",
      role: "secretary",
      isEnglish: true,
      uiRules: "UI rules.",
      motionExtra: "",
      storage: null,
    });
    expect(prompt).toContain("You are Nova.");
    expect(prompt).toContain("AI secretary");
    expect(prompt).toContain("[task:");
    expect(prompt).toContain("UI rules.");
  });
});
