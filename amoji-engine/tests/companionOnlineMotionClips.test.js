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

  it("maps social gestures to hosted VRMA instead of procedural bone sway", () => {
    expect(PROCEDURAL_PREFERRED_ACTIONS.has("eat")).toBe(true);
    expect(PROCEDURAL_PREFERRED_ACTIONS.has("drink")).toBe(true);
    expect(resolveOnlineMotionClipUrl("wave")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("thinking")).toMatch(/Thinking\.vrma$/);
    expect(resolveOnlineMotionClipUrl("nod")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("bow")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("shrug")).toMatch(/Thinking\.vrma$/);
    expect(resolveOnlineMotionClipUrl("peace")).toMatch(/Blush\.vrma$/);
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
    expect(resolveOnlineMotionClipUrl("nod")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("bow")).toMatch(/Goodbye\.vrma$/);
    expect(resolveOnlineMotionClipUrl("shrug")).toMatch(/Thinking\.vrma$/);
    expect(resolveOnlineMotionClipUrl("peace")).toMatch(/Blush\.vrma$/);
    expect(resolveOnlineMotionClipUrl("idle")).toBeNull();
  });

  it("resolves every playable catalog action to a hosted clip", async () => {
    const { PLAYABLE_ACTIONS } = await import("../engine/companion/companionActionCatalog.js");
    for (const id of PLAYABLE_ACTIONS) {
      expect(resolveOnlineMotionClipUrl(id), id).toMatch(/\.vrma$/);
    }
  });

  it("loops calm idle and talk tracks from the hosted library", () => {
    expect(resolveOnlineMotionClipUrl("idle")).toBeNull();
    expect(resolveOnlineMotionClipUrl("relax")).toMatch(/Relax\.vrma$/);
    expect(isOnlineIdleAction("idle")).toBe(true);
    expect(isOnlineIdleAction("relax")).toBe(true);
    expect(isOnlineLoopingLibraryAction("relax")).toBe(true);
    expect(isOnlineLoopingLibraryAction("thinking")).toBe(true);
    expect(isOnlineLoopingLibraryAction("wiggle")).toBe(true);
    expect(isOnlineLoopingLibraryAction("point")).toBe(true);
    expect(isOnlineLoopingLibraryAction("wave")).toBe(false);
  });
});
