import { describe, expect, it } from "vitest";
import {
  getExtendedActionDef,
  isBundledMotion,
  isMotionInstalled,
  loadMotionInstallState,
  markMotionInstalled,
  resolveMotionSamplerKey,
} from "../engine/companion/companionMotionLibrary.js";
import { resolveCloudAction } from "../engine/companion/motionPackData.mjs";

describe("companionMotionLibrary", () => {
  it("treats bundled motions as always installed", () => {
    const state = loadMotionInstallState();
    expect(isBundledMotion("wave")).toBe(true);
    expect(isMotionInstalled("wave", state)).toBe(true);
    expect(isMotionInstalled("nod", state)).toBe(true);
  });

  it("requires install record for catalog motions outside bundled set", () => {
    const state = loadMotionInstallState();
    expect(isMotionInstalled("dance", state)).toBe(false);
    markMotionInstalled("dance", state, { pack: "basic-v1" });
    expect(isMotionInstalled("dance", state)).toBe(true);
  });

  it("resolves cloud extension defs and sampler inheritance", () => {
    expect(resolveCloudAction("breakdance")).toBe("breakdance");
    expect(resolveCloudAction("霹靂舞")).toBe("breakdance");
    const def = getExtendedActionDef("breakdance");
    expect(def?.extends).toBe("dance");
    expect(resolveMotionSamplerKey("breakdance")).toBe("dance");
  });
});
