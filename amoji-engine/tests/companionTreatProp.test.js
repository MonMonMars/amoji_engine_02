import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  buildTreatBiteMesh,
  buildTreatPropMesh,
  createCompanionTreatProp,
} from "../engine/companion/companionTreatProp.js";

describe("companionTreatProp", () => {
  it("builds distinct prop meshes for snacks and drinks", () => {
    expect(buildTreatPropMesh("cake", "eat").children.length).toBeGreaterThan(1);
    expect(buildTreatPropMesh("bento", "eat").children.length).toBeGreaterThan(1);
    expect(buildTreatPropMesh("dumpling", "eat").children.length).toBeGreaterThan(0);
    expect(buildTreatPropMesh("milk-tea", "drink").children.length).toBeGreaterThan(1);
    expect(buildTreatBiteMesh("cookie").children.length).toBe(1);
  });

  it("parents a hand prop and mouth bite during chew peaks", () => {
    const hand = new THREE.Object3D();
    const head = new THREE.Object3D();
    const humanoid = {
      getNormalizedBoneNode(name) {
        if (name === "rightHand") return hand;
        if (name === "head") return head;
        return null;
      },
    };
    const prop = createCompanionTreatProp(humanoid);
    expect(prop.attach({ id: "cake", action: "eat" })).toBe(true);
    expect(prop.active).toBe(true);
    expect(hand.children.length).toBe(1);

    prop.update(0.2);
    expect(head.children.length).toBe(0);

    prop.update(0.82);
    expect(head.children.length).toBe(1);

    prop.detach();
    expect(prop.active).toBe(false);
    expect(hand.children.length).toBe(0);
    expect(head.children.length).toBe(0);
  });
});
