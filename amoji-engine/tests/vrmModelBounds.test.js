import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  computeVrmDisplayBounds,
  vrmDisplayHeight,
  resolveVrmFitHeight,
} from "../engine/companion/vrmModelBounds.js";

describe("vrmModelBounds", () => {
  it("ignores oversized stray meshes when fitting scale", () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.6, 0.25),
      new THREE.MeshBasicMaterial(),
    );
    body.position.y = 0.8;
    const junk = new THREE.Mesh(
      new THREE.BoxGeometry(50, 50, 50),
      new THREE.MeshBasicMaterial(),
    );
    root.add(body, junk);

    const full = new THREE.Box3().setFromObject(root);
    const display = computeVrmDisplayBounds(root);
    expect(full.getSize(new THREE.Vector3()).y).toBeGreaterThan(10);
    expect(vrmDisplayHeight(root)).toBeCloseTo(1.6, 1);
    expect(display.getSize(new THREE.Vector3()).y).toBeCloseTo(1.6, 1);
    expect(resolveVrmFitHeight(root, null)).toBeCloseTo(1.6, 1);
  });
});
