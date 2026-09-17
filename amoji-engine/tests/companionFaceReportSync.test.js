import { describe, expect, it } from "vitest";
import {
  readCompanionFaceDebug,
  syncCompanionFaceReport,
} from "../engine/companion/companionFaceReportSync.js";

describe("companionFaceReportSync", () => {
  it("publishes getFaceReport on window", () => {
    const avatar = {
      getFaceReport: () => ({
        triangleCount: 72691,
        hasVisemes: true,
      }),
      getFaceDebug: () => ({ mouthOpen: 0.5 }),
    };
    const report = syncCompanionFaceReport(avatar);
    expect(report?.triangleCount).toBe(72691);
    expect(globalThis.__amojiFaceReport?.hasVisemes).toBe(true);
    globalThis.__amojiFaceReport = undefined;
    globalThis.__amojiFaceProfile = undefined;
  });

  it("publishes face profile alongside face report", () => {
    const avatar = {
      getFaceReport: () => ({ triangleCount: 1000 }),
      getFaceProfile: () => ({ rigType: "arkit", morphScale: 1 }),
    };
    syncCompanionFaceReport(avatar);
    expect(globalThis.__amojiFaceProfile?.rigType).toBe("arkit");
    globalThis.__amojiFaceReport = undefined;
    globalThis.__amojiFaceProfile = undefined;
  });

  it("reads live face debug safely", () => {
    expect(readCompanionFaceDebug(null)).toBeNull();
    expect(readCompanionFaceDebug({ getFaceDebug: () => ({ talking: true }) })).toEqual({
      talking: true,
    });
  });
});
