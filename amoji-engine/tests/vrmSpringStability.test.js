import { describe, expect, it } from "vitest";
import { configureVrmSpringStability } from "../engine/companion/vrmSpringStability.js";

describe("vrmSpringStability", () => {
  it("tunes spring bone drag and gravity", () => {
    const joint = {
      settings: {
        dragForce: 0.2,
        gravityPower: 0,
        gravityDir: { set: (x, y, z) => {
          joint.settings.gravityDir.x = x;
          joint.settings.gravityDir.y = y;
          joint.settings.gravityDir.z = z;
        }, x: 0, y: 0, z: 0 },
      },
    };
    const result = configureVrmSpringStability({
      springBoneManager: {
        joints: [joint],
        setInitState: () => {},
      },
    });
    expect(result.ok).toBe(true);
    expect(joint.settings.dragForce).toBeGreaterThanOrEqual(0.82);
    expect(joint.settings.gravityPower).toBeGreaterThanOrEqual(0.14);
    expect(joint.settings.gravityDir.y).toBe(-1);
  });

  it("fails open without spring bones", () => {
    expect(configureVrmSpringStability(null).ok).toBe(false);
  });
});
