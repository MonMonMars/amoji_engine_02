import { describe, expect, it } from "vitest";
import { detectVrmArmRestRotations } from "../engine/companion/companionArmRestCalibration.js";
import { VRM_ARM_REST_ROTATIONS } from "../engine/companion/companionPoseLibrary.js";

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
});
