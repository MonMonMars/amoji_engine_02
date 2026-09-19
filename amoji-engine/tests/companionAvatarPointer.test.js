import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  AVATAR_TAP_MOVE_PX,
  bindCompanionAvatarPointer,
  clientToNormalizedPointer,
  collectAvatarPokeMeshes,
} from "../engine/companion/companionAvatarPointer.js";

describe("companionAvatarPointer", () => {
  it("collects visible body meshes for poke hit tests", () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
    prop.userData.companionSkipPoke = true;
    root.add(body, prop);
    const meshes = collectAvatarPokeMeshes(root);
    expect(meshes).toHaveLength(1);
    expect(meshes[0]).toBe(body);
  });

  it("normalizes client coordinates against a rect", () => {
    const ndc = clientToNormalizedPointer(150, 120, {
      left: 100,
      top: 100,
      width: 200,
      height: 200,
      right: 300,
      bottom: 300,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    expect(ndc?.x).toBeCloseTo(-0.5);
    expect(ndc?.y).toBeCloseTo(0.8);
  });

  it("disables orbit controls on character pointerdown and pokes on tap", () => {
    if (typeof document === "undefined") return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.4));
    mesh.position.set(0, 1, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 2.4);
    camera.lookAt(0, 1.1, 0);

    const surface = document.createElement("div");
    const rectElement = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 600,
        right: 400,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    };
    const controls = { enabled: true };
    const onPoke = vi.fn();
    const pointer = bindCompanionAvatarPointer({
      surface,
      rectElement,
      camera,
      controls,
      getPokeMeshes: () => [mesh],
      onPoke,
      movePx: AVATAR_TAP_MOVE_PX,
    });

    surface.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 200,
        clientY: 220,
        button: 0,
        bubbles: true,
      }),
    );
    expect(controls.enabled).toBe(false);
    expect(pointer.isCharacterSession()).toBe(true);

    surface.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 200,
        clientY: 220,
        button: 0,
        bubbles: true,
      }),
    );
    expect(onPoke).toHaveBeenCalledTimes(1);
    expect(controls.enabled).toBe(true);
    pointer.destroy();
  });

  it("keeps orbit enabled when pointerdown misses the character", () => {
    if (typeof document === "undefined") return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4));
    mesh.position.set(0, 1, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 2.4);
    camera.lookAt(0, 1.1, 0);
    const surface = document.createElement("div");
    const controls = { enabled: true };
    const onPoke = vi.fn();
    const pointer = bindCompanionAvatarPointer({
      surface,
      rectElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 400,
          height: 600,
          right: 400,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }),
      },
      camera,
      controls,
      getPokeMeshes: () => [mesh],
      onPoke,
    });

    surface.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 20,
        clientY: 520,
        button: 0,
        bubbles: true,
      }),
    );
    expect(controls.enabled).toBe(true);
    expect(pointer.isCharacterSession()).toBe(false);
    surface.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 20,
        clientY: 520,
        button: 0,
        bubbles: true,
      }),
    );
    expect(onPoke).not.toHaveBeenCalled();
    pointer.destroy();
  });
});
