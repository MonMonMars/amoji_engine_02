import { describe, expect, it } from "vitest";
import {
  buildBootChitchatReply,
  isBootChitchatPhase,
} from "../engine/companion/companionBootChitchat.mjs";

describe("isBootChitchatPhase", () => {
  it("is true while avatar is loading", () => {
    expect(isBootChitchatPhase({ avatarKind: "loading" })).toBe(true);
  });

  it("is false after VRM is ready", () => {
    expect(isBootChitchatPhase({ avatarKind: "vrm3d" })).toBe(false);
  });

  it("is false in lite mode", () => {
    expect(isBootChitchatPhase({ avatarKind: "loading", liteMode: true })).toBe(
      false,
    );
  });
});

describe("buildBootChitchatReply", () => {
  it("returns English hello while loading", () => {
    const reply = buildBootChitchatReply("hello", { isEnglish: true });
    expect(reply).toContain("[mood:happy]");
    expect(reply).toContain("loading");
  });

  it("returns Cantonese hello offline", () => {
    const reply = buildBootChitchatReply("你好", { isEnglish: false });
    expect(reply).toContain("[mood:happy]");
  });

  it("returns demo joke and bored replies in English", () => {
    expect(buildBootChitchatReply("tell me a joke", { isEnglish: true })).toMatch(
      /punchline/i,
    );
    expect(buildBootChitchatReply("I'm bored", { isEnglish: true })).toMatch(
      /story/i,
    );
  });
});
