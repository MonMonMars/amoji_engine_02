import { describe, expect, it } from "vitest";
import {
  isCompanionAssistantSpeaking,
  resolveCompanionPokeTapMode,
} from "../engine/companion/companionPokeTapPolicy.js";

describe("companionPokeTapPolicy", () => {
  it("treats assistant output as speaking for poke", () => {
    expect(
      isCompanionAssistantSpeaking({
        voice: { speaking: false, assistantOutputActive: true },
        busy: false,
      }),
    ).toBe(true);
    expect(
      resolveCompanionPokeTapMode({
        voice: { speaking: true },
        busy: false,
      }),
    ).toBe("body-only");
  });

  it("allows full poke voice when idle", () => {
    expect(
      resolveCompanionPokeTapMode({
        voice: {
          speaking: false,
          assistantOutputActive: false,
          thinkingLoopOn: false,
        },
        busy: false,
      }),
    ).toBe("full");
  });

  it("blocks poke voice while busy or thinking loop", () => {
    expect(resolveCompanionPokeTapMode({ voice: {}, busy: true })).toBe(
      "body-only",
    );
    expect(
      resolveCompanionPokeTapMode({
        voice: { thinkingLoopOn: true },
        busy: false,
      }),
    ).toBe("body-only");
  });
});
