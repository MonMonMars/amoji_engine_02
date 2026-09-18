import { describe, expect, it } from "vitest";
import {
  buildUnifiedSessionPrompt,
  normalizeUnifiedEntryParams,
  resolveAppRole,
  resolveRoleDefaultCharacter,
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

  it("resolves role from url or storage default", () => {
    const storage = {
      getItem(key) {
        return key === "amoji.companionRole.v1" ? "boyfriend" : null;
      },
    };
    expect(resolveAppRole(new URLSearchParams("role=secretary"))).toBe("secretary");
    expect(resolveAppRole(new URLSearchParams(""), storage)).toBe("boyfriend");
  });

  it("uses role default character when none picked", () => {
    expect(resolveRoleDefaultCharacter("", "secretary", new URLSearchParams())).toBe(
      "kate",
    );
    expect(
      resolveRoleDefaultCharacter("nova", "girlfriend", new URLSearchParams()),
    ).toBe("nova");
  });

  it("orders roster with role picks first", () => {
    const roster = rosterCharactersForRole("en", "secretary");
    expect(roster[0]?.id).toBe("kate");
    expect(roster.some((c) => c.roleRecommended)).toBe(true);
    expect(roster.length).toBeGreaterThan(10);
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
