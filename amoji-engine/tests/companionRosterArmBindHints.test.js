import { describe, expect, it } from "vitest";
import { rosterArmBindOverride } from "../engine/companion/companionRosterArmBindHints.mjs";
import {
  detectVrmArmRestRotations,
  detectVrmIdleRestRotations,
} from "../engine/companion/companionArmRestCalibration.js";
import { VRM_APOSE_ARM_REST_ROTATIONS } from "../engine/companion/companionPoseLibrary.js";

describe("companionRosterArmBindHints", () => {
  it("forces A-pose bind for roster #1 Nova and #3 Alicia", () => {
    expect(rosterArmBindOverride("nova")).toBe("apose");
    expect(rosterArmBindOverride("alicia")).toBe("apose");
    expect(rosterArmBindOverride("ember")).toBeNull();
  });

  it("uses A-pose upper-arm rest when characterId is nova even if mesh looks T-pose", () => {
    const vrm = {
      humanoid: {
        resetNormalizedPose() {},
        update() {},
        getNormalizedBoneNode(name) {
          const y = {
            leftHand: 0.5,
            rightHand: 0.5,
            leftUpperArm: 1.32,
            rightUpperArm: 1.32,
            hips: 0.78,
          }[name];
          if (y != null) {
            return {
              rotation: { x: 0, y: 0, z: 0 },
              getWorldPosition(v) {
                v.set(0.4, y, 0);
              },
            };
          }
          return { rotation: { x: 0, y: 0, z: 0 } };
        },
      },
      update() {},
    };
    const idle = detectVrmIdleRestRotations(vrm, { characterId: "nova" });
    expect(idle.bind).toBe("apose");
    expect(Math.abs(idle.arms.leftUpperArm.z)).toBeLessThan(0.25);
    expect(idle.arms.leftUpperArm.z).toBe(
      VRM_APOSE_ARM_REST_ROTATIONS.leftUpperArm.z,
    );
  });

  it("picks right upper-arm rest after left side is locked (independent sides)", () => {
    const bones = new Map();
    const bindPos = {
      leftHand: [0.42, 1.32, 0],
      rightHand: [-0.42, 1.32, 0],
      leftUpperArm: [0.2, 1.32, 0],
      rightUpperArm: [-0.2, 1.32, 0],
      hips: [0, 0.78, 0],
    };
    const vrm = {
      humanoid: {
        resetNormalizedPose() {
          for (const bone of bones.values()) {
            bone.rotation.x = 0;
            bone.rotation.y = 0;
            bone.rotation.z = 0;
          }
        },
        update() {},
        getNormalizedBoneNode(name) {
          if (!bones.has(name)) {
            bones.set(name, {
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
            });
          }
          const bone = bones.get(name);
          const pos = bindPos[name];
          if (!pos) return bone;
          return {
            ...bone,
            getWorldPosition(v) {
              if (name === "leftHand" || name === "rightHand") {
                const upperName =
                  name === "leftHand" ? "leftUpperArm" : "rightUpperArm";
                const upperZ = bones.get(upperName)?.rotation?.z || 0;
                const leftZ = bones.get("leftUpperArm")?.rotation?.z || 0;
                const rightZ = bones.get("rightUpperArm")?.rotation?.z || 0;
                const flippedPair = leftZ > 0 && rightZ < 0;
                const dropBoost =
                  Math.abs(upperZ) < 0.01
                    ? 0
                    : flippedPair
                      ? 0.52
                      : 0.28;
                v.set(pos[0], pos[1] - dropBoost, pos[2]);
                return;
              }
              v.set(pos[0], pos[1], pos[2]);
            },
          };
        },
      },
      update() {},
    };
    const rest = detectVrmArmRestRotations(vrm, { characterId: "ember" });
    expect(Math.abs(rest.leftUpperArm.z)).toBeGreaterThan(1);
    expect(Math.abs(rest.rightUpperArm.z)).toBeGreaterThan(1);
    expect(Math.sign(rest.leftUpperArm.z)).not.toBe(Math.sign(rest.rightUpperArm.z));
  });
});
