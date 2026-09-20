import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DEFAULT_MOTIONS_BASIC_URL,
  DEFAULT_VRM_URL,
  getPreloadedMotionBasicPromise,
  getPreloadedVrmPromise,
  startHeavyCompanionPreload,
  startMinimalCompanionPreload,
} from "../engine/companion/companionPreload.js";

describe("companionPreload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("minimal boot does not fetch VRM or motions", async () => {
    const fetchImpl = vi.fn();
    const boot = startMinimalCompanionPreload();
    expect(boot.mode).toBe("minimal");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("heavy boot starts parallel VRM and motion pack fetches", async () => {
    const vrmBytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes("companion-nova.vrm")) {
        return {
          ok: true,
          arrayBuffer: async () => vrmBytes,
        };
      }
      if (String(url).includes("pack=basic")) {
        return {
          ok: true,
          json: async () => ({ ok: true, pack: { id: "basic", version: 1 } }),
        };
      }
      throw new Error(`unexpected url ${url}`);
    });

    const boot = startHeavyCompanionPreload({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      DEFAULT_VRM_URL,
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      DEFAULT_MOTIONS_BASIC_URL,
      expect.objectContaining({ method: "GET" }),
    );

    const [vrm, motion] = await Promise.all([boot.vrm, boot.motionBasic]);
    expect(vrm).toBe(vrmBytes);
    expect(motion?.ok).toBe(true);
    expect(getPreloadedVrmPromise(DEFAULT_VRM_URL)).toBeTruthy();
    expect(getPreloadedMotionBasicPromise()).toBeTruthy();
  });
});
