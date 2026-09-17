import { describe, expect, it } from "vitest";
import {
  applyBlinkWeight,
  applyRestEyeOpen,
  applyRestEyeOpenMorphs,
  blinkPulseFinished,
  blinkWeightFromPhase,
  clampRestFaceBlend,
  guardLookAtLids,
  IDLE_HAPPY_MAX,
  inspectExpressionHazard,
  inspectVrmFaceHazards,
  mouthVisemeWeight,
  TALK_HAPPY_MAX,
  zeroAllExpressions,
  zeroHazardMorphInfluences,
  zeroLookLidExpressions,
} from "../engine/companion/companionFaceRest.js";

function mockExpr(entries) {
  const map = {};
  const values = {};
  for (const [name, spec] of Object.entries(entries)) {
    map[name] = spec;
    values[name] = spec.weight ?? 0;
  }
  return {
    expressionMap: { ...map },
    customExpressionMap: Object.fromEntries(
      Object.entries(map).filter(([name]) =>
        !["happy", "sad", "relaxed", "surprised", "angry", "blink", "blinkLeft", "blinkRight", "aa", "oh"].includes(name)
      ),
    ),
    blinkExpressionNames: ["blink", "blinkLeft", "blinkRight"],
    getExpression: (name) => map[name] || null,
    setValue: (name, weight) => {
      if (map[name]) values[name] = weight;
    },
    resetValues: () => {
      for (const name of Object.keys(values)) values[name] = 0;
    },
    values,
  };
}

describe("companionFaceRest", () => {
  it("closes visemes when not talking", () => {
    expect(mouthVisemeWeight(false, 0.9)).toBe(0);
    expect(mouthVisemeWeight(true, 0.01)).toBe(0);
    expect(mouthVisemeWeight(true, 0.6)).toBeCloseTo(0.6);
  });

  it("drops Happy and Relaxed so idle lids stay open and the jaw stays shut", () => {
    const clamped = clampRestFaceBlend(
      { Relaxed: 0.6, Happy: 0.98, Sad: 0.2 },
      { talking: false },
    );
    expect(clamped.Relaxed).toBeUndefined();
    expect(clamped.Happy).toBeUndefined();
    expect(IDLE_HAPPY_MAX).toBe(0);
    expect(clamped.Sad).toBeCloseTo(0.2);
  });

  it("caps Happy while talking so visemes can move the jaw", () => {
    const clamped = clampRestFaceBlend({ Happy: 0.98, Surprised: 0.48 }, {
      talking: true,
    });
    expect(clamped.Happy).toBeLessThanOrEqual(TALK_HAPPY_MAX);
    expect(clamped.Surprised).toBeLessThanOrEqual(0.28);
  });

  it("skips rest presets that bake an open jaw or closed lids", () => {
    const hazards = {
      opensMouth: new Set(["happy"]),
      closesEyes: new Set(["sad"]),
      binary: new Set(["surprised"]),
    };
    const clamped = clampRestFaceBlend(
      { Happy: 0.5, Sad: 0.8, Surprised: 0.4, Angry: 0.3 },
      { talking: false, hazards },
    );
    expect(clamped.Happy).toBeUndefined();
    expect(clamped.Sad).toBeUndefined();
    expect(clamped.Surprised).toBeUndefined();
    expect(clamped.Angry).toBeCloseTo(0.3);
  });

  it("skips talking Happy when that morph itself opens the mouth", () => {
    const hazards = {
      opensMouth: new Set(["happy"]),
      closesEyes: new Set(),
      binary: new Set(),
    };
    const clamped = clampRestFaceBlend({ Happy: 0.98 }, {
      talking: true,
      hazards,
    });
    expect(clamped.Happy).toBeUndefined();
  });

  it("reopens blink after a hitch that skips the old 80–160ms window", () => {
    expect(blinkWeightFromPhase(0.02)).toBe(1);
    expect(blinkWeightFromPhase(0.2)).toBe(0);
    expect(blinkPulseFinished(0.2)).toBe(true);
    expect(blinkPulseFinished(0.02)).toBe(false);
  });

  it("flags Happy jaw and Blink lids from morph bind names", () => {
    const happy = inspectExpressionHazard("happy", {
      isBinary: true,
      overrideMouth: "blend",
      binds: [{
        index: 0,
        primitives: [{ morphTargetDictionary: { Fcl_MTH_A: 0, browUp: 1 } }],
      }],
    });
    expect(happy.opensMouth).toBe(true);
    expect(happy.isBinary).toBe(true);

    const blink = inspectExpressionHazard("blinkLeft", {
      binds: [{
        index: 2,
        primitives: [{ morphTargetDictionary: { Fcl_EYE_Close_L: 2 } }],
      }],
    });
    expect(blink.closesEyes).toBe(true);
  });

  it("probes custom expressions and zeros them", () => {
    const expr = mockExpr({
      happy: { isBinary: false, overrideBlink: "none", overrideMouth: "none" },
      Fcl_EYE_Close: {
        isBinary: false,
        binds: [{
          index: 0,
          primitives: [{ morphTargetDictionary: { Fcl_EYE_Close: 0 } }],
        }],
      },
      mouthOpen: {
        overrideMouth: "block",
        binds: [{
          index: 1,
          primitives: [{ morphTargetDictionary: { mouthOpen: 1 } }],
        }],
      },
    });
    expr.values.Fcl_EYE_Close = 1;
    expr.values.mouthOpen = 1;
    const hazards = inspectVrmFaceHazards(expr);
    expect(hazards.closesEyes.has("Fcl_EYE_Close")).toBe(true);
    expect(hazards.opensMouth.has("mouthOpen")).toBe(true);
    zeroAllExpressions(expr);
    expect(expr.values.Fcl_EYE_Close).toBe(0);
    expect(expr.values.mouthOpen).toBe(0);
    expect(expr.values.happy).toBe(0);
  });

  it("drives BlinkLeft/Right together and clears lookDown lids", () => {
    const expr = mockExpr({
      blink: {},
      blinkLeft: {},
      blinkRight: {},
      lookDown: {},
      lookUp: {},
    });
    applyBlinkWeight(expr, 1);
    expect(expr.values.blink).toBe(1);
    expect(expr.values.blinkLeft).toBe(1);
    expect(expr.values.blinkRight).toBe(1);
    applyBlinkWeight(expr, 0);
    expect(expr.values.blinkLeft).toBe(0);
    expr.values.lookDown = 0.8;
    expr.values.lookUp = 0.4;
    zeroLookLidExpressions(expr);
    expect(expr.values.lookDown).toBe(0);
    expect(expr.values.lookUp).toBe(0);
  });

  it("zeros baked close/open morphs that never got a VRM bind", () => {
    const mesh = {
      morphTargetDictionary: { Fcl_EYE_Close: 0, Fcl_MTH_A: 1, browUp: 2 },
      morphTargetInfluences: [0.9, 0.7, 0.3],
    };
    const root = { traverse: (fn) => fn(mesh) };
    expect(zeroHazardMorphInfluences(root)).toBe(2);
    expect(mesh.morphTargetInfluences[0]).toBe(0);
    expect(mesh.morphTargetInfluences[1]).toBe(0);
    expect(mesh.morphTargetInfluences[2]).toBe(0.3);
  });

  it("clears lookDown after the lookAt applier writes eyelid pitch", () => {
    const expr = mockExpr({ lookDown: {}, lookUp: {} });
    const applier = {
      applyYawPitch(yaw, pitch) {
        expr.setValue("lookDown", pitch > 0 ? 0.9 : 0);
        expr.setValue("lookUp", pitch < 0 ? 0.9 : 0);
      },
    };
    const vrm = { lookAt: { applier }, expressionManager: expr };
    expect(guardLookAtLids(vrm)).toBe(true);
    applier.applyYawPitch(0, 12);
    expect(expr.values.lookDown).toBe(0);
    expect(expr.values.lookUp).toBe(0);
    expect(guardLookAtLids(vrm)).toBe(true);
  });

  it("drives dedicated eye-open morphs at rest", () => {
    const expr = mockExpr({
      blink: {},
      Fcl_EYE_Open: {},
      eyeOpen: {},
    });
    expect(applyRestEyeOpen(expr, 0.4)).toBe(2);
    expect(expr.values.eyeOpen).toBeCloseTo(0.4);
    expect(expr.values.Fcl_EYE_Open).toBeCloseTo(0.4);
    expect(expr.values.blink ?? 0).toBe(0);

    const mesh = {
      morphTargetDictionary: {
        eyeOpen: 0,
        blink: 1,
        brow: 2,
      },
      morphTargetInfluences: [0, 0, 0],
    };
    const root = { traverse: (fn) => fn(mesh) };
    expect(applyRestEyeOpenMorphs(root, 0.5)).toBe(1);
    expect(mesh.morphTargetInfluences[0]).toBeCloseTo(0.5);
    expect(mesh.morphTargetInfluences[1]).toBe(0);
  });
});
