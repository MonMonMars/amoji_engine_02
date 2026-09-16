import { describe, expect, it } from "vitest";
import {
  enrichMotionWithClip,
  ONLINE_MOTION_CLIP_FILES,
  PROCEDURAL_PREFERRED_ACTIONS,
  resolveOnlineMotionClipFile,
  resolveOnlineMotionClipUrl,
} from "../engine/companion/companionOnlineMotionClips.mjs";

describe("companionOnlineMotionClips", () => {
  it("maps common actions to hosted VRMA clip names", () => {
    expect(ONLINE_MOTION_CLIP_FILES.wave).toBe("Goodbye");
    expect(ONLINE_MOTION_CLIP_FILES.dance).toBe("Jump");
    expect(ONLINE_MOTION_CLIP_FILES.thinking).toBe("Thinking");
  });

  it("resolves sampler inheritance for cloud extensions", () => {
    expect(resolveOnlineMotionClipFile("breakdance")).toBe("Jump");
    expect(resolveOnlineMotionClipFile("highfive")).toBe("Goodbye");
  });

  it("builds raw GitHub VRMA URLs for full-body clips", () => {
    const url = resolveOnlineMotionClipUrl("dance");
    expect(url).toContain("tk256ailab/vrm-viewer");
    expect(url).toMatch(/Jump\.vrma$/);
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

  it("keeps subtle social gestures on procedural motion (arms return to rest)", () => {
    expect(PROCEDURAL_PREFERRED_ACTIONS.has("wave")).toBe(true);
    expect(resolveOnlineMotionClipUrl("wave")).toBeNull();
    expect(resolveOnlineMotionClipUrl("dance")).toContain("Jump.vrma");
  });
});
