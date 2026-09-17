import { describe, expect, it } from "vitest";
import {
  countMeshTriangles,
  summarizeMorphTargets,
} from "../engine/companion/companionMeshStats.js";

describe("companionMeshStats", () => {
  it("counts indexed and non-indexed mesh triangles", () => {
    const indexed = {
      traverse(fn) {
        fn({
          geometry: {
            index: { count: 12 },
            attributes: { position: { count: 8 } },
          },
        });
      },
    };
    expect(countMeshTriangles(indexed)).toBe(4);

    const plain = {
      traverse(fn) {
        fn({ geometry: { attributes: { position: { count: 9 } } } });
      },
    };
    expect(countMeshTriangles(plain)).toBe(3);
  });

  it("summarizes morph target names", () => {
    const root = {
      traverse(fn) {
        fn({
          morphTargetDictionary: { jawOpen: 0, mouthSmile: 1 },
        });
        fn({
          morphTargetDictionary: { eyeBlinkLeft: 0 },
        });
      },
    };
    const summary = summarizeMorphTargets(root);
    expect(summary.morphTargetCount).toBe(3);
    expect(summary.morphNames).toContain("jawOpen");
  });
});
