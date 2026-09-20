import { describe, expect, it, vi } from "vitest";
import {
  createEmptyAreaCameraReset,
  shouldResetCameraOnTalkStart,
} from "../engine/companion/companionCameraReset.js";

function pointer(x, y) {
  return { clientX: x, clientY: y };
}

describe("companionCameraReset", () => {
  it("resets on a second empty tap, not on a drag then tap", () => {
    const reset = vi.fn();
    const hitTest = vi.fn(() => false);
    const helper = createEmptyAreaCameraReset({
      hitTest,
      reset,
      now: (() => {
        let t = 1000;
        return () => {
          t += 80;
          return t;
        };
      })(),
    });

    helper.onPointerDown(pointer(20, 40));
    helper.onPointerMove(pointer(80, 90));
    expect(helper.onPointerUp(pointer(80, 90))).toBe(false);
    expect(reset).not.toHaveBeenCalled();

    helper.onPointerDown(pointer(22, 42));
    expect(helper.onPointerUp(pointer(22, 42))).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets on two empty taps in the double-click window", () => {
    const reset = vi.fn();
    let now = 2000;
    const helper = createEmptyAreaCameraReset({
      hitTest: () => false,
      reset,
      now: () => now,
    });
    helper.onPointerDown(pointer(10, 10));
    helper.onPointerUp(pointer(10, 10));
    now += 180;
    helper.onPointerDown(pointer(12, 11));
    expect(helper.onPointerUp(pointer(12, 11))).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not reset when the character is under the pointer", () => {
    const reset = vi.fn();
    const helper = createEmptyAreaCameraReset({
      hitTest: (x, y) => x > 100 && y > 100,
      reset,
      now: () => 3000,
    });
    helper.onPointerDown(pointer(140, 160));
    helper.onPointerUp(pointer(140, 160));
    helper.onPointerDown(pointer(142, 161));
    expect(helper.onPointerUp(pointer(142, 161))).toBe(false);
    expect(helper.onDblClick(pointer(142, 161))).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets on multi-click (detail >= 2) of empty space", () => {
    const reset = vi.fn();
    const helper = createEmptyAreaCameraReset({
      hitTest: () => false,
      reset,
    });
    helper.onPointerDown(pointer(8, 8));
    expect(
      helper.onClick({ clientX: 8, clientY: 8, detail: 2, button: 0 }),
    ).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not reset multi-click when the character is hit", () => {
    const reset = vi.fn();
    const helper = createEmptyAreaCameraReset({
      hitTest: (x) => x > 50,
      reset,
    });
    expect(
      helper.onClick({ clientX: 120, clientY: 120, detail: 3, button: 0 }),
    ).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });

  it("resets on dblclick of empty space", () => {
    const reset = vi.fn();
    const helper = createEmptyAreaCameraReset({
      hitTest: () => false,
      reset,
    });
    helper.onPointerDown(pointer(8, 8));
    expect(helper.onDblClick(pointer(8, 8))).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not toast twice when tap-pair and dblclick both fire", () => {
    const reset = vi.fn();
    let now = 5000;
    const helper = createEmptyAreaCameraReset({
      hitTest: () => false,
      reset,
      now: () => now,
    });
    helper.onPointerDown(pointer(10, 10));
    helper.onPointerUp(pointer(10, 10));
    now += 160;
    helper.onPointerDown(pointer(11, 10));
    expect(helper.onPointerUp(pointer(11, 10))).toBe(true);
    expect(helper.onDblClick(pointer(11, 10))).toBe(true);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("resets once when talking starts, not while already talking", () => {
    expect(shouldResetCameraOnTalkStart(true, false)).toBe(true);
    expect(shouldResetCameraOnTalkStart(true, true)).toBe(false);
    expect(shouldResetCameraOnTalkStart(false, false)).toBe(false);
    expect(shouldResetCameraOnTalkStart(false, true)).toBe(false);
  });
});
