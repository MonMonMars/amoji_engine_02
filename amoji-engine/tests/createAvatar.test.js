import { describe, expect, it } from "vitest";
import {
  AVATAR_LOAD_TIMEOUT_HIGH_POLY_MS,
  AVATAR_LOAD_TIMEOUT_MS,
  resolveAvatarLoadTimeoutMs,
  shouldSkipGltfFallback,
} from "../engine/companion/createAvatar.js";

describe("createAvatar load timeout", () => {
  it("allows extra time for high-poly roster picks (e.g. kizuna #2)", () => {
    expect(resolveAvatarLoadTimeoutMs("kizuna")).toBe(
      AVATAR_LOAD_TIMEOUT_HIGH_POLY_MS,
    );
    expect(resolveAvatarLoadTimeoutMs("nova")).toBe(AVATAR_LOAD_TIMEOUT_MS);
  });
});

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
