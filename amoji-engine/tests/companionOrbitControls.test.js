import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bindOrbitControlSession,
  bindOrbitTouchGuard,
  configureCompanionOrbitControls,
  resolveOrbitDomElement,
} from "../engine/companion/companionOrbitControls.js";
import { ORBIT_MAX_POLAR, ORBIT_MIN_POLAR } from "../engine/companion/companionPortraitFraming.js";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/amoji-companion.html"),
  "utf8",
);

describe("companionOrbitControls", () => {
  it("prefers a dedicated controls element over the canvas", () => {
    const canvas = { style: { cursor: "" }, id: "avatar-canvas" };
    const hit = { style: { cursor: "" }, id: "orbit-hit" };
    expect(resolveOrbitDomElement({ canvas, controlsElement: hit })).toBe(hit);
    expect(hit.style.touchAction).toBe("none");
    expect(resolveOrbitDomElement({ canvas }).id).toBe("avatar-canvas");
  });

  it("enables yaw and pitch rotate for mouse and one-finger touch", () => {
    const controls = configureCompanionOrbitControls({
      enabled: false,
      enableDamping: false,
      mouseButtons: {},
      touches: {},
    });
    expect(controls.enabled).toBe(true);
    expect(controls.enableRotate).toBe(true);
    expect(controls.enableZoom).toBe(true);
    expect(controls.enablePan).toBe(true);
    expect(controls.minPolarAngle).toBe(ORBIT_MIN_POLAR);
    expect(controls.maxPolarAngle).toBe(ORBIT_MAX_POLAR);
    expect(controls.mouseButtons.LEFT).toBe(THREE.MOUSE.ROTATE);
    expect(controls.touches.ONE).toBe(THREE.TOUCH.ROTATE);
  });

  it("guards touchmove so iOS does not steal the orbit gesture", () => {
    const listeners = [];
    const el = {
      addEventListener(type, fn, opts) {
        listeners.push({ type, fn, opts });
      },
      removeEventListener(type, fn) {
        const idx = listeners.findIndex((row) => row.type === type && row.fn === fn);
        if (idx >= 0) listeners.splice(idx, 1);
      },
    };
    const unbind = bindOrbitTouchGuard(el);
    expect(listeners[0]?.type).toBe("touchmove");
    expect(listeners[0]?.opts?.passive).toBe(false);
    const event = { cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
    listeners[0].fn(event);
    expect(event.prevented).toBe(true);
    unbind();
    expect(listeners.length).toBe(0);
  });

  it("ships a full-stage orbit hit layer above the canvas", () => {
    expect(html).toContain('id="orbit-hit"');
    expect(html).toMatch(/\.orbit-hit\s*\{[^}]*z-index:\s*8;/);
    expect(html).toMatch(/\.orbit-hit\s*\{[^}]*pointer-events:\s*auto;/);
    expect(html).toMatch(/\.orbit-hit\s*\{[^}]*touch-action:\s*none;/);
    expect(html).toMatch(/\.orbit-hit\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.01\);/);
    expect(html).toContain("controlsElement: orbitHit");
    expect(html).toContain("createEmptyAreaCameraReset");
    expect(html).toContain("multi-click body to poke");
    expect(html).toContain("multi-click empty to reset");
    expect(html).not.toMatch(/\.chat-shell\s*\{[^}]*z-index:\s*6;/);
    expect(html).toMatch(/\.chat-shell\s*\{[^}]*z-index:\s*10050;/);
    expect(html).toMatch(/\.composer-wrap\s*\{[^}]*z-index:\s*3;/);
  });

  it("pauses auto-camera when OrbitControls starts a drag", () => {
    const listeners = new Map();
    const controls = {
      addEventListener(type, fn) {
        listeners.set(type, fn);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
    };
    let started = 0;
    let ended = 0;
    const unbind = bindOrbitControlSession(
      controls,
      () => {
        started += 1;
      },
      () => {
        ended += 1;
      },
    );
    listeners.get("start")();
    listeners.get("end")();
    expect(started).toBe(1);
    expect(ended).toBe(1);
    unbind();
    expect(listeners.size).toBe(0);
  });
});
