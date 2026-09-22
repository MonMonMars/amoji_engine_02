import { describe, expect, it } from "vitest";
import {
  auditPlantedLimbDualWrite,
  enforcePlantedLimbRotations,
  syncSkinnedLimbRawFromNormalized,
  writeHumanoidBoneRotation,
} from "../engine/companion/companionPlantedLimbLock.js";
import {
  VRM_ARM_REST_ROTATIONS,
  VRM_LEG_REST_ROTATIONS,
} from "../engine/companion/companionPoseLibrary.js";

describe("companionPlantedLimbLock", () => {
  it("does not dual-write raw leg bones (skirt skinning)", () => {
    const norm = {
      name: "leftUpperLeg",
      rotation: {
        x: 0,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const raw = {
      name: "leftUpperLeg",
      rotation: {
        x: 9,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const humanoid = {
      getNormalizedBoneNode: (n) => (n === "leftUpperLeg" ? norm : null),
      getRawBoneNode: (n) => (n === "leftUpperLeg" ? raw : null),
      update: () => {},
    };
    writeHumanoidBoneRotation(humanoid, "leftUpperLeg", { x: 0.2, y: 0, z: 0 });
    expect(norm.rotation.x).toBe(0.2);
    expect(raw.rotation.x).toBe(9);
  });

  it("writes normalized and raw bone nodes for arms", () => {
    const norm = {
      name: "leftUpperArm",
      rotation: {
        x: 0,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const raw = {
      name: "leftUpperArm",
      rotation: {
        x: 9,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const humanoid = {
      getNormalizedBoneNode: (n) => (n === "leftUpperArm" ? norm : null),
      getRawBoneNode: (n) => (n === "leftUpperArm" ? raw : null),
      update: () => {},
    };
    writeHumanoidBoneRotation(humanoid, "leftUpperArm", { x: 0.2, y: 0, z: 0 });
    expect(norm.rotation.x).toBe(0.2);
    expect(raw.rotation.x).toBe(0.2);
  });

  it("enforcePlantedLimbRotations resets leg bones", () => {
    const bones = new Map();
    for (const name of [
      "leftUpperLeg",
      "rightUpperLeg",
      "leftLowerLeg",
      "rightLowerLeg",
      "leftFoot",
      "rightFoot",
      "leftUpperArm",
      "rightUpperArm",
      "leftShoulder",
      "rightShoulder",
    ]) {
      bones.set(name, {
        name,
        rotation: { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
      });
    }
    const humanoid = {
      getNormalizedBoneNode: (n) => bones.get(n) || null,
      getRawBoneNode: () => null,
      update: () => {},
    };
    enforcePlantedLimbRotations(humanoid, {
      legRestRotations: VRM_LEG_REST_ROTATIONS,
      armRestRotations: VRM_ARM_REST_ROTATIONS,
    });
    expect(bones.get("leftUpperLeg").rotation.x).toBe(
      VRM_LEG_REST_ROTATIONS.leftUpperLeg.x,
    );
    expect(bones.get("leftUpperArm").rotation.z).toBe(
      VRM_ARM_REST_ROTATIONS.leftUpperArm.z,
    );
    expect(bones.get("leftShoulder").rotation.z).toBe(0);
  });

  it("syncSkinnedLimbRawFromNormalized copies normalized leg euler to raw (skirt weights)", () => {
    const norm = {
      name: "leftUpperLeg",
      rotation: {
        x: 0.05,
        y: 0,
        z: 0.01,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const raw = {
      name: "leftUpperLeg",
      rotation: {
        x: 2,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const humanoid = {
      getNormalizedBoneNode: (n) => (n === "leftUpperLeg" ? norm : null),
      getRawBoneNode: (n) => (n === "leftUpperLeg" ? raw : null),
      update: () => {},
    };
    syncSkinnedLimbRawFromNormalized(humanoid);
    expect(raw.rotation.x).toBeCloseTo(0.05, 5);
    expect(raw.rotation.z).toBeCloseTo(0.01, 5);
  });

  it("syncSkinnedLimbRawFromNormalized copies normalized arm euler to raw", () => {
    const norm = {
      name: "leftUpperArm",
      rotation: {
        x: 0.11,
        y: 0.02,
        z: -0.44,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const raw = {
      name: "leftUpperArm",
      rotation: {
        x: 9,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const humanoid = {
      getNormalizedBoneNode: (n) => (n === "leftUpperArm" ? norm : null),
      getRawBoneNode: (n) => (n === "leftUpperArm" ? raw : null),
      update: () => {},
    };
    syncSkinnedLimbRawFromNormalized(humanoid);
    expect(raw.rotation.x).toBeCloseTo(0.11, 5);
    expect(raw.rotation.z).toBeCloseTo(-0.44, 5);
    expect(auditPlantedLimbDualWrite(humanoid).ok).toBe(true);
  });

  it("writes forearm lock to normalized and raw nodes", () => {
    const norm = {
      name: "leftLowerArm",
      rotation: {
        x: 0,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const raw = {
      name: "leftLowerArm",
      rotation: {
        x: 9,
        y: 0,
        z: 0,
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      },
    };
    const humanoid = {
      getNormalizedBoneNode: (n) => (n === "leftLowerArm" ? norm : null),
      getRawBoneNode: (n) => (n === "leftLowerArm" ? raw : null),
      update: () => {},
    };
    enforcePlantedLimbRotations(humanoid, {
      legRestRotations: VRM_LEG_REST_ROTATIONS,
      armRestRotations: VRM_ARM_REST_ROTATIONS,
      lockUpperArms: false,
      lockForearms: true,
    });
    expect(norm.rotation.x).toBe(VRM_ARM_REST_ROTATIONS.leftLowerArm.x);
    expect(raw.rotation.x).toBe(VRM_ARM_REST_ROTATIONS.leftLowerArm.x);
  });
});
