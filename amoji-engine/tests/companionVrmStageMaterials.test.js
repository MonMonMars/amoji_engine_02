import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  aliciaMToonLightingForMeshName,
  applyAliciaLikeMToonStage,
  normalizeCompanionVrmStageMaterials,
  SENDAGAYA_CC0_STAGE_CHARACTER_IDS,
} from "../engine/companion/companionVrmStageMaterials.js";

function fakeMToonMaterial() {
  return {
    isMToonMaterial: true,
    visible: true,
    shadingToonyFactor: 0.35,
    shadingShiftFactor: -0.35,
    giEqualizationFactor: 0.85,
    matcapFactor: new THREE.Vector3(1, 1, 1),
    needsUpdate: false,
  };
}

describe("companionVrmStageMaterials", () => {
  it("lists Sendagaya roster slots 24–27", () => {
    expect([...SENDAGAYA_CC0_STAGE_CHARACTER_IDS].sort()).toEqual([
      "darkness_shibu",
      "fumiriya",
      "shibu",
      "shino",
    ]);
  });

  it("maps mesh name bands like Alicia flagship", () => {
    expect(aliciaMToonLightingForMeshName("F00_000_Hair_00_HAIR_01")).toEqual({
      shadingToonyFactor: 0.5,
      shadingShiftFactor: -0.5,
      matcapScale: 0.55,
    });
    expect(aliciaMToonLightingForMeshName("F00_000_00_Face_00_SKIN")).toEqual({
      shadingToonyFactor: 0.925,
      shadingShiftFactor: 0.425,
      matcapScale: 0.45,
    });
    expect(aliciaMToonLightingForMeshName("F00_001_01_Tops_01_CLOTH")).toEqual({
      shadingToonyFactor: 0.95,
      shadingShiftFactor: -0.05,
      matcapScale: 0.5,
    });
  });

  it("rewrites harsh Sendagaya MToon to Alicia targets", () => {
    const mat = fakeMToonMaterial();
    applyAliciaLikeMToonStage(mat, "F00_001_01_Body_00_SKIN");
    expect(mat.shadingToonyFactor).toBe(0.925);
    expect(mat.shadingShiftFactor).toBe(0.425);
    expect(mat.giEqualizationFactor).toBe(0.9);
    expect(mat.matcapFactor.x).toBeCloseTo(0.45);
  });

  it("applies Alicia MToon only for Sendagaya character ids", () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), fakeMToonMaterial());
    mesh.name = "F00_001_01_Tops_01_CLOTH";
    group.add(mesh);

    normalizeCompanionVrmStageMaterials(group, { characterId: "alicia" });
    expect(mesh.material.shadingToonyFactor).toBe(0.35);

    mesh.material = fakeMToonMaterial();
    normalizeCompanionVrmStageMaterials(group, { characterId: "shino" });
    expect(mesh.material.shadingToonyFactor).toBe(0.95);
  });
});
