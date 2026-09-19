import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyPortraitShot,
  resolveFrontPortraitFrame,
} from "../engine/companion/companionCameraApply.js";

describe("companionCameraApply portrait resolve", () => {
  it("faces +Z heads from the front-right camera side", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);

    const resolved = resolveFrontPortraitFrame({
      model,
      headBone: head,
      anchor: new THREE.Vector3(0, 1.05, 0),
      fittedHeight: 0.92,
    });

    expect(resolved.zSign).toBe(1);
    expect(resolved.score).toBeGreaterThan(0.2);
    expect(resolved.shot.position.z).toBeGreaterThan(0);
  });

  it("finds a front-facing camera when the head bone faces -Z", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = Math.PI;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);

    const resolved = resolveFrontPortraitFrame({
      model,
      headBone: head,
      anchor: new THREE.Vector3(0, 1.05, 0),
      fittedHeight: 0.92,
    });

    expect(resolved.score).toBeGreaterThan(0.2);
    expect(resolved.zSign === 1 || resolved.zSign === -1).toBe(true);
  });

  it("applyPortraitShot moves controls and camera together", () => {
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const controls = {
      target: new THREE.Vector3(),
      minDistance: 0,
      maxDistance: 0,
      update: () => {},
    };
    const shot = {
      target: new THREE.Vector3(0, 1.1, 0),
      position: new THREE.Vector3(0, 1.3, 2.2),
      fov: 34,
      distance: 1.6,
    };
    applyPortraitShot(controls, camera, shot, { portraitDist: 1.6 });
    expect(camera.position.z).toBeCloseTo(2.2);
    expect(controls.target.y).toBeCloseTo(1.1);
    expect(controls.minDistance).toBeCloseTo(0.88);
  });
});
