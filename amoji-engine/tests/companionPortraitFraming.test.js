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
  correctPortraitModelYaw,
  isHeadFacingCamera,
  portraitVisibleFacingScore,
  portraitModelYawOffset,
  portraitDistanceForHeight,
  resolveFaceForwardHorizontal,
  modelBodyFacingScore,
  isModelBodyFacingCamera,
  rosterCaptureVariantPickScore,
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

  it("anchors on the lower neck (below head bone), not the mouth or chest", () => {
    const fitted = new THREE.Box3(
      new THREE.Vector3(-0.2, 0, -0.1),
      new THREE.Vector3(0.2, 1.6, 0.1),
    );
    const head = new THREE.Vector3(0, 1.55, 0.02);
    const anchor = computeUpperBodyAnchor(fitted, head);
    expect(anchor.y).toBeGreaterThan(1.32);
    expect(anchor.y).toBeLessThan(1.44);
    expect(anchor.y).toBeLessThan(1.43);
    expect(anchor.x).toBeCloseTo(0, 5);
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

  it("resolveFaceForwardHorizontal aligns eye midpoint forward with head +Z", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = 0;
    const leftEye = new THREE.Object3D();
    leftEye.position.set(-0.03, 0.02, 0.08);
    const rightEye = new THREE.Object3D();
    rightEye.position.set(0.03, 0.02, 0.08);
    head.add(leftEye);
    head.add(rightEye);
    head.updateMatrixWorld(true);
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

  it("resolveFaceForwardHorizontal follows eye geometry without forcing head +Z", () => {
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    const leftEye = new THREE.Object3D();
    leftEye.position.set(-0.03, 0, -0.08);
    const rightEye = new THREE.Object3D();
    rightEye.position.set(0.03, 0, -0.08);
    head.add(leftEye);
    head.add(rightEye);
    head.updateMatrixWorld(true);
    const humanoid = {
      getNormalizedBoneNode: (name) => {
        if (name === "leftEye") return leftEye;
        if (name === "rightEye") return rightEye;
        return null;
      },
    };
    const forward = resolveFaceForwardHorizontal(head, humanoid, new THREE.Vector3());
    expect(forward?.z).toBeLessThan(-0.5);
  });

  it("modelBodyFacingScore detects when the root body points away from the camera", () => {
    const model = new THREE.Group();
    model.rotation.y = 0;
    model.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.1, 2);
    expect(modelBodyFacingScore(model, camera.position)).toBeGreaterThan(0.5);
    expect(isModelBodyFacingCamera(model, camera)).toBe(true);

    model.rotation.y = Math.PI;
    model.updateMatrixWorld(true);
    expect(modelBodyFacingScore(model, camera.position)).toBeLessThan(-0.5);
    expect(isModelBodyFacingCamera(model, camera)).toBe(false);
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

  it("correctPortraitModelYaw rotates the model when the face points away", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, -1.4);
    const before = model.rotation.y;
    expect(correctPortraitModelYaw(model, head, camera)).toBe(true);
    expect(model.rotation.y - before).toBeCloseTo(Math.PI, 3);
    expect(isModelBodyFacingCamera(model, camera)).toBe(true);
  });

  it("isHeadFacingCamera trusts root forward when head bone points backward", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = Math.PI;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, 2);
    expect(isModelBodyFacingCamera(model, camera)).toBe(true);
    expect(isHeadFacingCamera(head, camera, null, model)).toBe(true);
    expect(portraitVisibleFacingScore(head, camera.position, null, model)).toBeGreaterThan(
      0.2,
    );
  });

  it("portraitVisibleFacingScore rejects visible back when head forward opposes body (not head-bone π)", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.x = Math.PI;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const cameraPos = new THREE.Vector3(0, 1.18, 2);
    expect(modelBodyFacingScore(model, cameraPos)).toBeGreaterThan(0.3);
    expect(facingAlignmentScore(head, cameraPos)).toBeLessThan(-0.3);
    expect(portraitVisibleFacingScore(head, cameraPos, null, model)).toBeLessThan(0);
    expect(isHeadFacingCamera(head, { position: cameraPos }, null, model)).toBe(false);
  });

  it("portraitVisibleFacingScore prefers root forward when head bone is misleading", () => {
    const model = new THREE.Group();
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = Math.PI;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const cameraPos = new THREE.Vector3(0, 1.18, 2);
    const body = modelBodyFacingScore(model, cameraPos);
    const headOnly = facingAlignmentScore(head, cameraPos);
    expect(body).toBeGreaterThan(0.3);
    expect(headOnly).toBeLessThan(-0.3);
    expect(portraitVisibleFacingScore(head, cameraPos, null, model)).toBeGreaterThan(
      0.2,
    );
  });

  it("isHeadFacingCamera is false when the head points at camera but the torso faces away", () => {
    const model = new THREE.Group();
    model.rotation.y = Math.PI;
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    head.rotation.y = Math.PI;
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, 2);
    expect(modelBodyFacingScore(model, camera.position)).toBeLessThan(-0.5);
    expect(facingAlignmentScore(head, camera.position)).toBeGreaterThan(0.5);
    expect(isHeadFacingCamera(head, camera, null, model)).toBe(false);
    expect(correctPortraitModelYaw(model, head, camera)).toBe(true);
    expect(isModelBodyFacingCamera(model, camera)).toBe(true);
  });

  it("rosterCaptureVariantPickScore prefers inverted-body front for Yuki", () => {
    const front = rosterCaptureVariantPickScore(-0.95, 62, "yuki");
    const back = rosterCaptureVariantPickScore(0.95, 62, "yuki");
    expect(front).toBeGreaterThan(back);
    const aliciaFront = rosterCaptureVariantPickScore(0.9, 50, "alicia");
    const aliciaBack = rosterCaptureVariantPickScore(-0.9, 50, "alicia");
    expect(aliciaFront).toBeGreaterThan(aliciaBack);
  });

  it("correctPortraitModelYaw flips body yaw when the root faces away", () => {
    const model = new THREE.Group();
    model.rotation.y = Math.PI;
    const head = new THREE.Object3D();
    head.position.set(0, 1.1, 0);
    model.add(head);
    model.updateMatrixWorld(true);
    head.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.18, 2);
    expect(correctPortraitModelYaw(model, head, camera)).toBe(true);
    expect(isModelBodyFacingCamera(model, camera)).toBe(true);
    expect(Math.abs(model.rotation.y)).toBeLessThan(0.01);
  });
});
