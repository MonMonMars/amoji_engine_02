import { describe, expect, it, vi } from "vitest";
import {
  attachStartPickerModelPreload,
  MODEL_ENSURE_READY_CAP_HIGH_POLY_MS,
  normalizePickerProgressPct,
  PICKER_PREVIEW_PROGRESS_MAX,
  resolveModelEnsureReadyCapMs,
} from "../engine/companion/companionStartPickerPreload.js";
import {
  START_PICKER_PRELOAD_BAR_HTML,
} from "../engine/companion/companionCharacterPicker.js";

describe("companionStartPickerPreload", () => {
  it("normalizes ratio and percent progress values", () => {
    expect(normalizePickerProgressPct(0)).toBe(0);
    expect(normalizePickerProgressPct(0.42)).toBe(42);
    expect(normalizePickerProgressPct(67)).toBe(67);
  });

  it("includes a linear download bar in start picker markup", () => {
    expect(START_PICKER_PRELOAD_BAR_HTML).toContain("amoji-load-bar__track");
    expect(START_PICKER_PRELOAD_BAR_HTML).toContain("amoji-load-bar__fill");
    expect(START_PICKER_PRELOAD_BAR_HTML).toContain('role="progressbar"');
  });

  it("reports preview progress then chat-ready without blocking on model download", async () => {
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      async arrayBuffer() {
        return new TextEncoder().encode(`model:${url}`).buffer;
      },
    }));
    const updates = [];
    const picker = {
      element: { classList: { toggle: vi.fn() } },
      setPreloadProgress: (pct, label) => updates.push({ pct, label }),
      getSelectedId: () => "nova",
    };

    const job = attachStartPickerModelPreload(picker, {
      isEnglish: true,
      langCode: "en",
      chatFirst: true,
      fetchImpl,
    });
    await job.previewPromise;

    expect(updates.length).toBeGreaterThan(1);
    expect(updates[0].pct).toBeGreaterThanOrEqual(0);
    expect(updates.some((u) => u.pct > 0 && u.pct < 100)).toBe(true);
    expect(updates[updates.length - 1].pct).toBe(100);
    expect(updates[updates.length - 1].label).toMatch(/ready to chat/i);
    expect(
      updates.some((u) => u.pct <= PICKER_PREVIEW_PROGRESS_MAX && /roster/i.test(u.label || "")),
    ).toBe(true);
    expect(
      updates.some((u) => /downloading model/i.test(u.label || "")),
    ).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("uses a longer ensure cap for high-poly roster picks (Kizuna #2)", () => {
    expect(resolveModelEnsureReadyCapMs("kizuna")).toBe(
      MODEL_ENSURE_READY_CAP_HIGH_POLY_MS,
    );
    expect(resolveModelEnsureReadyCapMs("nova")).toBeLessThan(
      MODEL_ENSURE_READY_CAP_HIGH_POLY_MS,
    );
  });

  it("ensureModelReady does not block longer than the cap on slow downloads", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );
    const picker = {
      element: { classList: { toggle: vi.fn() } },
      setPreloadProgress: vi.fn(),
      getSelectedId: () => "kizuna",
    };
    const job = attachStartPickerModelPreload(picker, {
      isEnglish: true,
      langCode: "en",
      chatFirst: true,
      fetchImpl,
    });
    await job.previewPromise;

    const ready = job.ensureModelReady("kizuna");
    await vi.advanceTimersByTimeAsync(MODEL_ENSURE_READY_CAP_HIGH_POLY_MS);
    await expect(ready).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
