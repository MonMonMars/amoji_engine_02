import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildVrmExpressionBlend } from "../engine/companion/companionContentMotion.js";
import {
  adaptBlendForFaceProfile,
  blendGltfFaceTint,
  blendProceduralFaceTargets,
  buildModelFaceProfile,
  CHARACTER_TALK_MOUTH_OVERRIDES,
  detectFaceRigType,
  faceProfileTemplate,
  resolveFaceExpression,
  resolveTalkEmotionMorphWeights,
} from "../engine/companion/companionFaceEmotion.js";
import {
  scaleTalkMouthOpen,
  TALK_MOUTH_OPEN_MAX,
} from "../engine/companion/companionFaceRest.js";
import { inspectVrmBuffer } from "../engine/companion/companionVrmInspect.js";

const assets = join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/assets");

describe("companionFaceEmotion", () => {
  it("detects rig types from character hints and mesh inventory", () => {
    expect(detectFaceRigType({ characterId: "kizuna" })).toBe("vrm1-anime");
    expect(detectFaceRigType({ characterId: "nova" })).toBe("arkit");
    expect(detectFaceRigType({ avatarKind: "gltf" })).toBe("gltf");
    expect(detectFaceRigType({ avatarKind: "procedural" })).toBe("procedural");

    const kai = inspectVrmBuffer(
      readFileSync(join(assets, "companion-kai.vrm")),
      "companion-kai.vrm",
    );
    expect(
      detectFaceRigType({
        characterId: "rex",
        morphSummary: {
          morphTargetCount: kai.morphTargets,
          morphNames: kai.morphNames,
        },
        expressionNames: kai.expressions,
        triangleCount: kai.triangles,
      }),
    ).toBe("arkit");
  });

  it("scales preset blends down for ARKit rigs and up for anime rigs", () => {
    const base = buildVrmExpressionBlend("happy", "excited");
    const anime = adaptBlendForFaceProfile(base, faceProfileTemplate("vrm1-anime"));
    const arkit = adaptBlendForFaceProfile(base, faceProfileTemplate("arkit"));
    expect(anime.Happy).toBeGreaterThan(arkit.Happy);
    expect(arkit.Happy).toBeGreaterThan(0.2);
  });

  it("resolves canonical face state with morph fallback weights", () => {
    const profile = buildModelFaceProfile({ characterId: "nova" });
    const resolved = resolveFaceExpression({
      emotion: "happy",
      nuance: "love",
      profile,
    });
    expect(resolved.emotion).toBe("happy");
    expect(resolved.nuance).toBe("love");
    expect(resolved.rigType).toBe("arkit");
    expect(resolved.morphWeights.smile).toBeGreaterThan(0.3);
    expect(resolved.blend.Happy).toBeLessThan(resolved.baseBlend.Happy);
  });

  it("caps photoreal Nova and Ember talk mouth open so the jaw does not drop too far", () => {
    const nova = buildModelFaceProfile({ characterId: "nova" });
    const ember = buildModelFaceProfile({ characterId: "ember" });
    const kizuna = buildModelFaceProfile({ characterId: "kizuna" });
    expect(nova.talkMouthScale).toBe(CHARACTER_TALK_MOUTH_OVERRIDES.nova.talkMouthScale);
    expect(ember.talkMouthScale).toBe(CHARACTER_TALK_MOUTH_OVERRIDES.ember.talkMouthScale);
    expect(nova.talkJawScale).toBe(0);
    expect(ember.talkJawScale).toBe(0);
    expect(nova.skipMorphMouthWhenPresets).toBe(true);
    expect(kizuna.talkMouthScale).toBe(0.52);
    expect(scaleTalkMouthOpen(0.9, nova)).toBeLessThan(0.4);
    expect(scaleTalkMouthOpen(0.9, kizuna)).toBeCloseTo(TALK_MOUTH_OPEN_MAX * 0.52);
  });

  it("boosts love nuance morph smile and stress frown", () => {
    const profile = faceProfileTemplate("arkit");
    const love = resolveTalkEmotionMorphWeights("neutral", true, "love", profile);
    const stress = resolveTalkEmotionMorphWeights(
      "thinking",
      true,
      "stress",
      profile,
    );
    const plain = resolveTalkEmotionMorphWeights(
      "neutral",
      true,
      "none",
      profile,
    );
    expect(love.smile).toBeGreaterThan(plain.smile);
    expect(stress.frown).toBeGreaterThan(0.2);
    expect(stress.browDown).toBeGreaterThan(0.1);
  });

  it("applies nuance to procedural and gltf backends", () => {
    const targets = {
      neutral: { smile: 0.2, brow: 0.05, blush: 0.1 },
      happy: { smile: 0.92, brow: 0.18, blush: 0.65 },
    };
    const shy = blendProceduralFaceTargets(targets, "happy", "shy");
    expect(shy.smile).toBeLessThan(targets.happy.smile);
    expect(shy.blush).toBeGreaterThan(targets.happy.blush);

    const tint = {
      neutral: { color: 0xffffff, intensity: 0 },
      happy: { color: 0xffc6d9, intensity: 0.22 },
    };
    const excited = blendGltfFaceTint(tint, "happy", "excited");
    const plain = blendGltfFaceTint(tint, "happy", "none");
    expect(excited.intensity).toBeGreaterThan(plain.intensity);
  });
});
