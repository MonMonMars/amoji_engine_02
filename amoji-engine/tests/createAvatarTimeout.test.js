import { describe, expect, it } from "vitest";
import {
  AVATAR_LOAD_TIMEOUT_MS,
  HIGH_POLY_AVATAR_LOAD_TIMEOUT_MS,
  resolveAvatarLoadTimeoutMs,
} from "../engine/companion/createAvatar.js";

describe("resolveAvatarLoadTimeoutMs", () => {
  it("allows extra time for high-poly roster picks like kizuna", () => {
    expect(resolveAvatarLoadTimeoutMs("kizuna")).toBe(
      HIGH_POLY_AVATAR_LOAD_TIMEOUT_MS,
    );
    expect(resolveAvatarLoadTimeoutMs("nova")).toBe(AVATAR_LOAD_TIMEOUT_MS);
  });

  it("honours explicit overrides", () => {
    expect(resolveAvatarLoadTimeoutMs("kizuna", 30_000)).toBe(30_000);
  });
});
