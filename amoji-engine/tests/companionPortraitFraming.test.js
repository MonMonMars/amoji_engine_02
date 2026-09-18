import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  ORBIT_MAX_POLAR,
  ORBIT_MIN_POLAR,
  PORTRAIT_CAMERA_Z_SIGN,
  PORTRAIT_FOV,
  applyUpperBodyPortraitFrame,
  applyUserOrbitLimits,
  computeUpperBodyAnchor,
  detectPortraitCameraZSign,
  facingAlignmentScore,
  isHeadFacingCamera,
  portraitModelYawOffset,
  portraitDistanceForHeight,
  resolveFaceForwardHorizontal,
} from "../engine/companion/companionPortraitFraming.js";

describe("companionPortraitFraming", () => {
  it("frames standard VRM height at upper-body distance", () => {
    const dist = portraitDistanceForHeight(0.92);
    expect(dist).toBeGreaterThanOrEqual(1.55);
    expect(dist).toBeCloseTo(1.674, 2);
  });

  it("pulls the default portrait camera back vs legacy close framing", () => {
    const height = 1.6;
    const newCameraZ = portraitDistanceForHeight(height) * 1.18;
    const legacyCameraZ = Math.max(1.12, height * 1.3) * 1.04;
    expect(newCameraZ / legacyCameraZ).toBeGreaterThan(1.15);
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
    expect(PORTRAIT_FOV).toBeGreaterThanOrEqual(32);
    expect(PORTRAIT_FOV).toBeLessThanOrEqual(36);
  });

  it("defaults camera Z sign to match three-vrm examples (+Z)", () => {
    expect(PORTRAIT_CAMERA_Z_SIGN).toBe(1);
    const camera = new THREE.PerspectiveCamera();
    const controls = { target: new THREE.Vector3(), update: () => {} };
    const anchor = new THREE.Vector3(0, 1.1, 0);
    applyUpperBodyPortraitFrame({
      camera,
      controls,
      anchor,
      fittedHeight: 0.92,
    });
    expect(camera.position.z).toBeGreaterThan(anchor.z);
    expect(controls.minPolarAngle).toBe(ORBIT_MIN_POLAR);
    expect(controls.maxPolarAngle).toBe(ORBIT_MAX_POLAR);
    expect(controls.maxPolarAngle - controls.minPolarAngle).toBeGreaterThan(2);
    expect(controls.enableRotate).toBe(true);
  });

  it("opens user orbit so pitch is not locked to a portrait sliver", () => {
    expect(ORBIT_MAX_POLAR - ORBIT_MIN_POLAR).toBeGreaterThan(2);
    const controls = applyUserOrbitLimits({
      target: new THREE.Vector3(),
      update: () => {},
    });
    expect(controls.minPolarAngle).toBeLessThan(0.3);
    expect(controls.maxPolarAngle).toBeGreaterThan(Math.PI * 0.8);
    expect(controls.enableRotate).toBe(true);
    expect(controls.enableZoom).toBe(true);
    expect(controls.enablePan).toBe(false);
  });

  it("detectPortraitCameraZSign picks the side in front of the face", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    head.updateMatrixWorld(true);
    const anchor = new THREE.Vector3(0, 1.1, 0);
    const dist = portraitDistanceForHeight(0.92);
    expect(detectPortraitCameraZSign(head, anchor, dist)).toBe(1);

    head.rotation.y = Math.PI;
    head.updateMatrixWorld(true);
    expect(detectPortraitCameraZSign(head, anchor, dist)).toBe(-1);
  });

  it("facingAlignmentScore is positive when the camera is in front of +Z heads", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, 1.3);
    expect(facingAlignmentScore(head, camera.position)).toBeGreaterThan(0.5);
  });

  it("resolveFaceForwardHorizontal prefers eye midpoint over head +Z", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    head.updateMatrixWorld(true);
    const leftEye = new THREE.Object3D();
    leftEye.position.set(-0.03, 1.12, 0.08);
    const rightEye = new THREE.Object3D();
    rightEye.position.set(0.03, 1.12, 0.08);
    leftEye.updateMatrixWorld(true);
    rightEye.updateMatrixWorld(true);
    const humanoid = {
      getNormalizedBoneNode: (name) => {
        if (name === "leftEye") return leftEye;
        if (name === "rightEye") return rightEye;
        return null;
      },
    };
    const forward = resolveFaceForwardHorizontal(head, humanoid, new THREE.Vector3());
    expect(forward?.z).toBeGreaterThan(0.9);
  });

  it("isHeadFacingCamera and portraitModelYawOffset agree on front vs back", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, 1.3);
    expect(isHeadFacingCamera(head, camera)).toBe(true);
    expect(portraitModelYawOffset(head, camera)).toBe(0);

    camera.position.set(0, 1.18, -1.3);
    expect(isHeadFacingCamera(head, camera)).toBe(false);
    expect(portraitModelYawOffset(head, camera)).toBe(Math.PI);
  });
});
