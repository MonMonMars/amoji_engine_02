import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  applyVrmOutfitTint,
  resolveOutfitId,
} from "../engine/companion/companionOutfitApply.js";

describe("companionOutfitApply", () => {
  it("resolves unknown outfit to default", () => {
    expect(resolveOutfitId("unknown")).toBe("default");
    expect(resolveOutfitId("casual")).toBe("casual");
  });

  it("stores and restores base material colors", () => {
    const mesh = {
      isMesh: true,
      name: "shirt",
      material: {
        color: new THREE.Color("#ff8844"),
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
        metalness: 0.1,
        roughness: 0.8,
        needsUpdate: false,
        userData: {},
      },
    };
    const root = {
      traverse(fn) {
        fn(mesh);
      },
    };

    applyVrmOutfitTint(root, "casual");
    expect(mesh.material.userData.outfitBaseColor).toBeTruthy();
    expect(mesh.material.needsUpdate).toBe(true);

    applyVrmOutfitTint(root, "default");
    expect(mesh.material.color.getHexString()).toBe("ff8844");
  });

  it("does not darken unnamed skin meshes with formal tint", () => {
    const mesh = {
      isMesh: true,
      name: "Mesh_12",
      material: {
        color: new THREE.Color("#f5c8b8"),
        emissive: new THREE.Color("#000000"),
        emissiveIntensity: 0,
        metalness: 0,
        roughness: 0.7,
        needsUpdate: false,
        userData: {},
      },
    };
    const root = { traverse(fn) { fn(mesh); } };
    applyVrmOutfitTint(root, "formal");
    expect(mesh.material.color.getHexString()).toBe("f5c8b8");
    expect(mesh.material.emissiveIntensity).toBe(0);
  });
});
