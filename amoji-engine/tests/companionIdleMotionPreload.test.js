import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  BOOT_IDLE_BODY_MOTION_IDS,
  BOOT_IDLE_VRMA_STEMS,
  bootIdleVrmaUrls,
  getBootIdleMotionPreloadPromise,
  getPreloadedIdleVrmaBuffer,
  primeBootIdleBodyMotions,
  startBootIdleMotionPreload,
} from "../engine/companion/companionIdleMotionPreload.js";

describe("companionIdleMotionPreload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defines a small boot idle motion set", () => {
    expect(BOOT_IDLE_BODY_MOTION_IDS.length).toBeGreaterThanOrEqual(4);
    expect(BOOT_IDLE_VRMA_STEMS).toEqual(["Thinking", "Relax", "Goodbye"]);
    expect(bootIdleVrmaUrls()).toHaveLength(3);
  });

  it("primes procedural idle pose samplers synchronously", () => {
    const result = primeBootIdleBodyMotions();
    expect(result.ok).toBe(true);
    expect(result.warmed).toBe(BOOT_IDLE_BODY_MOTION_IDS.length);
  });

  it("preloads shared idle VRMA buffers once", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => bytes,
    }));

    const first = await startBootIdleMotionPreload({ fetchImpl });
    const second = await startBootIdleMotionPreload({ fetchImpl });

    expect(first.ok).toBe(true);
    expect(first.loaded).toBe(3);
    expect(second).toBe(await getBootIdleMotionPreloadPromise());
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(getPreloadedIdleVrmaBuffer(bootIdleVrmaUrls()[0])).toBe(bytes);
  });
});
