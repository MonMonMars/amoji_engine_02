/**
 * Keep the rest face eyes-open and mouth-closed across different VRM rigs.
 *
 * Per-character hazards: Happy/Surprised often bake a jaw; Relaxed/Sad droop lids;
 * lookDown blendshapes close eyelids when the camera sits below the eyes; binary
 * Blink can stick shut if a hitch skips the reopen window; custom visemes and
 * Fcl_EYE_Close morphs are left at file defaults unless we zero them.
 */

export const COMPANION_FACE_REST_SCHEMA = "amoji.companionFaceRest.v6";

export const MOUTH_CLOSE_EPS = 0.035;
/** No smile morph at rest — visemes own the jaw while talking. */
export const IDLE_HAPPY_MAX = 0;
/** Visible smile while talking — still below jaw-bake levels. */
export const TALK_HAPPY_MAX = 0.28;
/** Surprised at rest often drops the jaw. */
export const REST_SURPRISED_MAX = 0;
export const TALK_SURPRISED_MAX = 0.16;
/** Max jaw-bone X rotation (radians) at full open. */
export const TALK_JAW_OPEN_RAD = 0.38;
/** Fallback viseme walk when TTS has not yet named a shape. */
export const TALK_VISEME_CYCLE = ["aa", "ih", "ou", "ee", "oh"];

export const BLINK_CLOSE_SEC = 0.08;
export const BLINK_EXPRESSION_NAMES = ["blink", "blinkLeft", "blinkRight"];
export const LOOK_LID_EXPRESSION_NAMES = ["lookUp", "lookDown"];
export const LOOK_EXPRESSION_NAMES = [
  "lookLeft",
  "lookRight",
  "lookUp",
  "lookDown",
];
export const MOUTH_VISEME_NAMES = ["aa", "ee", "ih", "oh", "ou"];

/** VRM 1.0 viseme presets (three-vrm uses mixed case). */
export const VRM1_MOUTH_PRESETS = [
  "aa",
  "ih",
  "ou",
  "ee",
  "oh",
  "Aa",
  "Ih",
  "Ou",
  "Ee",
  "Oh",
];
/** VRM 0.x viseme presets (Nova and many VRoid 0.x files). */
export const VRM0_MOUTH_PRESETS = ["a", "i", "u", "e", "o", "A", "I", "U", "E", "O"];

export const VISEME_SHAPE_ALIASES = {
  aa: ["aa", "Aa", "a", "A"],
  ih: ["ih", "Ih", "i", "I"],
  ou: ["ou", "Ou", "u", "U"],
  ee: ["ee", "Ee", "e", "E"],
  oh: ["oh", "Oh", "o", "O"],
};

const VISEME_MORPH_RE =
  /^(?:fcl[_-]?mth[_-]?)?(a|i|u|e|o|aa|ih|ou|ee|oh)$/i;
const GENERIC_MOUTH_OPEN_RE = /(mouth[_-]?open|jaw[_-]?open|viseme[_-]?sil)/i;

const EYE_CLOSE_RE =
  /(blink|wink|eye[_.\s-]?close|eyes[_.\s-]?close|eyelid|lidclose|close[_.\s-]?eye|fcl_eye_close|eye[_.\s-]?smile|eyesmile|squint|まばたき|目閉|瞑)/i;
const EYE_OPEN_RE =
  /(eye[_.\s-]?open|eyes[_.\s-]?open|wide[_.\s-]?eyes?|eyes?[_.\s-]?wide|fcl_eye_open|目開|開き)/i;
const MOUTH_OPEN_RE =
  /(mouth[_.\s-]?open|jaw|viseme|fcl_mth_(a|i|u|e|o)|mouth[_-]?(a|i|u|e|o)\b|teeth|口開)/i;

const BLEND_KEY_ALIASES = {
  Happy: ["Happy", "happy"],
  Relaxed: ["Relaxed", "relaxed"],
  Sad: ["Sad", "sad"],
  Surprised: ["Surprised", "surprised"],
  Angry: ["Angry", "angry"],
};

const guardedLookAppliers = new WeakSet();

/**
 * Viseme weight: 0 when idle so Aa/Oh cannot stick open.
 * @param {boolean} talking
 * @param {number} open
 */
export function mouthVisemeWeight(talking, open) {
  const v = Math.max(0, Math.min(1, Number(open) || 0));
  if (!talking || v < MOUTH_CLOSE_EPS) return 0;
  return v;
}

/**
 * Syllable-like flap so lips keep moving for the whole TTS clip, even when
 * viseme samples dip between characters or audio analysis is silent.
 * @param {number} nowMs
 * @param {boolean} talking
 */
export function sampleTalkMouthPulse(nowMs, talking) {
  if (!talking) return 0;
  const t = (Number(nowMs) || 0) * 0.001;
  const a = 0.5 + 0.5 * Math.sin(t * Math.PI * 6.2);
  const b = 0.5 + 0.5 * Math.sin(t * Math.PI * 9.1 + 1.1);
  return 0.22 + a * 0.58 + b * 0.16;
}

/**
 * Chew flap while eating or drinking a treat.
 * @param {number} nowMs
 * @param {boolean} eating
 */
export function sampleEatMouthPulse(nowMs, eating) {
  if (!eating) return 0;
  const t = (Number(nowMs) || 0) * 0.001;
  const chew = Math.max(0, Math.sin(t * Math.PI * 5.4));
  const nibble = Math.max(0, Math.sin(t * Math.PI * 8.1 + 0.6));
  return 0.1 + chew * 0.7 + nibble * 0.12;
}

/**
 * @param {boolean} eating
 * @param {number} [nowMs]
 */
export function eatingMouthOpen(eating, nowMs = 0) {
  if (!eating) return 0;
  return Math.max(0, Math.min(1, sampleEatMouthPulse(nowMs, true)));
}

/**
 * Combined viseme + talk pulse, 0 when idle. Chew pulse when eating.
 * @param {boolean} talking
 * @param {number} visemeOpen
 * @param {number} [nowMs]
 * @param {boolean} [eating]
 */
export function talkingMouthOpen(talking, visemeOpen, nowMs = 0, eating = false) {
  const eat = eatingMouthOpen(eating, nowMs);
  if (!talking) return eat;
  const viseme = mouthVisemeWeight(true, visemeOpen);
  const pulse = sampleTalkMouthPulse(nowMs, true);
  return Math.max(0, Math.min(1, Math.max(viseme, pulse * 0.88, eat)));
}

/**
 * Prefer the live TTS viseme; otherwise walk aa/ih/ou/ee/oh so the mouth
 * changes shape instead of flapping a single "aa".
 * @param {number} nowMs
 * @param {boolean} talking
 * @param {string | null | undefined} requestedShape
 */
export function talkingVisemeShape(nowMs, talking, requestedShape) {
  const asked = String(requestedShape || "").toLowerCase().trim();
  if (asked && asked !== "null" && asked !== "undefined") return asked;
  if (!talking) return "aa";
  const t = (Number(nowMs) || 0) * 0.001;
  const idx =
    Math.floor(((t * 7.2) % TALK_VISEME_CYCLE.length) + TALK_VISEME_CYCLE.length) %
    TALK_VISEME_CYCLE.length;
  return TALK_VISEME_CYCLE[idx];
}

/**
 * Cap Happy/Surprised while talking so visemes still own the jaw, without
 * wiping the rest of the face to a dead rest pose.
 * @param {string} name
 * @param {number} weight
 * @param {{ talking?: boolean, eating?: boolean }} [opts]
 */
export function capTalkingEmotionWeight(name, weight, opts = {}) {
  const v = Math.max(0, Math.min(1, Number(weight) || 0));
  const key = String(name || "");
  const isMouthEmotion = /^(happy|surprised)$/i.test(key);
  if (opts.eating && isMouthEmotion) return 0;
  if (!opts.talking) return v;
  if (/^happy$/i.test(key)) return Math.min(v, TALK_HAPPY_MAX);
  if (/^surprised$/i.test(key)) return Math.min(v, TALK_SURPRISED_MAX);
  return v;
}

/**
 * Jaw bone open amount in radians. 0 at rest.
 * @param {number} open 0..1
 */
export function talkJawRotationX(open) {
  const v = Math.max(0, Math.min(1, Number(open) || 0));
  return v * TALK_JAW_OPEN_RAD;
}

/**
 * Blink lid weight. After BLINK_CLOSE_SEC the lids must reopen even if a hitch
 * skipped the previous 80–160ms window (that used to leave Blink stuck at 1).
 * @param {number} phase seconds since blink start
 */
export function blinkWeightFromPhase(phase) {
  const t = Number(phase) || 0;
  if (t < 0) return 0;
  if (t < BLINK_CLOSE_SEC) return 1;
  return 0;
}

/** True once the blink pulse should reset its timer. */
export function blinkPulseFinished(phase) {
  return (Number(phase) || 0) >= BLINK_CLOSE_SEC;
}

/**
 * @param {unknown} expr
 * @returns {string[]}
 */
export function listExpressionNames(expr) {
  if (!expr) return [];
  const names = new Set();
  const maps = [
    expr.expressionMap,
    expr.presetExpressionMap,
    expr.customExpressionMap,
  ];
  for (const map of maps) {
    if (!map || typeof map !== "object") continue;
    for (const name of Object.keys(map)) names.add(name);
  }
  const list = expr.expressions;
  if (Array.isArray(list)) {
    for (const item of list) {
      const name = item?.expressionName || item?.name;
      if (!name) continue;
      names.add(String(name).replace(/^VRMExpression_/, ""));
    }
  }
  return [...names];
}

/**
 * @param {unknown} expression
 * @returns {string[]}
 */
export function morphNamesForExpression(expression) {
  const names = [];
  const binds = expression?.binds || expression?._binds || [];
  if (!Array.isArray(binds)) return names;
  for (const bind of binds) {
    const index = bind?.index;
    const primitives = bind?.primitives || [];
    if (index == null || !Array.isArray(primitives)) continue;
    for (const mesh of primitives) {
      const dict = mesh?.morphTargetDictionary;
      if (!dict || typeof dict !== "object") continue;
      for (const [morphName, morphIndex] of Object.entries(dict)) {
        if (morphIndex === index) names.push(morphName);
      }
    }
  }
  return names;
}

function addHazardName(set, name) {
  if (!name) return;
  set.add(name);
  set.add(String(name).toLowerCase());
}

function aliasesForBlendKey(key) {
  return BLEND_KEY_ALIASES[key] || [key, String(key || "").toLowerCase()];
}

function hazardHit(set, key) {
  if (!set) return false;
  return aliasesForBlendKey(key).some((name) => set.has(name));
}

/**
 * @param {string} name
 * @param {object | null | undefined} expression
 */
export function inspectExpressionHazard(name, expression) {
  const morphs = morphNamesForExpression(expression);
  const joined = `${name} ${morphs.join(" ")}`;
  const overrideBlink = expression?.overrideBlink || "none";
  const overrideMouth = expression?.overrideMouth || "none";
  const closesEyes =
    EYE_CLOSE_RE.test(joined) ||
    (overrideBlink !== "none" && overrideBlink != null);
  const opensMouth =
    MOUTH_OPEN_RE.test(joined) ||
    (overrideMouth !== "none" && overrideMouth != null);
  return {
    name,
    morphs,
    closesEyes,
    opensMouth,
    isBinary: Boolean(expression?.isBinary),
    overrideBlink,
    overrideMouth,
  };
}

/**
 * Probe every preset + custom expression on a loaded VRM.
 * @param {unknown} expr
 */
export function inspectVrmFaceHazards(expr) {
  /** @type {ReturnType<typeof inspectExpressionHazard>[]} */
  const expressions = [];
  const opensMouth = new Set();
  const closesEyes = new Set();
  const binary = new Set();
  if (!expr) {
    return { expressions, opensMouth, closesEyes, binary };
  }
  const seen = new Set();
  for (const name of listExpressionNames(expr)) {
    if (seen.has(name)) continue;
    seen.add(name);
    const expression =
      expr.getExpression?.(name) ||
      expr.expressionMap?.[name] ||
      expr.customExpressionMap?.[name] ||
      null;
    const hazard = inspectExpressionHazard(name, expression);
    expressions.push(hazard);
    if (hazard.opensMouth) addHazardName(opensMouth, name);
    if (hazard.closesEyes) addHazardName(closesEyes, name);
    if (hazard.isBinary) addHazardName(binary, name);
  }
  return { expressions, opensMouth, closesEyes, binary };
}

/**
 * @param {unknown} expr
 * @param {Iterable<string>} [keep]
 */
export function zeroAllExpressions(expr, keep = []) {
  if (!expr) return;
  const keepSet = new Set(keep);
  if (typeof expr.resetValues === "function" && keepSet.size === 0) {
    expr.resetValues();
    return;
  }
  for (const name of listExpressionNames(expr)) {
    if (keepSet.has(name)) continue;
    expr.setValue?.(name, 0);
  }
}

/**
 * @param {unknown} expr
 * @returns {string[]}
 */
export function blinkExpressionNames(expr) {
  const fromManager = expr?.blinkExpressionNames;
  const candidates = Array.isArray(fromManager) && fromManager.length
    ? fromManager
    : BLINK_EXPRESSION_NAMES;
  return candidates.filter((name) => expr?.getExpression?.(name));
}

/**
 * @param {unknown} expr
 * @param {number} weight
 */
export function applyBlinkWeight(expr, weight) {
  if (!expr) return;
  const w = Math.max(0, Math.min(1, Number(weight) || 0));
  for (const name of blinkExpressionNames(expr)) {
    expr.setValue?.(name, w);
  }
}

/**
 * Photoreal VRMs often keep lids half-shut at blink=0. Drive any dedicated
 * eye-open morph so rest faces look awake.
 * @param {unknown} expr
 * @param {number} [weight]
 */
export function eyeOpenExpressionNames(expr) {
  return listExpressionNames(expr).filter(
    (name) =>
      EYE_OPEN_RE.test(name) &&
      !EYE_CLOSE_RE.test(name) &&
      !MOUTH_OPEN_RE.test(name),
  );
}

/**
 * @param {unknown} expr
 * @param {number} [weight]
 */
export function applyRestEyeOpen(expr, weight = 0.42) {
  if (!expr) return 0;
  const names = eyeOpenExpressionNames(expr);
  if (!names.length) return 0;
  const w = Math.max(0, Math.min(1, Number(weight) || 0));
  for (const name of names) expr.setValue?.(name, w);
  return names.length;
}

/**
 * Bind whatever viseme names this VRM actually ships (VRM 1 Aa… or VRM 0 a…).
 * @param {unknown} expr
 * @returns {string[]}
 */
export function resolveMouthPresets(expr) {
  const has = (name) => Boolean(expr?.getExpression?.(name));
  const vrm1 = VRM1_MOUTH_PRESETS.filter(has);
  if (vrm1.length) return [...new Set(vrm1)];
  const vrm0 = VRM0_MOUTH_PRESETS.filter(has);
  if (vrm0.length) return [...new Set(vrm0)];
  return listExpressionNames(expr).filter(
    (name) => /^(a|i|u|e|o|aa|ih|ou|ee|oh)$/i.test(name) && has(name),
  );
}

/**
 * Map a lipsync shape (aa/ih/…) onto a preset this VRM actually has.
 * @param {string | null | undefined} shape
 * @param {string[]} available
 */
export function shapeToVisemePreset(shape, available = []) {
  const list = Array.isArray(available) ? available : [];
  const key = String(shape || "aa").toLowerCase();
  const aliases = VISEME_SHAPE_ALIASES[key] || [shape, key];
  const byLower = new Map(list.map((name) => [String(name).toLowerCase(), name]));
  for (const alias of aliases) {
    const hit = byLower.get(String(alias).toLowerCase());
    if (hit) return hit;
  }
  return list[0] || null;
}

/**
 * Drive unbound viseme / mouthOpen morphs so VRM 0.x faces still flap.
 * @param {{ traverse?: Function } | null | undefined} root
 * @param {string | null | undefined} shape
 * @param {number} open
 */
export function applyMorphMouthOpen(root, shape, open) {
  if (!root || typeof root.traverse !== "function") return 0;
  const w = Math.max(0, Math.min(1, Number(open) || 0));
  const shapeKey = String(shape || "aa").toLowerCase();
  const aliases = new Set(
    (VISEME_SHAPE_ALIASES[shapeKey] || ["aa", "a"]).map((name) =>
      String(name).toLowerCase(),
    ),
  );
  let applied = 0;
  root.traverse((obj) => {
    const influences = obj?.morphTargetInfluences;
    const dict = obj?.morphTargetDictionary;
    if (!influences || !dict) return;
    for (const [morphName, index] of Object.entries(dict)) {
      if (typeof index !== "number") continue;
      const lower = String(morphName).toLowerCase();
      const stripped = lower.replace(/^fcl[_-]?mth[_-]?/, "");
      const isViseme = VISEME_MORPH_RE.test(morphName) || VISEME_MORPH_RE.test(stripped);
      const isGeneric = GENERIC_MOUTH_OPEN_RE.test(morphName);
      if (!isViseme && !isGeneric) continue;
      if (isGeneric) {
        influences[index] = w;
        applied += 1;
        continue;
      }
      const match = aliases.has(lower) || aliases.has(stripped);
      influences[index] = match && w > 0 ? w : 0;
      applied += 1;
    }
  });
  return applied;
}

export function applyRestEyeOpenMorphs(root, weight = 0.42) {
  if (!root || typeof root.traverse !== "function") return 0;
  const w = Math.max(0, Math.min(1, Number(weight) || 0));
  let applied = 0;
  root.traverse((obj) => {
    const influences = obj?.morphTargetInfluences;
    const dict = obj?.morphTargetDictionary;
    if (!influences || !dict) return;
    for (const [morphName, index] of Object.entries(dict)) {
      if (typeof index !== "number") continue;
      if (!EYE_OPEN_RE.test(morphName)) continue;
      if (EYE_CLOSE_RE.test(morphName) || MOUTH_OPEN_RE.test(morphName)) continue;
      influences[index] = w;
      applied += 1;
    }
  });
  return applied;
}

/**
 * lookUp/lookDown on many VRMs are eyelid morphs, not iris travel.
 * @param {unknown} expr
 */
export function zeroLookLidExpressions(expr) {
  if (!expr) return;
  for (const name of LOOK_LID_EXPRESSION_NAMES) {
    if (expr.getExpression?.(name)) expr.setValue(name, 0);
  }
}

/**
 * After lookAt writes lookDown, clear lid morphs so expressionManager.update
 * (which runs next inside vrm.update) applies weight 0.
 * @param {{ lookAt?: { applier?: { applyYawPitch?: Function } }, expressionManager?: unknown }} vrm
 */
export function guardLookAtLids(vrm) {
  const applier = vrm?.lookAt?.applier;
  const expr = vrm?.expressionManager;
  if (!applier || typeof applier.applyYawPitch !== "function") return false;
  if (guardedLookAppliers.has(applier)) return true;
  const orig = applier.applyYawPitch.bind(applier);
  applier.applyYawPitch = (yaw, pitch) => {
    orig(yaw, pitch);
    zeroLookLidExpressions(expr);
  };
  guardedLookAppliers.add(applier);
  return true;
}

/**
 * Zero baked eye-close / mouth-open morphs that never got a VRM expression bind.
 * @param {{ traverse?: Function } | null | undefined} root
 */
export function zeroHazardMorphInfluences(root) {
  if (!root || typeof root.traverse !== "function") return 0;
  let cleared = 0;
  root.traverse((obj) => {
    const influences = obj?.morphTargetInfluences;
    const dict = obj?.morphTargetDictionary;
    if (!influences || !dict) return;
    for (const [morphName, index] of Object.entries(dict)) {
      if (typeof index !== "number") continue;
      if (!EYE_CLOSE_RE.test(morphName) && !MOUTH_OPEN_RE.test(morphName)) {
        continue;
      }
      if ((influences[index] || 0) === 0) continue;
      influences[index] = 0;
      cleared += 1;
    }
  });
  return cleared;
}

/**
 * Strip sleepy lids, baked jaws, and binary snaps from rest / talk blends.
 * @param {Record<string, number> | null | undefined} blend
 * @param {{ talking?: boolean, hazards?: { opensMouth?: Set<string>, closesEyes?: Set<string>, binary?: Set<string> } }} [opts]
 */
export function clampRestFaceBlend(blend, opts = {}) {
  const talking = Boolean(opts.talking);
  const hazards = opts.hazards;
  /** @type {Record<string, number>} */
  const next = {};
  for (const [key, raw] of Object.entries(blend || {})) {
    const value = Math.max(0, Math.min(1, Number(raw) || 0));
    if (value <= 0) continue;
    if (key === "Relaxed") continue;

    const opensMouth = hazardHit(hazards?.opensMouth, key);
    const closesEyes = hazardHit(hazards?.closesEyes, key);
    const isBinary = hazardHit(hazards?.binary, key);

    if (!talking && (opensMouth || closesEyes || isBinary)) continue;
    if (talking && opensMouth) continue;
    if (talking && isBinary && (opensMouth || closesEyes)) continue;
    if (talking && closesEyes) continue;

    if (key === "Happy") {
      const cap = talking ? TALK_HAPPY_MAX : IDLE_HAPPY_MAX;
      const capped = Math.min(value, cap);
      if (capped > 0 && !(talking && opensMouth)) next.Happy = capped;
      continue;
    }
    if (key === "Surprised") {
      const cap = talking ? TALK_SURPRISED_MAX : REST_SURPRISED_MAX;
      const capped = Math.min(value, cap);
      if (capped > 0 && !(talking && opensMouth)) next.Surprised = capped;
      continue;
    }
    next[key] = value;
  }
  return next;
}
