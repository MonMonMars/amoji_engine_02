import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  auditVrmSkeletonDegrees,
  blendVrmBoneRotationsFromSnapshot,
  captureVrmBoneRotations,
  captureVrmBoneRotationsDegrees,
  createMotionTransitionState,
  DEFAULT_MOTION_CROSSFADE_SEC,
  libraryOwnsVrmBody,
  planMotionTransition,
  RAD_TO_DEG,
  resolveMotionCrossfadeSec,
  tickVrmMotionTransition,
  VRM_HUMANOID_ROTATION_BONES,
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

  it("captures degrees for debug and UI", () => {
    const bones = new Map([["head", makeBone(Math.PI / 2, 0, 0)]]);
    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const deg = captureVrmBoneRotationsDegrees(vrm, ["head"]);
    expect(deg.get("head").x).toBeCloseTo(90);
    expect(RAD_TO_DEG).toBeCloseTo(180 / Math.PI);
  });

  it("includes shoulders in humanoid rotation bone list", () => {
    expect(VRM_HUMANOID_ROTATION_BONES).toContain("leftShoulder");
    expect(VRM_HUMANOID_ROTATION_BONES).toContain("rightShoulder");
    expect(VRM_HUMANOID_ROTATION_BONES.length).toBeGreaterThan(50);
  });

  it("audits skeleton degrees for available bones", () => {
    const bones = new Map([
      ["head", makeBone(Math.PI / 4, 0, 0)],
      ["leftShoulder", makeBone(0, 0, 0.2)],
    ]);
    const vrm = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const audit = auditVrmSkeletonDegrees(vrm);
    expect(audit.boneCount).toBe(2);
    expect(audit.rows[0].x).toBeCloseTo(45);
  });

  it("uses longer crossfade for major motion family switches", () => {
    expect(resolveMotionCrossfadeSec("relax", "dance")).toBeGreaterThan(
      DEFAULT_MOTION_CROSSFADE_SEC,
    );
    expect(resolveMotionCrossfadeSec("thinking", "wiggle")).toBe(
      DEFAULT_MOTION_CROSSFADE_SEC,
    );
  });

  it("plans manual transition when idle or forceCapture from library", () => {
    const vrm = { humanoid: { getNormalizedBoneNode: () => null } };
    expect(
      planMotionTransition(vrm, { isPlaying: () => false, activeActionId: null }, {
        nextActionId: "relax",
      }),
    ).toBeNull();
    const bones = new Map([["head", makeBone(0.1, 0, 0)]]);
    const vrm2 = {
      humanoid: {
        getNormalizedBoneNode: (name) => bones.get(name) || null,
      },
    };
    const planned = planMotionTransition(
      vrm2,
      { isPlaying: () => false, activeActionId: null },
      { nextActionId: "relax" },
    );
    expect(planned?.from.size).toBe(1);
    expect(
      planMotionTransition(
        vrm2,
        { isPlaying: () => true, activeActionId: "thinking" },
        { nextActionId: "wiggle" },
      ),
    ).toBeNull();
    const exit = planMotionTransition(
      vrm2,
      { isPlaying: () => true, activeActionId: "wave" },
      { nextActionId: "eat", forceCapture: true },
    );
    expect(exit?.from.size).toBe(1);
  });

  it("libraryOwnsVrmBody covers pending and crossfade", () => {
    expect(libraryOwnsVrmBody(null, { isPlaying: () => true })).toBe(false);
    expect(libraryOwnsVrmBody("relax", { isPlaying: () => false }, true)).toBe(true);
    expect(
      libraryOwnsVrmBody("wave", {
        isPlaying: () => false,
        isCrossfading: () => true,
      }),
    ).toBe(true);
    expect(
      libraryOwnsVrmBody("relax", { isPlaying: () => true, isCrossfading: () => false }),
    ).toBe(true);
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
