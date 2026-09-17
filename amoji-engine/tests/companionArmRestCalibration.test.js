import { describe, expect, it } from "vitest";
import { detectVrmArmBind, detectVrmArmRestRotations, detectVrmIdleRestRotations, detectVrmLegRestRotations } from "../engine/companion/companionArmRestCalibration.js";
import { VRM_APOSE_ARM_REST_ROTATIONS, VRM_ARM_REST_ROTATIONS } from "../engine/companion/companionPoseLibrary.js";

describe("companionArmRestCalibration", () => {
  it("keeps standard rest when flipped Z is higher", () => {
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          if (name === "leftHand") {
            return {
              getWorldPosition(v) {
                v.y = 0.5;
              },
            };
          }
          if (name === "rightHand") {
            return {
              getWorldPosition(v) {
                v.y = 0.5;
              },
            };
          }
          return { rotation: { x: 0, y: 0, z: 0 } };
        },
      },
      update() {},
    };
    expect(detectVrmArmRestRotations(vrm)).toEqual(VRM_ARM_REST_ROTATIONS);
  });

  it("uses flipped Z when it lowers hands further", () => {
    let pass = 0;
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          if (name === "leftHand" || name === "rightHand") {
            return {
              getWorldPosition(v) {
                pass += 1;
                v.y = pass <= 2 ? 0.98 : 0.47;
              },
            };
          }
          return { rotation: { x: 0, y: 0, z: 0 } };
        },
      },
      update() {},
    };
    const rest = detectVrmArmRestRotations(vrm);
    expect(rest.leftUpperArm.z).toBe(1.42);
    expect(rest.rightUpperArm.z).toBe(-1.42);
  });

  it("picks the elbow axis that shortens hand-to-upper-arm distance", () => {
    const bones = new Map();
    const makeBone = (name) => {
      if (!bones.has(name)) {
        bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
      }
      return bones.get(name);
    };
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          const bone = makeBone(name);
          if (name === "leftHand" || name === "rightHand") {
            return {
              ...bone,
              getWorldPosition(v) {
                const lower = name === "leftHand"
                  ? bones.get("leftLowerArm")
                  : bones.get("rightLowerArm");
                const flex = Math.abs(lower?.rotation.z || 0);
                v.set(name === "leftHand" ? 0.55 - flex * 0.4 : -0.55 + flex * 0.4, 1, 0);
              },
            };
          }
          if (name === "leftUpperArm" || name === "rightUpperArm") {
            return {
              ...bone,
              getWorldPosition(v) {
                v.set(0, 1.25, 0);
              },
            };
          }
          return bone;
        },
      },
      update() {},
    };
    const rest = detectVrmArmRestRotations(vrm);
    expect(rest.leftLowerArm.flexAxis).toBe("z");
    expect(Math.abs(rest.leftLowerArm.z)).toBeGreaterThan(0.5);
  });

  it("uses a small A-pose rest when hands already hang by the hips", () => {
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          const y = {
            leftHand: 0.82,
            rightHand: 0.82,
            leftUpperArm: 1.36,
            hips: 0.78,
          }[name];
          if (y != null) {
            return {
              rotation: { x: 0, y: 0, z: 0 },
              getWorldPosition(v) {
                v.set(0, y, 0);
              },
            };
          }
          return { rotation: { x: 0, y: 0, z: 0 } };
        },
      },
      update() {},
    };
    expect(detectVrmArmBind(vrm)).toBe("apose");
    const rest = detectVrmArmRestRotations(vrm);
    expect(Math.abs(rest.leftUpperArm.z)).toBeLessThan(0.5);
    expect(Math.abs(rest.rightUpperArm.z)).toBeLessThan(0.5);
    expect(rest.leftUpperArm.z).toBe(VRM_APOSE_ARM_REST_ROTATIONS.leftUpperArm.z);
  });

  it("picks the knee axis that shortens hip-to-foot distance", () => {
    const bones = new Map();
    const makeBone = (name) => {
      if (!bones.has(name)) {
        bones.set(name, { rotation: { x: 0, y: 0, z: 0 } });
      }
      return bones.get(name);
    };
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          const bone = makeBone(name);
          if (name === "leftFoot" || name === "rightFoot") {
            return {
              ...bone,
              getWorldPosition(v) {
                const lower = name === "leftFoot"
                  ? bones.get("leftLowerLeg")
                  : bones.get("rightLowerLeg");
                const flex = Math.abs(lower?.rotation.z || 0);
                v.set(0, 0.1 + flex * 0.35, 0.2 - flex * 0.3);
              },
            };
          }
          if (name === "leftUpperLeg" || name === "rightUpperLeg") {
            return {
              ...bone,
              getWorldPosition(v) {
                v.set(0, 0.9, 0);
              },
            };
          }
          return bone;
        },
      },
      update() {},
    };
    const legs = detectVrmLegRestRotations(vrm);
    expect(legs.leftLowerLeg.flexAxis).toBe("z");
    expect(Math.abs(legs.leftLowerLeg.z)).toBeGreaterThan(0.2);
    expect(Math.abs(legs.rightLowerLeg.z)).toBeGreaterThan(0.4);
  });

  it("returns combined idle rest with bind label", () => {
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          if (name === "leftHand" || name === "rightHand") {
            return {
              rotation: { x: 0, y: 0, z: 0 },
              getWorldPosition(v) {
                v.set(0.4, 1.28, 0);
              },
            };
          }
          if (name === "leftUpperArm") {
            return {
              rotation: { x: 0, y: 0, z: 0 },
              getWorldPosition(v) {
                v.set(0.2, 1.32, 0);
              },
            };
          }
          if (name === "hips") {
            return {
              rotation: { x: 0, y: 0, z: 0 },
              getWorldPosition(v) {
                v.set(0, 0.8, 0);
              },
            };
          }
          return { rotation: { x: 0, y: 0, z: 0 } };
        },
      },
      update() {},
    };
    const idle = detectVrmIdleRestRotations(vrm);
    expect(idle.bind).toBe("tpose");
    expect(Math.abs(idle.arms.leftUpperArm.z)).toBeGreaterThan(1);
    expect(idle.legs.rightLowerLeg).toBeTruthy();
  });
});
