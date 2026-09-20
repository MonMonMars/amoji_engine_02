import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  AVATAR_TAP_MOVE_PX,
  CHARACTER_MULTI_CLICK_MS,
  bindCompanionAvatarPointer,
  clientToNormalizedPointer,
  collectAvatarPokeMeshes,
  computeAvatarScreenBand,
  computePokeWaistWorldY,
  isClientInCharacterOrbitBand,
  isPokeHitAboveWaist,
  POKE_WAIST_HEIGHT_RATIO,
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
    expect(controls.enabled).toBe(true);
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

  it("maps lower screen band on avatar footprint to orbit", () => {
    const root = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.4));
    root.position.set(0, 1, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 2.4);
    camera.lookAt(0, 1.1, 0);
    camera.updateMatrixWorld(true);
    const rect = {
      left: 0,
      top: 0,
      width: 400,
      height: 600,
      right: 400,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    const band = computeAvatarScreenBand(root, camera, rect);
    expect(band?.height).toBeGreaterThan(40);
    expect(isClientInCharacterOrbitBand(band.bottom - 2, band)).toBe(true);
    expect(isClientInCharacterOrbitBand(band.top + 2, band)).toBe(false);
  });

  it("computes waist Y from avatar bounds", () => {
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 2, 1));
    expect(computePokeWaistWorldY(box)).toBeCloseTo(2 * POKE_WAIST_HEIGHT_RATIO);
    expect(isPokeHitAboveWaist({ point: new THREE.Vector3(0, 1.1, 0) }, 1)).toBe(true);
    expect(isPokeHitAboveWaist({ point: new THREE.Vector3(0, 0.8, 0) }, 1)).toBe(false);
  });

  it("pokes on full-body tap including lower mesh hits", () => {
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
    });

    surface.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 200,
        clientY: 520,
        button: 0,
        bubbles: true,
      }),
    );
    expect(controls.enabled).toBe(true);
    expect(pointer.isCharacterSession()).toBe(true);
    surface.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 200,
        clientY: 520,
        button: 0,
        bubbles: true,
      }),
    );
    expect(onPoke).toHaveBeenCalledTimes(1);
    pointer.destroy();
  });

  it("does not poke when the gesture is a drag", () => {
    if (typeof document === "undefined") return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.4));
    mesh.position.set(0, 1, 0);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 2.4);
    camera.lookAt(0, 1.1, 0);
    const surface = document.createElement("div");
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
      getPokeMeshes: () => [mesh],
      onPoke,
    });
    surface.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: 200,
        clientY: 220,
        button: 0,
        bubbles: true,
      }),
    );
    surface.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 240,
        clientY: 260,
        button: 0,
        bubbles: true,
      }),
    );
    surface.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: 240,
        clientY: 260,
        button: 0,
        bubbles: true,
      }),
    );
    expect(onPoke).not.toHaveBeenCalled();
    pointer.destroy();
  });

  it("pokes on character double-tap / multi-click within the window", () => {
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
    const onPoke = vi.fn();
    let now = 5000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const pointer = bindCompanionAvatarPointer({
      surface,
      rectElement,
      camera,
      getPokeMeshes: () => [mesh],
      onPoke,
      multiClickMs: CHARACTER_MULTI_CLICK_MS,
    });
    const tap = (x, y, advanceMs = 0) => {
      now += advanceMs;
      surface.dispatchEvent(
        new PointerEvent("pointerdown", {
          clientX: x,
          clientY: y,
          button: 0,
          bubbles: true,
        }),
      );
      surface.dispatchEvent(
        new PointerEvent("pointerup", {
          clientX: x,
          clientY: y,
          button: 0,
          bubbles: true,
        }),
      );
    };
    tap(200, 220, 0);
    tap(201, 221, 180);
    expect(onPoke).toHaveBeenCalledTimes(2);
    expect(onPoke.mock.calls[1][0].multiClick).toBe(true);
    pointer.destroy();
    vi.restoreAllMocks();
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
