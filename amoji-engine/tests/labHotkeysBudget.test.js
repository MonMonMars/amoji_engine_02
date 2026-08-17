import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LATENCY_BUDGET,
  checkLatencyBudget,
  formatLatencyBudget,
  resolveLatencyBudget,
} from "../engine/lab/latencyBudget.js";
import { createLabHotkeys } from "../engine/lab/labHotkeys.js";

describe("latencyBudget", () => {
  it("passes when under defaults", () => {
    const result = checkLatencyBudget({
      asrMs: 100,
      robotMs: 50,
      ttsMs: 200,
      totalMs: 400,
    });
    expect(result.ok).toBe(true);
    expect(result.breaches).toHaveLength(0);
    expect(formatLatencyBudget(result)).toContain("budget ok");
  });

  it("reports breaches over budget", () => {
    const budget = resolveLatencyBudget({ totalMs: 100, asrMs: 50 });
    expect(budget.asrMs).toBe(50);
    expect(budget.totalMs).toBe(100);
    expect(budget.robotMs).toBe(DEFAULT_LATENCY_BUDGET.robotMs);

    const result = checkLatencyBudget(
      { asrMs: 80, robotMs: 10, ttsMs: 10, totalMs: 200 },
      budget,
    );
    expect(result.ok).toBe(false);
    expect(result.breaches.map((b) => b.key).sort()).toEqual(["asrMs", "totalMs"]);
    expect(formatLatencyBudget(result)).toMatch(/budget miss/);
  });
});

describe("labHotkeys", () => {
  it("binds Space / Esc / M / E without firing in text inputs", () => {
    const listeners = new Map();
    const target = {
      addEventListener(type, cb) {
        listeners.set(type, cb);
      },
      removeEventListener(type) {
        listeners.delete(type);
      },
    };
    const onPttPress = vi.fn();
    const onPttRelease = vi.fn();
    const onBarge = vi.fn();
    const onMuteToggle = vi.fn();
    const onExpressionCycle = vi.fn();

    const hotkeys = createLabHotkeys({
      target,
      onPttPress,
      onPttRelease,
      onBarge,
      onMuteToggle,
      onExpressionCycle,
    });
    expect(hotkeys.bind()).toBe(true);

    listeners.get("keydown")({
      code: "Space",
      key: " ",
      target: { tagName: "TEXTAREA" },
      preventDefault: vi.fn(),
    });
    expect(onPttPress).not.toHaveBeenCalled();

    const preventDefault = vi.fn();
    listeners.get("keydown")({
      code: "Space",
      key: " ",
      target: { tagName: "BODY" },
      preventDefault,
      repeat: false,
    });
    expect(onPttPress).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalled();

    listeners.get("keyup")({
      code: "Space",
      key: " ",
      preventDefault: vi.fn(),
    });
    expect(onPttRelease).toHaveBeenCalledTimes(1);

    listeners.get("keydown")({
      code: "Escape",
      key: "Escape",
      target: { tagName: "DIV" },
      preventDefault: vi.fn(),
    });
    expect(onBarge).toHaveBeenCalledTimes(1);

    listeners.get("keydown")({
      code: "KeyM",
      key: "m",
      target: { tagName: "DIV" },
      preventDefault: vi.fn(),
      repeat: false,
    });
    expect(onMuteToggle).toHaveBeenCalledTimes(1);

    listeners.get("keydown")({
      code: "KeyE",
      key: "e",
      target: { tagName: "DIV" },
      preventDefault: vi.fn(),
      repeat: false,
    });
    expect(onExpressionCycle).toHaveBeenCalledTimes(1);

    expect(hotkeys.unbind()).toBe(true);
    expect(listeners.size).toBe(0);
  });
});
