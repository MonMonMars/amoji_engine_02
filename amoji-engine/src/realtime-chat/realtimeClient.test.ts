import { describe, expect, it } from "vitest";
import { base64ToInt16, int16ToBase64 } from "./realtimeClient.js";

describe("realtimeClient audio codec helpers", () => {
  it("round-trips PCM16 through base64", () => {
    const original = new Int16Array([0, 1000, -2000, 32767, -32768]);
    const encoded = int16ToBase64(original);
    const decoded = base64ToInt16(encoded);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("handles empty buffers", () => {
    const empty = new Int16Array(0);
    expect(base64ToInt16(int16ToBase64(empty)).length).toBe(0);
  });
});
