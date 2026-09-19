import { describe, expect, it, vi } from "vitest";
import {
  clampLoadingPct,
  createSmoothProgressAnimator,
  LOADING_BAR_HTML,
} from "../engine/companion/companionLoadingUi.js";
import { startCharacterPreviewPreload } from "../engine/companion/companionCharacterPreload.js";

describe("companionLoadingUi", () => {
  it("clamps loading percent", () => {
    expect(clampLoadingPct(0.25)).toBe(25);
    expect(clampLoadingPct(88)).toBe(88);
    expect(clampLoadingPct(140)).toBe(100);
  });

  it("includes professional bar markup", () => {
    expect(LOADING_BAR_HTML).toContain("amoji-load-bar__fill");
    expect(LOADING_BAR_HTML).toContain("amoji-load-bar__shine");
    expect(LOADING_BAR_HTML).toContain('role="progressbar"');
  });

  it("animates display toward target", () => {
    const values = [];
    const animator = createSmoothProgressAnimator((pct) => values.push(pct), {
      minVisibleMs: 0,
      creepPerFrame: 0,
      lerp: 1,
    });
    animator.set(40);
    animator.flush();
    expect(values.at(-1)).toBe(40);
    animator.destroy();
  });
});

describe("companionCharacterPreload preview progress", () => {
  it("reports intermediate progress when models are skipped", async () => {
    const progress = [];
    const originalImage = globalThis.Image;
    class FakeImage {
      constructor() {
        this.decoding = "";
      }
      set src(_url) {
        queueMicrotask(() => this.onload?.());
      }
    }
    // @ts-expect-error test stub
    globalThis.Image = FakeImage;

    await startCharacterPreviewPreload({
      langCode: "en",
      onProgress: (ratio) => progress.push(Math.round(ratio * 100)),
    });

    globalThis.Image = originalImage;
    expect(progress.length).toBeGreaterThan(2);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(100);
    expect(progress.some((pct) => pct > 0 && pct < 100)).toBe(true);
  });
});
