import { describe, expect, it } from "vitest";
import {
  LISTEN_PREF_SCHEMA,
  LISTEN_SENSITIVITY_PRESETS,
  listenPresetFor,
  nextListenSensitivity,
  normalizeListenSensitivity,
  persistListenPref,
  resolveListenPref,
} from "../engine/lab/listenPref.js";

describe("listenPref", () => {
  it("normalizes and cycles sensitivity", () => {
    expect(normalizeListenSensitivity("quiet")).toBe("high");
    expect(normalizeListenSensitivity("noisy")).toBe("low");
    expect(nextListenSensitivity("high")).toBe("normal");
    expect(nextListenSensitivity("low")).toBe("high");
    expect(listenPresetFor("low").energyThreshold).toBeGreaterThan(
      LISTEN_SENSITIVITY_PRESETS.high.energyThreshold,
    );
  });

  it("resolves from query over storage", () => {
    const memory = new Map([["amoji.listenPref", "low"]]);
    const storage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
    };
    const pref = resolveListenPref({
      search: "?vad=high",
      storage,
      env: {},
    });
    expect(pref.schema).toBe(LISTEN_PREF_SCHEMA);
    expect(pref.sensitivity).toBe("high");
    expect(pref.source).toBe("query");
    expect(pref.vad.energyThreshold).toBe(
      LISTEN_SENSITIVITY_PRESETS.high.energyThreshold,
    );
    expect(memory.get("amoji.listenPref")).toBe("high");

    const persisted = persistListenPref("low", { storage });
    expect(persisted.sensitivity).toBe("low");
    expect(memory.get("amoji.listenPref")).toBe("low");
  });
});
