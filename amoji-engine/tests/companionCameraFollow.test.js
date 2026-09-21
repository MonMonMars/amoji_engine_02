import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyOrbitFollowAnchor,
  computeVrmFrameAnchor,
  smoothFrameAnchor,
} from "../engine/companion/companionCameraFollow.js";

describe("companionCameraFollow", () => {
  it("moves camera with orbit target to preserve framing", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.5, 3);
    const controls = {
      target: new THREE.Vector3(0, 1.2, 0),
    };
    const anchor = new THREE.Vector3(0.4, 1.3, -0.2);

    const moved = applyOrbitFollowAnchor(controls, camera, anchor);
    expect(moved).toBe(true);
    expect(controls.target.equals(anchor)).toBe(true);
    expect(camera.position.x).toBeCloseTo(0.4);
    expect(camera.position.y).toBeCloseTo(1.6);
    expect(camera.position.z).toBeCloseTo(2.8);
  });

  it("smooths anchor jitter over time", () => {
    const smoothed = new THREE.Vector3(0, 1, 0);
    const next = new THREE.Vector3(0.2, 1.1, 0.05);
    smoothFrameAnchor(smoothed, next, 1 / 60, 0.2);
    expect(smoothed.x).toBeGreaterThan(0);
    expect(smoothed.x).toBeLessThan(next.x);
    expect(smoothed.y).toBeGreaterThan(1);
    expect(smoothed.y).toBeLessThan(next.y);
  });

  it("computeVrmFrameAnchor blends neck toward chest for lower-neck pivot", () => {
    const model = new THREE.Object3D();
    const neck = new THREE.Object3D();
    neck.position.set(0, 1.42, 0);
    const chest = new THREE.Object3D();
    chest.position.set(0, 1.28, 0);
    model.add(neck);
    model.add(chest);
    model.updateMatrixWorld(true);

    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => {
          if (name === "neck") return neck;
          if (name === "upperChest") return chest;
          return null;
        },
      },
    };

    const anchor = computeVrmFrameAnchor(vrm, model);
    expect(anchor.y).toBeGreaterThan(1.28);
    expect(anchor.y).toBeLessThan(1.42);
    expect(anchor.y).toBeCloseTo(1.42 + (1.28 - 1.42) * 0.38, 3);
  });

  it("skips when anchor already matches target", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(1, 2, 3);
    const controls = { target: new THREE.Vector3(0.5, 1, 0) };
    const moved = applyOrbitFollowAnchor(
      controls,
      camera,
      new THREE.Vector3(0.5, 1, 0),
    );
    expect(moved).toBe(false);
    expect(camera.position.x).toBe(1);
  });
});
