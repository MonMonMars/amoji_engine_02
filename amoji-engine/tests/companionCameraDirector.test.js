import { describe, expect, it } from "vitest";
import {
  createCompanionCameraDirector,
  isFullBodyAction,
  wantsTalkCloseShot,
} from "../engine/companion/companionCameraDirector.js";
import { blendCameraShots, buildPortraitShot } from "../engine/companion/companionCameraApply.js";
import * as THREE from "three";

describe("companionCameraDirector", () => {
  it("classifies full-body vs upper-body actions", () => {
    expect(isFullBodyAction("dance")).toBe(true);
    expect(isFullBodyAction("kungfu")).toBe(true);
    expect(isFullBodyAction("wave")).toBe(false);
    expect(isFullBodyAction("nod")).toBe(false);
  });

  it("requests talk-close framing for long dialogue", () => {
    expect(wantsTalkCloseShot(2.9, 40)).toBe(false);
    expect(wantsTalkCloseShot(3.1, 40)).toBe(true);
    expect(wantsTalkCloseShot(1, 80)).toBe(true);
  });

  it("ramps talk-close blend while talking a long reply", () => {
    const director = createCompanionCameraDirector({
      longDialogueSec: 1,
      longDialogueChars: 20,
    });
    director.setTalking(true);
    director.notifySpeech("This is a longer spoken reply for the companion.");
    for (let i = 0; i < 30; i += 1) {
      director.update(0.1);
    }
    expect(director.talkCloseBlend).toBeGreaterThan(0.5);
    expect(director.fullBodyBlend).toBeLessThan(0.1);
  });

  it("prioritizes full-body framing during big moves", () => {
    const director = createCompanionCameraDirector();
    director.setTalking(true);
    director.notifySpeech("Let me show you a dance!");
    director.setCurrentAction("dance");
    for (let i = 0; i < 20; i += 1) {
      director.update(0.1);
    }
    expect(director.fullBodyBlend).toBeGreaterThan(0.7);
    expect(director.talkCloseBlend).toBeLessThan(0.3);
  });

  it("pauses auto framing while the user orbits", () => {
    const director = createCompanionCameraDirector();
    director.setUserOrbiting(true);
    const state = director.update(0.1);
    expect(state.autoActive).toBe(false);
  });
});

describe("companionCameraApply", () => {
  it("blends portrait toward full-body shot", () => {
    const anchor = new THREE.Vector3(0, 1.2, 0);
    const portrait = buildPortraitShot(anchor, 1.6, 34);
    const talkClose = buildPortraitShot(anchor, 1.2, 30);
    const fullBody = buildPortraitShot(anchor, 2.8, 48);
    const blended = blendCameraShots(portrait, talkClose, fullBody, {
      talkCloseBlend: 0,
      fullBodyBlend: 1,
    });
    expect(
      blended.position.distanceTo(anchor),
    ).toBeGreaterThan(portrait.position.distanceTo(anchor));
    expect(blended.fov).toBeGreaterThan(portrait.fov);
  });
});
