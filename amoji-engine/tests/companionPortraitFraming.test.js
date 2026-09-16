import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  PORTRAIT_CAMERA_Z_SIGN,
  PORTRAIT_FOV,
  applyUpperBodyPortraitFrame,
  computeUpperBodyAnchor,
  portraitDistanceForHeight,
} from "../engine/companion/companionPortraitFraming.js";

describe("companionPortraitFraming", () => {
  it("frames standard VRM height at upper-body distance", () => {
    const dist = portraitDistanceForHeight(0.92);
    expect(dist).toBeGreaterThanOrEqual(1.12);
    expect(dist).toBeCloseTo(1.196, 2);
  });

  it("anchors on chest, not face", () => {
    const fitted = new THREE.Box3(
      new THREE.Vector3(-0.2, 0, -0.1),
      new THREE.Vector3(0.2, 1.6, 0.1),
    );
    const head = new THREE.Vector3(0, 1.55, 0.02);
    const anchor = computeUpperBodyAnchor(fitted, head);
    expect(anchor.y).toBeLessThan(1.45);
    expect(anchor.y).toBeGreaterThan(0.7);
  });

  it("uses a portrait fov that keeps shoulders in frame", () => {
    expect(PORTRAIT_FOV).toBeGreaterThanOrEqual(29);
    expect(PORTRAIT_FOV).toBeLessThanOrEqual(32);
  });

  it("places the camera on -Z so +Z-facing avatars show their front", () => {
    expect(PORTRAIT_CAMERA_Z_SIGN).toBe(-1);
    const camera = new THREE.PerspectiveCamera();
    const controls = { target: new THREE.Vector3(), update: () => {} };
    const anchor = new THREE.Vector3(0, 1.1, 0);
    applyUpperBodyPortraitFrame({
      camera,
      controls,
      anchor,
      fittedHeight: 0.92,
    });
    expect(camera.position.z).toBeLessThan(anchor.z);
  });
});
