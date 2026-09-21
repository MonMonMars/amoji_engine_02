/**
 * Model-adaptive facial emotion system — canonical mood/nuance → per-rig drivers.
 *
 * Semantic blends stay model-agnostic (companionContentMotion.buildVrmExpressionBlend).
 * This module scales/applies them for VRM presets, ARKit morphs, GLTF tint, and
 * procedural face targets.
 */
import { buildVrmExpressionBlend } from "./companionContentMotion.js";
import {
  IDLE_HAPPY_MAX,
  listExpressionNames,
  REST_SURPRISED_MAX,
  TALK_HAPPY_MAX,
  TALK_SURPRISED_MAX,
} from "./companionFaceRest.js";

export const COMPANION_FACE_EMOTION_SCHEMA = "amoji.companionFaceEmotion.v1";

export const CANONICAL_FACE_EMOTIONS = Object.freeze([
  "neutral",
  "happy",
  "thinking",
  "sad",
  "surprised",
  "angry",
]);

/** @typedef {"vrm1-anime" | "vrm0-standard" | "arkit" | "minimal" | "gltf" | "procedural"} FaceRigType */

/** @type {Record<string, FaceRigType>} */
export const CHARACTER_FACE_RIG_HINTS = Object.freeze({
  kizuna: "vrm1-anime",
  amoji: "vrm1-anime",
  alicia: "vrm0-standard",
  chibi: "vrm0-standard",
  sky: "arkit",
  ember: "arkit",
  nova: "arkit",
  cool: "arkit",
  rex: "arkit",
  sora: "vrm1-anime",
  aria: "vrm1-anime",
  mei: "vrm1-anime",
  luna: "vrm1-anime",
  erika: "vrm1-anime",
  atlas: "vrm0-standard",
});

/**
 * Photoreal ARKit rigs (Nova, Ember) stack viseme presets, jawOpen morphs, and
 * jaw-bone rotation — cap talk open so the jaw does not drop too far.
 * @type {Record<string, { talkMouthScale?: number, talkJawScale?: number, talkPulseScale?: number }>}
 */
export const CHARACTER_TALK_MOUTH_OVERRIDES = Object.freeze({
  nova: { talkMouthScale: 0.58, talkJawScale: 0.38, talkPulseScale: 0.62 },
  ember: { talkMouthScale: 0.58, talkJawScale: 0.38, talkPulseScale: 0.62 },
});

/** @type {Record<FaceRigType, {
 *   presetScale: Record<string, number>,
 *   morphScale: number,
 *   usePresets: boolean,
 *   useMorphFallback: boolean,
 *   talkMouthScale: number,
 *   talkJawScale: number,
 *   talkPulseScale: number,
 *   skipMorphMouthWhenPresets: boolean,
 *   caps: { idleHappy: number, talkHappy: number, restSurprised: number, talkSurprised: number },
 * }>} */
export const FACE_PROFILE_TEMPLATES = Object.freeze({
  "vrm1-anime": {
    presetScale: { Happy: 1, Sad: 1, Angry: 1, Surprised: 1 },
    morphScale: 0.38,
    usePresets: true,
    useMorphFallback: true,
    talkMouthScale: 0.52,
    talkJawScale: 0.82,
    talkPulseScale: 0.72,
    skipMorphMouthWhenPresets: false,
    caps: {
      idleHappy: IDLE_HAPPY_MAX,
      talkHappy: TALK_HAPPY_MAX,
      restSurprised: REST_SURPRISED_MAX,
      talkSurprised: TALK_SURPRISED_MAX,
    },
  },
  "vrm0-standard": {
    presetScale: { Happy: 0.88, Sad: 0.9, Angry: 0.92, Surprised: 0.82 },
    morphScale: 0.62,
    usePresets: true,
    useMorphFallback: true,
    talkMouthScale: 0.54,
    talkJawScale: 0.84,
    talkPulseScale: 0.74,
    skipMorphMouthWhenPresets: false,
    caps: {
      idleHappy: 0.32,
      talkHappy: 0.58,
      restSurprised: 0.1,
      talkSurprised: 0.28,
    },
  },
  arkit: {
    presetScale: { Happy: 0.42, Sad: 0.38, Angry: 0.48, Surprised: 0.35 },
    morphScale: 1,
    usePresets: true,
    useMorphFallback: true,
    talkMouthScale: 0.58,
    talkJawScale: 0,
    talkPulseScale: 0.72,
    skipMorphMouthWhenPresets: true,
    caps: {
      idleHappy: 0.28,
      talkHappy: 0.52,
      restSurprised: 0.08,
      talkSurprised: 0.24,
    },
  },
  minimal: {
    presetScale: { Happy: 0.72, Sad: 0.68, Angry: 0.74, Surprised: 0.55 },
    morphScale: 0.78,
    usePresets: true,
    useMorphFallback: true,
    talkMouthScale: 0.82,
    talkJawScale: 0.72,
    talkPulseScale: 0.88,
    skipMorphMouthWhenPresets: false,
    caps: {
      idleHappy: 0.3,
      talkHappy: 0.54,
      restSurprised: 0.1,
      talkSurprised: 0.26,
    },
  },
  gltf: {
    presetScale: {},
    morphScale: 0,
    usePresets: false,
    useMorphFallback: false,
    talkMouthScale: 1,
    talkJawScale: 1,
    talkPulseScale: 1,
    skipMorphMouthWhenPresets: false,
    caps: {
      idleHappy: 0,
      talkHappy: 0,
      restSurprised: 0,
      talkSurprised: 0,
    },
  },
  procedural: {
    presetScale: {},
    morphScale: 0,
    usePresets: false,
    useMorphFallback: false,
    talkMouthScale: 1,
    talkJawScale: 1,
    talkPulseScale: 1,
    skipMorphMouthWhenPresets: false,
    caps: {
      idleHappy: 0,
      talkHappy: 0,
      restSurprised: 0,
      talkSurprised: 0,
    },
  },
});

const ARKIT_MORPH_MARKERS = [
  /^browDownLeft$/i,
  /^browInnerUp$/i,
  /^eyeBlinkLeft$/i,
  /^cheekSquintLeft$/i,
  /^mouthSmileLeft$/i,
];

const PRESET_EMOTION_RE =
  /^(happy|sad|angry|surprised|relaxed|neutral|joy|fun|sorrow|angry|lookup|lookdown)$/i;

/**
 * @param {{
 *   expr?: unknown,
 *   morphSummary?: { morphTargetCount?: number, morphNames?: string[] },
 *   expressionNames?: string[],
 *   hazards?: { opensMouth?: Set<string> },
 *   triangleCount?: number,
 *   modelUrl?: string,
 *   characterId?: string | null,
 *   avatarKind?: string,
 * }} opts
 * @returns {FaceRigType}
 */
export function detectFaceRigType(opts = {}) {
  const kind = String(opts.avatarKind || "").toLowerCase();
  if (kind === "gltf") return "gltf";
  if (kind === "procedural" || kind === "lowpoly") return "procedural";

  const hinted = opts.characterId
    ? CHARACTER_FACE_RIG_HINTS[String(opts.characterId).toLowerCase()]
    : null;
  if (hinted && hinted !== "gltf" && hinted !== "procedural") {
    return hinted;
  }

  const names = opts.expressionNames?.length
    ? opts.expressionNames
    : listExpressionNames(opts.expr);
  const morphNames = opts.morphSummary?.morphNames || [];
  const morphCount = opts.morphSummary?.morphTargetCount || morphNames.length || 0;
  const hasArkit = morphNames.some((name) =>
    ARKIT_MORPH_MARKERS.some((re) => re.test(String(name))),
  );
  const presetCount = names.filter((name) => PRESET_EMOTION_RE.test(name)).length;
  const hasVrm1Visemes = names.some((name) => /^(aa|ih|ou|ee|oh)$/i.test(name));
  const tris = Number(opts.triangleCount) || 0;

  if (hasArkit && presetCount <= 4) return "arkit";
  if (presetCount >= 4 && hasVrm1Visemes && tris >= 30000) return "vrm1-anime";
  if (presetCount >= 3 && hasVrm1Visemes) return "vrm1-anime";
  if (presetCount >= 3) return "vrm0-standard";
  if (hasArkit || morphCount >= 80) return "arkit";
  if (morphCount >= 20) return "minimal";
  return "minimal";
}

/**
 * @param {FaceRigType} rigType
 * @param {Record<string, number>} [presetScaleOverride]
 */
export function faceProfileTemplate(rigType, presetScaleOverride = {}) {
  const base =
    FACE_PROFILE_TEMPLATES[rigType] || FACE_PROFILE_TEMPLATES.minimal;
  return {
    rigType,
    presetScale: { ...base.presetScale, ...presetScaleOverride },
    morphScale: base.morphScale,
    usePresets: base.usePresets,
    useMorphFallback: base.useMorphFallback,
    talkMouthScale: base.talkMouthScale,
    talkJawScale: base.talkJawScale,
    talkPulseScale: base.talkPulseScale,
    skipMorphMouthWhenPresets: base.skipMorphMouthWhenPresets,
    caps: { ...base.caps },
  };
}

/**
 * Build a runtime face profile for the loaded avatar.
 * @param {{
 *   expr?: unknown,
 *   morphSummary?: { morphTargetCount?: number, morphNames?: string[] },
 *   hazards?: object,
 *   expressionNames?: string[],
 *   triangleCount?: number,
 *   modelUrl?: string,
 *   characterId?: string | null,
 *   avatarKind?: string,
 *   presetScaleOverride?: Record<string, number>,
 * }} opts
 */
export function buildModelFaceProfile(opts = {}) {
  const rigType = detectFaceRigType(opts);
  const profile = faceProfileTemplate(rigType, opts.presetScaleOverride);
  const characterId = opts.characterId ? String(opts.characterId).toLowerCase() : null;
  const talkOverride = characterId
    ? CHARACTER_TALK_MOUTH_OVERRIDES[characterId] || null
    : null;
  return {
    ...profile,
    characterId,
    modelUrl: opts.modelUrl || null,
    triangleCount: Number(opts.triangleCount) || 0,
    expressionCount: (opts.expressionNames || listExpressionNames(opts.expr))
      .length,
    morphTargetCount: opts.morphSummary?.morphTargetCount || 0,
    talkMouthScale: talkOverride?.talkMouthScale ?? profile.talkMouthScale,
    talkJawScale: talkOverride?.talkJawScale ?? profile.talkJawScale,
    talkPulseScale: talkOverride?.talkPulseScale ?? profile.talkPulseScale,
  };
}

/**
 * Scale canonical VRM preset blend weights for this model profile.
 * @param {Record<string, number> | null | undefined} blend
 * @param {{ presetScale?: Record<string, number>, usePresets?: boolean } | null | undefined} profile
 */
export function adaptBlendForFaceProfile(blend, profile) {
  if (!profile?.usePresets) return {};
  /** @type {Record<string, number>} */
  const next = {};
  for (const [key, raw] of Object.entries(blend || {})) {
    const value = Math.max(0, Math.min(1, Number(raw) || 0));
    if (value <= 0) continue;
    const scale = profile.presetScale?.[key] ?? 1;
    const scaled = Math.max(0, Math.min(1, value * scale));
    if (scaled > 0.001) next[key] = scaled;
  }
  return next;
}

/**
 * @param {string} emotion
 * @param {boolean} talking
 * @param {string} [nuance]
 * @param {{ morphScale?: number, useMorphFallback?: boolean } | null | undefined} [profile]
 */
export function resolveTalkEmotionMorphWeights(
  emotion,
  talking = false,
  nuance = "none",
  profile = null,
) {
  const e = String(emotion || "neutral").toLowerCase();
  const n = String(nuance || "none").toLowerCase();
  const scale = profile?.useMorphFallback === false ? 0 : profile?.morphScale ?? 1;

  let smile = talking
    ? e === "happy"
      ? 0.54
      : e === "surprised"
        ? 0.18
        : e === "sad" || e === "angry"
          ? 0
          : e === "thinking"
            ? 0.08
            : 0.24
    : e === "happy"
      ? 0.22
      : e === "neutral"
        ? 0.14
        : 0;
  let frown = talking
    ? e === "sad"
      ? 0.46
      : e === "angry"
        ? 0.28
        : e === "thinking"
          ? 0.14
          : 0
    : e === "thinking"
      ? 0.1
      : 0;
  let browUp = talking
    ? e === "surprised"
      ? 0.56
      : e === "happy"
        ? 0.3
        : e === "thinking"
          ? 0.16
          : 0.12
    : 0;
  let browDown = talking
    ? e === "angry"
      ? 0.56
      : e === "sad"
        ? 0.34
        : e === "thinking"
          ? 0.18
          : 0
    : e === "thinking"
      ? 0.12
      : 0;

  switch (n) {
    case "shy":
      smile = Math.min(smile, talking ? 0.22 : 0.12);
      frown = Math.max(frown, 0.08);
      break;
    case "love":
      smile = Math.max(smile, talking ? 0.48 : 0.28);
      break;
    case "curious":
      browUp = Math.max(browUp, talking ? 0.22 : 0.14);
      break;
    case "excited":
      smile = Math.max(smile, talking ? 0.58 : 0.32);
      browUp = Math.max(browUp, 0.18);
      break;
    case "stress":
      frown = Math.max(frown, talking ? 0.36 : 0.18);
      browDown = Math.max(browDown, talking ? 0.28 : 0.16);
      break;
    default:
      break;
  }

  return {
    smile: smile * scale,
    frown: frown * scale,
    browUp: browUp * scale,
    browDown: browDown * scale,
  };
}

/**
 * Canonical face state for any avatar backend.
 * @param {{
 *   emotion?: string,
 *   nuance?: string,
 *   profile?: ReturnType<typeof buildModelFaceProfile> | null,
 *   blendOverride?: Record<string, number> | null,
 * }} opts
 */
export function resolveFaceExpression(opts = {}) {
  const emotion = String(opts.emotion || "neutral").toLowerCase();
  const nuance = String(opts.nuance || "none").toLowerCase();
  const profile = opts.profile || null;
  const baseBlend =
    opts.blendOverride || buildVrmExpressionBlend(emotion, nuance);
  const blend = adaptBlendForFaceProfile(baseBlend, profile);
  const morphWeights = resolveTalkEmotionMorphWeights(
    emotion,
    true,
    nuance,
    profile,
  );
  return {
    emotion,
    nuance,
    baseBlend,
    blend,
    morphWeights,
    caps: profile?.caps || null,
    rigType: profile?.rigType || "minimal",
    usePresets: profile?.usePresets !== false,
    useMorphFallback: profile?.useMorphFallback !== false,
  };
}

/** Procedural face channel deltas per nuance. */
export const NUANCE_PROCEDURAL_MODS = Object.freeze({
  none: {},
  shy: { smile: -0.18, blush: 0.22, brow: -0.08, eyeOpen: -0.06 },
  curious: { brow: 0.22, eyeOpen: 0.08, smile: 0.04 },
  excited: { smile: 0.18, eyeOpen: 0.12, blush: 0.12, brow: 0.1 },
  love: { smile: 0.22, blush: 0.28, eyeOpen: -0.04 },
  stress: { smile: -0.22, brow: -0.18, blush: 0.08, eyeOpen: -0.08 },
});

/**
 * @param {Record<string, number>} base
 * @param {string} nuance
 */
export function applyNuanceToProceduralTarget(base, nuance = "none") {
  const mods =
    NUANCE_PROCEDURAL_MODS[String(nuance || "none").toLowerCase()] ||
    NUANCE_PROCEDURAL_MODS.none;
  /** @type {Record<string, number>} */
  const next = { ...base };
  for (const [key, delta] of Object.entries(mods)) {
    next[key] = (next[key] ?? 0) + (Number(delta) || 0);
  }
  return next;
}

/**
 * @param {Record<string, Record<string, number>>} emotionTargets
 * @param {string} emotion
 * @param {string} nuance
 */
export function blendProceduralFaceTargets(emotionTargets, emotion, nuance = "none") {
  const key = String(emotion || "neutral").toLowerCase();
  const base = emotionTargets[key] || emotionTargets.neutral || {};
  return applyNuanceToProceduralTarget(base, nuance);
}

/** GLTF tint intensity modifiers per nuance. */
export const NUANCE_GLTF_INTENSITY = Object.freeze({
  none: 1,
  shy: 0.82,
  curious: 0.95,
  excited: 1.18,
  love: 1.12,
  stress: 0.88,
});

/**
 * @param {Record<string, { color: number, intensity: number }>} emotionTint
 * @param {string} emotion
 * @param {string} nuance
 */
export function blendGltfFaceTint(emotionTint, emotion, nuance = "none") {
  const e = String(emotion || "neutral").toLowerCase();
  const n = String(nuance || "none").toLowerCase();
  const base = emotionTint[e] || emotionTint.neutral || { color: 0xffffff, intensity: 0 };
  const mult = NUANCE_GLTF_INTENSITY[n] ?? 1;
  return {
    color: base.color,
    intensity: Math.max(0, Math.min(0.45, (base.intensity || 0) * mult)),
  };
}
