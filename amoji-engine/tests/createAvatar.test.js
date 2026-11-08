import { describe, expect, it } from "vitest";
import { shouldSkipGltfFallback } from "../engine/companion/createAvatar.js";

describe("createAvatar fallback", () => {
  it("does not swap a failed VRM character for companion-girl.glb", () => {
    expect(
      shouldSkipGltfFallback("/prototypes/assets/companion-nova.vrm", "vrm"),
    ).toBe(true);
    expect(
      shouldSkipGltfFallback("/prototypes/assets/companion-girl.glb", "gltf"),
    ).toBe(false);
    expect(shouldSkipGltfFallback(undefined, "vrm")).toBe(false);
    expect(
      shouldSkipGltfFallback("/prototypes/assets/companion-nova.vrm", "auto"),
    ).toBe(true);
  });
});
