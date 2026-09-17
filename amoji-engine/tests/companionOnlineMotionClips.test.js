import { describe, expect, it } from "vitest";
import {
  enrichMotionWithClip,
  isOnlineIdleAction,
  isOnlineLoopingLibraryAction,
  ONLINE_IDLE_ACTION,
  ONLINE_IDLE_CLIP_FILE,
  ONLINE_MOTION_CLIP_FILES,
  PROCEDURAL_PREFERRED_ACTIONS,
  resolveOnlineMotionClipFile,
  resolveOnlineMotionClipUrl,
} from "../engine/companion/companionOnlineMotionClips.mjs";

describe("companionOnlineMotionClips", () => {
  it("maps idle and social gestures onto the hosted VRMA library", () => {
    expect(ONLINE_IDLE_ACTION).toBe("idle");
    expect(ONLINE_IDLE_CLIP_FILE).toBe("Relax");
    expect(ONLINE_MOTION_CLIP_FILES.idle).toBeUndefined();
    expect(ONLINE_MOTION_CLIP_FILES.relax).toBe("Relax");
    expect(ONLINE_MOTION_CLIP_FILES.wave).toBe("Goodbye");
    expect(ONLINE_MOTION_CLIP_FILES.thinking).toBe("Thinking");
    expect(ONLINE_MOTION_CLIP_FILES.dance).toBe("LookAround");
  });

  it("does not force social gestures onto procedural bone sway", () => {
    expect(PROCEDURAL_PREFERRED_ACTIONS.size).toBe(0);
    expect(resolveOnlineMotionClipUrl("wave")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("thinking")).toMatch(/Thinking\.vrma$/);
    expect(resolveOnlineMotionClipUrl("nod")).toBeNull();
  });

  it("resolves sampler inheritance for cloud extensions", () => {
    expect(resolveOnlineMotionClipFile("breakdance")).toBe("LookAround");
    expect(resolveOnlineMotionClipFile("highfive")).toBe("Goodbye");
    expect(resolveOnlineMotionClipFile("celebrate")).toBe("Clapping");
  });

  it("builds raw GitHub VRMA URLs for full-body clips", () => {
    const url = resolveOnlineMotionClipUrl("dance");
    expect(url).toContain("tk256ailab/vrm-viewer");
    expect(url).toMatch(/LookAround\.vrma$/);
    expect(resolveOnlineMotionClipUrl("jump")).toMatch(/Jump\.vrma$/);
  });

  it("enriches motion metadata for /api/motions", () => {
    const meta = enrichMotionWithClip("clap");
    expect(meta).toEqual({
      id: "clap",
      clipUrl: expect.stringContaining("Clapping.vrma"),
      clipFormat: "vrma",
    });
  });

  it("returns null clip for stop/none", () => {
    expect(resolveOnlineMotionClipUrl("stop")).toBeNull();
    expect(resolveOnlineMotionClipUrl("none")).toBeNull();
  });

  it("maps idle-life clips onto hosted VRMA without looping rest", () => {
    expect(resolveOnlineMotionClipUrl("wave")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("thinking")).toMatch(/Thinking\.vrma$/);
    expect(resolveOnlineMotionClipUrl("stretch")).toMatch(/Relax\.vrma$/);
    expect(resolveOnlineMotionClipUrl("nod")).toBeNull();
    expect(resolveOnlineMotionClipUrl("bow")).toBeNull();
    expect(resolveOnlineMotionClipUrl("shrug")).toBeNull();
    expect(resolveOnlineMotionClipUrl("peace")).toBeNull();
    expect(resolveOnlineMotionClipUrl("idle")).toBeNull();
  });

  it("keeps standing idle off Relax.vrma so rest is not an arms-up stretch", () => {
    expect(resolveOnlineMotionClipUrl("idle")).toBeNull();
    expect(resolveOnlineMotionClipUrl("relax")).toMatch(/Relax\.vrma$/);
    expect(isOnlineIdleAction("idle")).toBe(true);
    expect(isOnlineLoopingLibraryAction("idle")).toBe(false);
    expect(isOnlineLoopingLibraryAction("thinking")).toBe(true);
  });
});
