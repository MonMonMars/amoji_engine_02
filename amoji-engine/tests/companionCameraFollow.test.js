import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { applyOrbitFollowAnchor } from "../engine/companion/companionCameraFollow.js";

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
