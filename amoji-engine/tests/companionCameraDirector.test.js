import { describe, expect, it } from "vitest";
import {
  createCompanionCameraDirector,
  isFullBodyAction,
  wantsTalkCloseShot,
} from "../engine/companion/companionCameraDirector.js";
import {
  AUTO_CAMERA_LERP_RATE,
  blendCameraShots,
  buildPortraitShot,
  CAMERA_RESET_LERP_RATE,
  lerpCameraTowardShot,
} from "../engine/companion/companionCameraApply.js";
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

  it("suppresses talk-close zoom during boot grace", () => {
    const director = createCompanionCameraDirector({
      longDialogueSec: 0.5,
      longDialogueChars: 8,
      bootTalkCloseGraceSec: 2,
    });
    director.resetBootGrace(2);
    director.setTalking(true);
    director.notifySpeech("This greeting should stay in the default portrait framing.");
    for (let i = 0; i < 20; i += 1) {
      director.update(0.1);
    }
    expect(director.talkCloseBlend).toBeLessThan(0.05);
    for (let i = 0; i < 25; i += 1) {
      director.update(0.1);
    }
    expect(director.talkCloseBlend).toBeGreaterThan(0.4);
  });

  it("pauses auto framing while the user orbits", () => {
    const director = createCompanionCameraDirector();
    director.setUserOrbiting(true);
    const state = director.update(0.1);
    expect(state.autoActive).toBe(false);
  });

  it("keeps the user orbit angle after drag ends until reset", () => {
    const director = createCompanionCameraDirector();
    director.setUserOrbiting(true);
    director.setUserOrbiting(false);
    const held = director.update(0.1);
    expect(held.userFramingHeld).toBe(true);
    expect(held.autoActive).toBe(false);
    director.holdUserFraming(false);
    const reset = director.update(0.1);
    expect(reset.userFramingHeld).toBe(false);
    expect(reset.autoActive).toBe(false);
  });

  it("pauses auto framing on pointerdown before OrbitControls start", () => {
    const director = createCompanionCameraDirector();
    director.setUserOrbiting(true);
    const duringDrag = director.update(0.016);
    expect(duringDrag.autoActive).toBe(false);
    expect(duringDrag.userFramingHeld).toBe(true);
  });

  it("never auto-resets framing every frame", () => {
    const director = createCompanionCameraDirector();
    expect(director.update(0.016).autoActive).toBe(false);
    director.setTalking(true);
    director.notifySpeech("Hello there, this is a longer spoken reply.");
    for (let i = 0; i < 40; i += 1) director.update(0.1);
    expect(director.update(0.016).autoActive).toBe(false);
  });
});

describe("companionCameraApply", () => {
  it("uses a reset lerp rate 10× slower than auto follow", () => {
    expect(CAMERA_RESET_LERP_RATE).toBeCloseTo(AUTO_CAMERA_LERP_RATE / 10);
    expect(CAMERA_RESET_LERP_RATE).toBeCloseTo(0.42);
  });

  it("lerps camera toward portrait shot and finishes when close enough", () => {
    const anchor = new THREE.Vector3(0, 1.2, 0);
    const desired = buildPortraitShot(anchor, 1.6, 34);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(2.4, 0.6, -1.2);
    camera.fov = 48;
    camera.updateProjectionMatrix();
    const controls = {
      target: new THREE.Vector3(0.5, 0.4, 0.2),
      update: () => {},
    };
    const startPosDelta = camera.position.distanceTo(desired.position);

    let finished = false;
    for (let i = 0; i < 2400; i += 1) {
      finished = lerpCameraTowardShot(controls, camera, desired, 1 / 60);
      if (finished) break;
    }

    expect(finished).toBe(true);
    expect(camera.position.distanceTo(desired.position)).toBeLessThan(startPosDelta);
    expect(camera.position.distanceTo(desired.position)).toBeLessThan(0.004);
    expect(controls.target.distanceTo(desired.target)).toBeLessThan(0.004);
    expect(Math.abs(camera.fov - desired.fov)).toBeLessThan(0.08);
  });

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
