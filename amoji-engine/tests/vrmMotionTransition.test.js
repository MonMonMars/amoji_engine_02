import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  blendVrmBoneRotationsFromSnapshot,
  captureVrmBoneRotations,
  createMotionTransitionState,
  DEFAULT_MOTION_CROSSFADE_SEC,
  tickVrmMotionTransition,
} from "../engine/companion/vrmMotionTransition.js";

function makeBone(x = 0, y = 0, z = 0) {
  const rotation = {
    x,
    y,
    z,
    order: "XYZ",
    quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "XYZ")),
    setFromQuaternion(q, order) {
      const e = new THREE.Euler().setFromQuaternion(q, order || "XYZ");
      this.x = e.x;
      this.y = e.y;
      this.z = e.z;
      this.quaternion.copy(q);
    },
  };
  return { rotation, quaternion: rotation.quaternion };
}

describe("vrmMotionTransition", () => {
  it("captures normalized bone rotations", () => {
    const bones = new Map([
      ["head", makeBone(0.1, 0.2, 0.3)],
      ["leftUpperArm", makeBone(0.4, 0, -1.2)],
    ]);
    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const snap = captureVrmBoneRotations(vrm, ["head", "leftUpperArm", "missing"]);
    expect(snap.size).toBe(2);
    expect(snap.get("head")).toEqual({
      x: 0.1,
      y: 0.2,
      z: 0.3,
      order: "XYZ",
    });
  });

  it("blends captured rotations toward the live mixer pose", () => {
    const bones = new Map([["head", makeBone(0.5, 0, 0)]]);
    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const from = captureVrmBoneRotations(vrm);
    bones.get("head").rotation.x = 0;
    blendVrmBoneRotationsFromSnapshot(vrm, from, 0.5);
    expect(Math.abs(bones.get("head").rotation.x)).toBeLessThan(0.5);
    expect(Math.abs(bones.get("head").rotation.x)).toBeGreaterThan(0);
  });

  it("ticks transition state to completion", () => {
    const bones = new Map([["head", makeBone(0.2, 0, 0)]]);
    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const state = createMotionTransitionState(
      captureVrmBoneRotations(vrm),
      DEFAULT_MOTION_CROSSFADE_SEC,
    );
    bones.get("head").rotation.x = 0;
    const mid = tickVrmMotionTransition(vrm, state, DEFAULT_MOTION_CROSSFADE_SEC * 0.4);
    expect(mid.done).toBe(false);
    expect(mid.state).not.toBeNull();
    const end = tickVrmMotionTransition(
      vrm,
      mid.state,
      DEFAULT_MOTION_CROSSFADE_SEC,
    );
    expect(end.done).toBe(true);
    expect(end.state).toBeNull();
  });
});
