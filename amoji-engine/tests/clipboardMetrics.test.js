import { describe, expect, it, vi } from "vitest";
import {
  buildLabShareUrl,
  copyTextToClipboard,
} from "../engine/lab/clipboard.js";
import {
  createTurnMetricsRollup,
  exportTurnMetricsRollup,
} from "../engine/index.js";

describe("clipboard + metrics export", () => {
  it("buildLabShareUrl merges query prefs", () => {
    const url = buildLabShareUrl({
      href: "http://127.0.0.1:5173/prototypes/realtime-voice-lab.html?old=1",
      workerUrl: "http://127.0.0.1:7890",
      faceUrl: "ws://127.0.0.1:8765",
      lang: "yue",
      vad: "high",
    });
    expect(url).toContain("worker=http%3A%2F%2F127.0.0.1%3A7890");
    expect(url).toContain("face=ws%3A%2F%2F127.0.0.1%3A8765");
    expect(url).toContain("lang=yue");
    expect(url).toContain("vad=high");
  });

  it("copyTextToClipboard uses clipboard.writeText when present", async () => {
    const writeText = vi.fn(async () => {});
    const result = await copyTextToClipboard("hello", {
      clipboard: { writeText },
    });
    expect(result.ok).toBe(true);
    expect(result.method).toBe("clipboard");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("exportTurnMetricsRollup builds JSON without download", () => {
    const rollup = createTurnMetricsRollup();
    rollup.push({ asrMs: 10, robotMs: 20, ttsMs: 30, totalMs: 60 });
    const { json, payload, downloaded } = exportTurnMetricsRollup(rollup, {
      download: false,
      meta: { lab: "test" },
    });
    expect(downloaded).toBe(false);
    expect(payload.kind).toBe("amoji-turn-metrics-rollup");
    expect(payload.meta.lab).toBe("test");
    expect(payload.summary.count).toBe(1);
    expect(JSON.parse(json).samples).toHaveLength(1);
  });
});
