import { describe, expect, it } from "vitest";
import {
  sampleIdlePresence,
  createIdlePresenceClock,
  presenceToFaceLiveParams,
} from "./idlePresence.js";

describe("idlePresence (TS)", () => {
  it("samples breath / look / blink over time", () => {
    const a = sampleIdlePresence(0.2);
    const b = sampleIdlePresence(1.4);
    expect(a.speechActive).toBe(false);
    expect(a.lookX).not.toBe(b.lookX);
    expect(a.schema).toBe("amoji.idlePresence.v1");
  });

  it("clock advances and maps to face params", () => {
    const clock = createIdlePresenceClock({ emotion: "thinking" });
    const sample = clock.step(0.1);
    expect(clock.timeSec).toBeGreaterThan(0);
    const params = presenceToFaceLiveParams(sample);
    expect(params.some((p) => p.id === "ParamAngleX")).toBe(true);
    expect(params.some((p) => p.id === "ParamEyeLOpen")).toBe(true);
  });
});
