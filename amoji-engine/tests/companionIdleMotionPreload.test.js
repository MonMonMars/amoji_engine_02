import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  BOOT_IDLE_BODY_MOTION_IDS,
  BOOT_IDLE_VRMA_STEMS,
  BOOT_IDLE_WARM_CLIP_IDS,
  BOOT_TALK_WARM_CLIP_IDS,
  IDLE_LIFE_VRMA_STEMS,
  bootIdleVrmaUrls,
  getBootIdleMotionPreloadPromise,
  getPreloadedIdleVrmaBuffer,
  primeBootIdleBodyMotions,
  startBootIdleMotionPreload,
  uniqueVrmaStemsForActions,
  warmMotionClipBatch,
} from "../engine/companion/companionIdleMotionPreload.js";
import { IDLE_LIFE_CLIP_POOL } from "../engine/companion/companionActionChoreography.js";
import { ONLINE_CALM_IDLE_ACTION } from "../engine/companion/companionOnlineMotionClips.mjs";

describe("companionIdleMotionPreload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preloads full VRMA library and idle + talk warm clip ids", () => {
    expect(BOOT_IDLE_BODY_MOTION_IDS.length).toBeGreaterThanOrEqual(40);
    expect(BOOT_IDLE_WARM_CLIP_IDS.length).toBeGreaterThanOrEqual(50);
    expect(BOOT_TALK_WARM_CLIP_IDS.length).toBeGreaterThanOrEqual(10);
    expect(BOOT_IDLE_VRMA_STEMS.length).toBe(11);
    expect(bootIdleVrmaUrls()).toHaveLength(BOOT_IDLE_VRMA_STEMS.length);
    expect(IDLE_LIFE_VRMA_STEMS.length).toBeGreaterThanOrEqual(6);
    expect(uniqueVrmaStemsForActions(IDLE_LIFE_CLIP_POOL).length).toBeGreaterThanOrEqual(
      6,
    );
    expect(BOOT_IDLE_WARM_CLIP_IDS).toContain(ONLINE_CALM_IDLE_ACTION);
    expect(BOOT_IDLE_WARM_CLIP_IDS).toContain("wiggle");
    expect(BOOT_IDLE_WARM_CLIP_IDS).toContain("learning");
    expect(BOOT_TALK_WARM_CLIP_IDS).toContain("relax");
    for (const id of IDLE_LIFE_CLIP_POOL) {
      expect(BOOT_IDLE_WARM_CLIP_IDS).toContain(id);
    }
  });

  it("warms motion clips in batch via player hook", () => {
    const warmed = [];
    const batch = warmMotionClipBatch({
      warmClip: (id) => {
        warmed.push(id);
      },
    });
    expect(batch.ok).toBe(true);
    expect(batch.warmed).toBe(BOOT_IDLE_WARM_CLIP_IDS.length);
    expect(warmed.length).toBe(BOOT_IDLE_WARM_CLIP_IDS.length);
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
    expect(first.loaded).toBe(BOOT_IDLE_VRMA_STEMS.length);
    expect(second).toBe(await getBootIdleMotionPreloadPromise());
    expect(fetchImpl).toHaveBeenCalledTimes(BOOT_IDLE_VRMA_STEMS.length);
    expect(getPreloadedIdleVrmaBuffer(bootIdleVrmaUrls()[0])).toBe(bytes);
  });
});
