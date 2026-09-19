import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  DARK_BG_LIGHT_EXPOSURE,
  INDOOR_LIGHT_EXPOSURE,
  rendererExposureForScene,
  syncCameraRelativeStageLights,
} from "../engine/companion/companionStageLighting.js";

describe("companionStageLighting", () => {
  it("boosts exposure on dark scene backgrounds", () => {
    expect(rendererExposureForScene("indoor", "minimal")).toBe(DARK_BG_LIGHT_EXPOSURE);
    expect(rendererExposureForScene("indoor", "studio")).toBe(INDOOR_LIGHT_EXPOSURE);
  });

  it("keeps key light on the camera side of the anchor", () => {
    const anchor = new THREE.Vector3(0, 1.1, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.3, 3.2);

    const key = new THREE.DirectionalLight(0xffffff, 1);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    const faceLight = new THREE.PointLight(0xffffff, 0.5, 6);

    syncCameraRelativeStageLights({
      camera,
      anchor,
      key,
      fill,
      rim,
      faceLight,
      portraitCameraZSign: 1,
    });

    const keyDir = key.position.clone().sub(anchor).normalize();
    const camDir = camera.position.clone().sub(anchor).normalize();
    expect(keyDir.dot(camDir)).toBeGreaterThan(0.35);
  });
});
