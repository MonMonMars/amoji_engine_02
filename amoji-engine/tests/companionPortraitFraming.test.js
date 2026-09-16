import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  PORTRAIT_FOV,
  computeUpperBodyAnchor,
  portraitDistanceForHeight,
} from "../engine/companion/companionPortraitFraming.js";

describe("companionPortraitFraming", () => {
  it("pulls camera back for standard VRM height", () => {
    const dist = portraitDistanceForHeight(0.92);
    expect(dist).toBeGreaterThanOrEqual(1.68);
    expect(dist).toBeCloseTo(0.92 * 1.95, 2);
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

  it("uses a slightly wide portrait fov", () => {
    expect(PORTRAIT_FOV).toBeGreaterThanOrEqual(36);
  });
});
