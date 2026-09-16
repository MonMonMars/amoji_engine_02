import { describe, expect, it } from "vitest";
import { COMPANION_VOICE_PICKER_SCHEMA } from "../engine/companion/companionVoicePicker.js";

describe("companionVoicePicker", () => {
  it("exports stable schema id", () => {
    expect(COMPANION_VOICE_PICKER_SCHEMA).toBe("amoji.companionVoicePicker.v1");
  });
});
