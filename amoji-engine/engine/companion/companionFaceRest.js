/**
 * Keep the rest face eyes-open and mouth-closed across different VRM rigs.
 *
 * Per-character hazards: Happy/Surprised often bake a jaw; Relaxed/Sad droop lids;
 * lookDown blendshapes close eyelids when the camera sits below the eyes; binary
 * Blink can stick shut if a hitch skips the reopen window; custom visemes and
 * Fcl_EYE_Close morphs are left at file defaults unless we zero them.
 */

export const COMPANION_FACE_REST_SCHEMA = "amoji.companionFaceRest.v2";

export const MOUTH_CLOSE_EPS = 0.035;
/** No smile morph at rest — visemes own the jaw while talking. */
export const IDLE_HAPPY_MAX = 0;
/** Smile while talking — visemes still own the jaw. */
export const TALK_HAPPY_MAX = 0.34;
/** Surprised at rest often drops the jaw. */
export const REST_SURPRISED_MAX = 0;
export const TALK_SURPRISED_MAX = 0.28;

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

const EYE_CLOSE_RE =
  /(blink|wink|eye[_.\s-]?close|eyes[_.\s-]?close|eyelid|lidclose|close[_.\s-]?eye|fcl_eye_close|eye[_.\s-]?smile|eyesmile|squint|まばたき|目閉|瞑)/i;
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
