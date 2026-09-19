import { describe, expect, it } from "vitest";
import {
  buildUnifiedSessionPrompt,
  normalizeUnifiedEntryParams,
  resolveAppRole,
  resolveRoleDefaultCharacter,
  rolePickBadge,
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

  it("uses role default character when none picked", () => {
    expect(resolveRoleDefaultCharacter("", "secretary", new URLSearchParams())).toBe(
      "nova",
    );
    expect(
      resolveRoleDefaultCharacter("nova", "girlfriend", new URLSearchParams()),
    ).toBe("nova");
  });

  it("lists roster with embedded function labels", () => {
    const roster = rosterCharactersForPicker("en");
    expect(roster.every((c) => c.companionRole && c.roleBadge)).toBe(true);
    expect(roster.some((c) => c.companionRole === "boyfriend")).toBe(true);
    expect(roster.length).toBe(10);
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
