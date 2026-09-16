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
});
