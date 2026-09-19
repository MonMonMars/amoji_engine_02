import { describe, expect, it } from "vitest";
import { resolveVrmLookAtAutoUpdate } from "../engine/companion/companionVrmLookAt.js";

describe("companionVrmLookAt", () => {
  it("keeps look-at on while talking or listening", () => {
    expect(resolveVrmLookAtAutoUpdate({ talking: true })).toBe(true);
    expect(resolveVrmLookAtAutoUpdate({ listening: true })).toBe(true);
  });

  it("turns look-at off during calm idle so procedural head sway shows", () => {
    expect(resolveVrmLookAtAutoUpdate({})).toBe(false);
    expect(
      resolveVrmLookAtAutoUpdate({
        talking: false,
        listening: false,
        thinking: false,
        activeMotion: null,
      }),
    ).toBe(false);
  });

  it("turns look-at off during scripted actions and thinking waits", () => {
    expect(resolveVrmLookAtAutoUpdate({ activeMotion: "wave" })).toBe(false);
    expect(resolveVrmLookAtAutoUpdate({ currentAction: "shrug" })).toBe(false);
    expect(resolveVrmLookAtAutoUpdate({ thinking: true })).toBe(false);
  });
});
