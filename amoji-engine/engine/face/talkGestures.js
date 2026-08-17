/**
 * Disney-style talk gestures — body, shoulders, hands, and fingers
 * for Sakura Face Live / VTube Studio–compatible inject params.
 *
 * Custom parameter ids are injectable; map them in VTS / Live2D if the
 * Sakura model does not expose the same names out of the box.
 */
export const TALK_GESTURE_SCHEMA = "amoji.talkGesture.v1";

/** Body / hand / finger parameter ids injected while speaking. */
export const TALK_GESTURE_PARAM_IDS = Object.freeze({
  bodyAngleX: "ParamBodyAngleX",
  bodyAngleY: "ParamBodyAngleY",
  bodyAngleZ: "ParamBodyAngleZ",
  breath: "ParamBreath",
  shoulderL: "ParamShoulderL",
  shoulderR: "ParamShoulderR",
  armLA: "ParamArmLA",
  armRA: "ParamArmRA",
  armLB: "ParamArmLB",
  armRB: "ParamArmRB",
  handLX: "ParamHandLX",
  handLY: "ParamHandLY",
  handRX: "ParamHandRX",
  handRY: "ParamHandRY",
  handLOpen: "ParamHandLOpen",
  handROpen: "ParamHandROpen",
  handLPoint: "ParamHandLPoint",
  handRPoint: "ParamHandRPoint",
  // Fingers: 0 closed → 1 extended (index = pointing digit)
  fingerLThumb: "ParamFingerLThumb",
  fingerLIndex: "ParamFingerLIndex",
  fingerLMiddle: "ParamFingerLMiddle",
  fingerLRing: "ParamFingerLRing",
  fingerLPinky: "ParamFingerLPinky",
  fingerRThumb: "ParamFingerRThumb",
  fingerRIndex: "ParamFingerRIndex",
  fingerRMiddle: "ParamFingerRMiddle",
  fingerRRing: "ParamFingerRRing",
  fingerRPinky: "ParamFingerRPinky",
});

/**
 * Ordered gesture styles for demos / cycling.
 * @type {readonly string[]}
 */
export const TALK_GESTURE_STYLES = Object.freeze([
  "explain",
  "point",
  "emphasize",
  "shrug",
  "celebrate",
  "count",
  "wave",
  "question",
  "soft",
  "thinking",
]);

/**
 * Infer a Disney-style talk gesture from reply / ASR text + emotion.
 * @param {string | null | undefined} text
 * @param {{ emotion?: string | null }} [opts]
 * @returns {string}
 */
export function inferTalkGestureFromText(text, opts = {}) {
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  const emotion = String(opts.emotion || "")
    .trim()
    .toLowerCase();

  if (
    /呢個|呢度|嗰個|嗰度|指住|睇下|this|that|here|there|look|point/.test(
      lower,
    )
  ) {
    return "point";
  }
  if (/[?？]|點解|點呀|係咪|嗎|咩事|why|how|what|really/.test(lower)) {
    return "question";
  }
  if (
    /哈哈|開心|萬歲|得咗|掂|鍾意|great|yay|woo|love|thanks|多謝/.test(lower) ||
    emotion === "happy"
  ) {
    return "celebrate";
  }
  if (
    /第一|第二|第三|第四|第五|一[、，,]|二[、，,]|三[、，,]|四[、，,]|五[、，,]|first|second|third|\b[1-5]\.|數一數|數下/.test(
      raw,
    )
  ) {
    return "count";
  }
  if (/唔知|算啦|冇辦法|shrug|whatever|dunno/.test(lower)) {
    return "shrug";
  }
  if (
    /諗|思考|等陣|hmm|唔知點|thinking/.test(lower) ||
    emotion === "thinking"
  ) {
    return "thinking";
  }
  if (
    /唉|唔好意思|sorry|sad|慘|傷心/.test(lower) ||
    emotion === "sad" ||
    emotion === "soft"
  ) {
    return "soft";
  }
  if (/真係|重要|一定|必須|強調|really|must|important|!{2,}|！{2,}/.test(raw)) {
    return "emphasize";
  }
  if (/拜拜|再見|bye|wave|hello|早晨|hi\b/.test(lower)) {
    return "wave";
  }
  if (emotion === "surprised") return "emphasize";
  if (emotion === "angry") return "emphasize";
  return "explain";
}

/**
 * @param {string | null | undefined} style
 */
export function nextTalkGestureStyle(style) {
  const cur = String(style || "explain");
  const idx = TALK_GESTURE_STYLES.indexOf(cur);
  return TALK_GESTURE_STYLES[(Math.max(0, idx) + 1) % TALK_GESTURE_STYLES.length];
}

/**
 * Sample an animated talk-gesture pose at time `t` seconds.
 * @param {number} timeSec
 * @param {{
 *   style?: string,
 *   intensity?: number,
 *   emotion?: string,
 *   speechEnergy?: number,
 *   countDigit?: number,
 * }} [opts]
 */
export function sampleTalkGesture(timeSec, opts = {}) {
  const t = Math.max(0, Number(timeSec) || 0);
  const style = TALK_GESTURE_STYLES.includes(String(opts.style || ""))
    ? String(opts.style)
    : "explain";
  const intensity = clamp(
    opts.intensity ?? 0.72,
    0.15,
    1.35,
  );
  const energy = clamp(opts.speechEnergy ?? 0.45, 0, 1);
  const beat = 0.5 + 0.5 * Math.sin(t * (1.35 + energy) * Math.PI * 2);
  const sway = Math.sin(t * 0.55 * Math.PI * 2);
  const bob = Math.sin(t * 0.9 * Math.PI * 2 + 0.4);

  /** @type {Record<string, number>} */
  const pose = {
    bodyAngleX: sway * 0.08 * intensity,
    bodyAngleY: bob * 0.05 * intensity,
    bodyAngleZ: sway * -0.04 * intensity,
    breath: 0.35 + beat * 0.25 * intensity,
    shoulderL: 0.08 + beat * 0.06,
    shoulderR: 0.08 + (1 - beat) * 0.06,
    armLA: 0.15,
    armRA: 0.15,
    armLB: 0.05,
    armRB: 0.05,
    handLX: 0,
    handLY: 0.1,
    handRX: 0,
    handRY: 0.1,
    handLOpen: 0.45,
    handROpen: 0.45,
    handLPoint: 0,
    handRPoint: 0,
    fingerLThumb: 0.4,
    fingerLIndex: 0.55,
    fingerLMiddle: 0.55,
    fingerLRing: 0.5,
    fingerLPinky: 0.45,
    fingerRThumb: 0.4,
    fingerRIndex: 0.55,
    fingerRMiddle: 0.55,
    fingerRRing: 0.5,
    fingerRPinky: 0.45,
  };

  applyStylePose(pose, style, {
    t,
    beat,
    sway,
    bob,
    intensity,
    energy,
    countDigit: opts.countDigit,
  });

  // Round for stable inject payloads
  for (const key of Object.keys(pose)) {
    pose[key] = Number(clamp(pose[key], -1, 1.2).toFixed(3));
  }

  return {
    schema: TALK_GESTURE_SCHEMA,
    timeSec: Number(t.toFixed(3)),
    style,
    intensity: Number(intensity.toFixed(3)),
    emotion: opts.emotion || "neutral",
    speechActive: true,
    pose,
  };
}

/**
 * @param {Record<string, number>} pose
 * @param {string} style
 * @param {{ t: number, beat: number, sway: number, bob: number, intensity: number, energy: number, countDigit?: number }} ctx
 */
function applyStylePose(pose, style, ctx) {
  const { t, beat, sway, bob, intensity, energy } = ctx;
  const i = intensity;

  switch (style) {
    case "point": {
      // Dominant right-hand index point — Disney “and THIS!”
      pose.armRA = 0.55 + beat * 0.12 * i;
      pose.armRB = 0.35;
      pose.handRX = 0.25 + sway * 0.08;
      pose.handRY = 0.35 + bob * 0.1;
      pose.handROpen = 0.15;
      pose.handRPoint = 0.85 + beat * 0.1;
      pose.fingerRThumb = 0.25;
      pose.fingerRIndex = 0.95;
      pose.fingerRMiddle = 0.12;
      pose.fingerRRing = 0.08;
      pose.fingerRPinky = 0.08;
      pose.armLA = 0.12;
      pose.handLOpen = 0.35;
      pose.shoulderR = 0.22 + beat * 0.1;
      pose.bodyAngleY = 0.06 * i;
      break;
    }
    case "emphasize": {
      // Both hands punch the air on beats
      pose.armLA = 0.45 + beat * 0.25 * i;
      pose.armRA = 0.45 + (1 - beat) * 0.25 * i;
      pose.handLY = 0.4 + beat * 0.15;
      pose.handRY = 0.4 + (1 - beat) * 0.15;
      pose.handLOpen = 0.7;
      pose.handROpen = 0.7;
      pose.shoulderL = 0.28 + beat * 0.12;
      pose.shoulderR = 0.28 + (1 - beat) * 0.12;
      pose.bodyAngleZ = sway * 0.08 * i;
      openFingers(pose, "both", 0.75);
      break;
    }
    case "shrug": {
      pose.shoulderL = 0.55 + beat * 0.08;
      pose.shoulderR = 0.55 + beat * 0.08;
      pose.armLA = 0.35;
      pose.armRA = 0.35;
      pose.handLOpen = 0.85;
      pose.handROpen = 0.85;
      pose.handLY = 0.25;
      pose.handRY = 0.25;
      pose.bodyAngleX = 0;
      openFingers(pose, "both", 0.9);
      break;
    }
    case "celebrate": {
      pose.armLA = 0.75 + Math.sin(t * 3.2) * 0.08;
      pose.armRA = 0.75 + Math.cos(t * 3.2) * 0.08;
      pose.handLY = 0.7;
      pose.handRY = 0.7;
      pose.handLOpen = 0.9;
      pose.handROpen = 0.9;
      pose.shoulderL = 0.4;
      pose.shoulderR = 0.4;
      pose.bodyAngleY = Math.sin(t * 2.4) * 0.1 * i;
      pose.breath = 0.55 + beat * 0.3;
      openFingers(pose, "both", 0.95);
      break;
    }
    case "count": {
      const digit = Math.max(
        1,
        Math.min(5, Number(ctx.countDigit) || inferCountDigit(t)),
      );
      pose.armRA = 0.5;
      pose.handRY = 0.45;
      pose.handROpen = 0.2;
      pose.handRPoint = digit === 1 ? 0.7 : 0.2;
      setCountFingers(pose, "R", digit);
      pose.armLA = 0.1;
      pose.handLOpen = 0.3;
      pose.shoulderR = 0.2;
      break;
    }
    case "wave": {
      const w = Math.sin(t * 4.2 * Math.PI);
      pose.armRA = 0.65;
      pose.handRX = w * 0.35 * i;
      pose.handRY = 0.55;
      pose.handROpen = 0.8;
      openFingers(pose, "R", 0.85);
      pose.armLA = 0.12;
      pose.shoulderR = 0.3;
      break;
    }
    case "question": {
      pose.armLA = 0.4 + beat * 0.08;
      pose.armRA = 0.4 + (1 - beat) * 0.08;
      pose.handLOpen = 0.9;
      pose.handROpen = 0.9;
      pose.handLY = 0.35;
      pose.handRY = 0.35;
      pose.shoulderL = 0.25;
      pose.shoulderR = 0.25;
      pose.bodyAngleY = -0.05;
      openFingers(pose, "both", 0.92);
      break;
    }
    case "soft": {
      pose.armLA = 0.18;
      pose.armRA = 0.18;
      pose.handLOpen = 0.35;
      pose.handROpen = 0.35;
      pose.shoulderL = 0.05;
      pose.shoulderR = 0.05;
      pose.bodyAngleY = 0.04;
      pose.breath = 0.3 + beat * 0.12;
      curlFingers(pose, "both", 0.35);
      break;
    }
    case "thinking": {
      // Left hand near chin, slight lean
      pose.armLA = 0.55;
      pose.armLB = 0.4;
      pose.handLX = -0.15;
      pose.handLY = 0.5;
      pose.handLOpen = 0.25;
      pose.fingerLIndex = 0.7;
      pose.fingerLThumb = 0.55;
      pose.fingerLMiddle = 0.2;
      pose.armRA = 0.1;
      pose.handROpen = 0.3;
      pose.bodyAngleX = -0.06;
      pose.bodyAngleY = 0.08;
      pose.shoulderL = 0.18;
      break;
    }
    case "explain":
    default: {
      // Alternating open-hand beats — classic Disney talk
      const leftLead = beat > 0.5;
      pose.armLA = leftLead ? 0.42 + energy * 0.1 : 0.22;
      pose.armRA = leftLead ? 0.22 : 0.42 + energy * 0.1;
      pose.handLY = leftLead ? 0.32 + bob * 0.08 : 0.12;
      pose.handRY = leftLead ? 0.12 : 0.32 + bob * 0.08;
      pose.handLOpen = leftLead ? 0.75 : 0.4;
      pose.handROpen = leftLead ? 0.4 : 0.75;
      pose.handLX = leftLead ? sway * 0.1 : 0;
      pose.handRX = leftLead ? 0 : sway * -0.1;
      pose.shoulderL = leftLead ? 0.18 : 0.1;
      pose.shoulderR = leftLead ? 0.1 : 0.18;
      pose.bodyAngleZ = sway * 0.05 * i;
      openFingers(pose, leftLead ? "L" : "R", 0.8);
      curlFingers(pose, leftLead ? "R" : "L", 0.4);
      break;
    }
  }
}

/** @param {Record<string, number>} pose @param {'L'|'R'|'both'} side @param {number} open */
function openFingers(pose, side, open) {
  const sides = side === "both" ? ["L", "R"] : [side];
  for (const s of sides) {
    pose[`finger${s}Thumb`] = open * 0.85;
    pose[`finger${s}Index`] = open;
    pose[`finger${s}Middle`] = open;
    pose[`finger${s}Ring`] = open * 0.95;
    pose[`finger${s}Pinky`] = open * 0.9;
  }
}

/** @param {Record<string, number>} pose @param {'L'|'R'|'both'} side @param {number} curl */
function curlFingers(pose, side, curl) {
  openFingers(pose, side, clamp(1 - curl, 0, 1) * 0.45);
}

/** @param {Record<string, number>} pose @param {'L'|'R'} side @param {number} digit 1–5 */
function setCountFingers(pose, side, digit) {
  const order = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
  for (let i = 0; i < order.length; i += 1) {
    pose[`finger${side}${order[i]}`] = i < digit ? 0.95 : 0.08;
  }
  if (digit === 1) {
    pose[`finger${side}Thumb`] = 0.2;
    pose[`finger${side}Index`] = 0.98;
  }
}

function inferCountDigit(t) {
  return 1 + (Math.floor(t * 0.55) % 5);
}

/**
 * Map a talk-gesture sample to Face Live inject parameters.
 * @param {{ pose?: Record<string, number> }} sample
 * @returns {{ id: string, value: number }[]}
 */
export function talkGestureToFaceLiveParams(sample = {}) {
  const pose = sample.pose || {};
  /** @type {{ id: string, value: number }[]} */
  const out = [];
  for (const [key, id] of Object.entries(TALK_GESTURE_PARAM_IDS)) {
    if (pose[key] == null) continue;
    out.push({ id, value: Number(pose[key]) || 0 });
  }
  return out;
}

/**
 * Merge Face Live parameter lists (later entries win on same id).
 * @param {...Array<{ id: string, value: number } | null | undefined>} lists
 */
export function mergeFaceLiveParams(...lists) {
  /** @type {Map<string, number>} */
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const p of list) {
      if (!p?.id) continue;
      map.set(String(p.id), Number(p.value) || 0);
    }
  }
  return [...map.entries()].map(([id, value]) => ({
    id,
    value: Number(value.toFixed(3)),
  }));
}

/**
 * Stateful talk-gesture clock for rAF / TTS loops.
 */
export class TalkGestureClock {
  /**
   * @param {{ style?: string, intensity?: number, emotion?: string }} [opts]
   */
  constructor(opts = {}) {
    this.opts = {
      style: opts.style || "explain",
      intensity: opts.intensity ?? 0.72,
      emotion: opts.emotion || "neutral",
      speechEnergy: 0.45,
      countDigit: undefined,
    };
    this.timeSec = 0;
    this.active = false;
  }

  /**
   * @param {string} style
   * @param {{ intensity?: number, emotion?: string, countDigit?: number }} [extra]
   */
  setStyle(style, extra = {}) {
    this.opts.style = style || this.opts.style;
    if (extra.intensity != null) this.opts.intensity = extra.intensity;
    if (extra.emotion != null) this.opts.emotion = extra.emotion;
    if (extra.countDigit != null) this.opts.countDigit = extra.countDigit;
  }

  /**
   * Bind gesture from spoken / reply text.
   * @param {string} text
   * @param {{ emotion?: string, intensity?: number }} [extra]
   */
  setFromText(text, extra = {}) {
    const style = inferTalkGestureFromText(text, { emotion: extra.emotion });
    const countDigit =
      style === "count" ? extractCountDigit(text) : undefined;
    this.setStyle(style, {
      ...extra,
      countDigit: extra.countDigit ?? countDigit,
    });
    return style;
  }

  start(text, extra = {}) {
    if (text) this.setFromText(text, extra);
    this.active = true;
    return this.opts.style;
  }

  stop() {
    this.active = false;
  }

  /**
   * @param {number} dtSec
   * @param {{ speechEnergy?: number }} [frame]
   */
  step(dtSec = 1 / 60, frame = {}) {
    if (frame.speechEnergy != null) this.opts.speechEnergy = frame.speechEnergy;
    if (!this.active) {
      return sampleTalkGesture(this.timeSec, {
        ...this.opts,
        intensity: 0.2,
        style: "soft",
      });
    }
    this.timeSec += Math.max(0, dtSec);
    return sampleTalkGesture(this.timeSec, this.opts);
  }

  reset() {
    this.timeSec = 0;
    this.active = false;
  }
}

export function createTalkGestureClock(opts = {}) {
  return new TalkGestureClock(opts);
}

/** @param {string | null | undefined} text */
function extractCountDigit(text) {
  const raw = String(text || "");
  if (/五|five|\b5\b/.test(raw)) return 5;
  if (/四|four|\b4\b/.test(raw)) return 4;
  if (/三|third|three|\b3\b/.test(raw)) return 3;
  if (/二|兩|second|two|\b2\b/.test(raw)) return 2;
  if (/一|first|one|\b1\b/.test(raw)) return 1;
  return 1;
}

/** @param {number} n @param {number} lo @param {number} hi */
function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
