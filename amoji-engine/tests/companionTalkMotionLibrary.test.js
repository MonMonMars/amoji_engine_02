import { describe, expect, it } from "vitest";
import {
  isTalkBackgroundLibraryAction,
  isTalkLibraryLoopAction,
  resolveTalkGestureLibraryAction,
  resolveTalkLibraryAction,
  TALK_STYLE_LIBRARY_ACTIONS,
} from "../engine/companion/companionTalkMotionLibrary.mjs";
import { isOnlineLoopingLibraryAction } from "../engine/companion/companionOnlineMotionClips.mjs";

describe("companionTalkMotionLibrary", () => {
  it("maps talk styles to hosted VRMA actions", () => {
    expect(TALK_STYLE_LIBRARY_ACTIONS.explain).toBe("thinking");
    expect(TALK_STYLE_LIBRARY_ACTIONS.emphasize).toBe("wiggle");
    expect(TALK_STYLE_LIBRARY_ACTIONS.thinking).toBe("learning");
    expect(TALK_STYLE_LIBRARY_ACTIONS.listen).toBe("relax");
    expect(resolveTalkLibraryAction("soft", "neutral")).toBe("shy");
    expect(resolveTalkLibraryAction("explain", "happy")).toBe("thinking");
    expect(resolveTalkLibraryAction("listen", "neutral")).toBe("relax");
    expect(resolveTalkLibraryAction("nope", "sad")).toBe("relax");
  });

  it("flags loop-friendly talk library clips", () => {
    expect(isTalkLibraryLoopAction("thinking")).toBe(true);
    expect(isTalkLibraryLoopAction("learning")).toBe(true);
    expect(isTalkLibraryLoopAction("relax")).toBe(true);
    expect(isTalkLibraryLoopAction("wiggle")).toBe(true);
    expect(isTalkLibraryLoopAction("clap")).toBe(false);
    expect(isOnlineLoopingLibraryAction("wiggle")).toBe(true);
    expect(isOnlineLoopingLibraryAction("relax")).toBe(true);
    expect(isOnlineLoopingLibraryAction("wave")).toBe(false);
  });

  it("resolves gesture accents for nod and point", () => {
    expect(resolveTalkGestureLibraryAction("nod")).toBe("nod");
    expect(resolveTalkGestureLibraryAction("point")).toBe("point");
    expect(resolveTalkGestureLibraryAction("shrug")).toBe(null);
  });

  it("marks background talk tracks separately from one-shots", () => {
    expect(isTalkBackgroundLibraryAction("thinking")).toBe(true);
    expect(isTalkBackgroundLibraryAction("wave")).toBe(false);
    expect(isTalkBackgroundLibraryAction("clap")).toBe(false);
  });
});
