/**
 * Disney-style talk gestures — body, shoulders, hands, and per-joint
 * fingers down to the fingertips for Sakura Face Live / VTube Studio.
 *
 * Keep in sync with `engine/face/talkGestures.js`.
 */
import type { FaceLiveParameter } from "../types.js";

export const TALK_GESTURE_SCHEMA = "amoji.talkGesture.v2" as const;

export const FINGER_DIGITS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
export type FingerDigit = (typeof FINGER_DIGITS)[number];

export const FINGER_JOINTS = ["Prox", "Mid", "Tip"] as const;
export type FingerJoint = (typeof FINGER_JOINTS)[number];

export type HandSide = "L" | "R";
export type HandSideOrBoth = HandSide | "both";

export type TalkGestureStyle =
  | "explain"
  | "point"
  | "emphasize"
  | "shrug"
  | "celebrate"
  | "count"
  | "wave"
  | "question"
  | "soft"
  | "thinking";

export type PoseMap = Record<string, number>;

export interface TalkGestureSampleOptions {
  style?: string;
  intensity?: number;
  emotion?: string;
  speechEnergy?: number;
  countDigit?: number;
}

export interface TalkGestureSample {
  schema: typeof TALK_GESTURE_SCHEMA;
  timeSec: number;
  style: string;
  intensity: number;
  emotion: string;
  speechActive: boolean;
  pose: PoseMap;
  fingerTips: PoseMap;
}

export interface TalkGestureClockOptions {
  style?: string;
  intensity?: number;
  emotion?: string;
}


function buildFingerJointParamIds(): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const side of ["L", "R"]) {
    for (const digit of FINGER_DIGITS) {
      for (const joint of FINGER_JOINTS) {
        const key = `finger${side}${digit}${joint}`;
        ids[key] = `ParamFinger${side}${digit}${joint}`;
      }
      // Lateral spread at the fingertip (splay)
      ids[`finger${side}${digit}Spread`] = `ParamFinger${side}${digit}Spread`;
      // Aggregate alias = tip extension (compat + HUD)
      ids[`finger${side}${digit}`] = `ParamFinger${side}${digit}`;
    }
  }
  return ids;
}

const FINGER_JOINT_PARAM_IDS = buildFingerJointParamIds();

/** Body / hand / finger parameter ids injected while speaking. */
export const TALK_GESTURE_PARAM_IDS: Readonly<Record<string, string>> = Object.freeze({
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
  // Wrist / palm
  handLX: "ParamHandLX",
  handLY: "ParamHandLY",
  handLZ: "ParamHandLZ",
  handRX: "ParamHandRX",
  handRY: "ParamHandRY",
  handRZ: "ParamHandRZ",
  handLOpen: "ParamHandLOpen",
  handROpen: "ParamHandROpen",
  handLPoint: "ParamHandLPoint",
  handRPoint: "ParamHandRPoint",
  handLSpread: "ParamHandLSpread",
  handRSpread: "ParamHandRSpread",
  // Per-joint fingers → fingertips (+ aggregate tip aliases)
  ...FINGER_JOINT_PARAM_IDS,
});

/** Tip-only Face Live ids (fingertips) for both hands. */
export const FINGER_TIP_PARAM_IDS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    ["L", "R"].flatMap((side) =>
      FINGER_DIGITS.map((digit) => [
        `finger${side}${digit}Tip`,
        `ParamFinger${side}${digit}Tip`,
      ]),
    ),
  ),
);

/**
 * Ordered list of fingertip param ids (L then R, thumb→pinky).
 * @returns {string[]}
 */
export function listFingerTipParamIds(): string[] {
  return Object.values(FINGER_TIP_PARAM_IDS);
}

export const TALK_GESTURE_STYLES: readonly TalkGestureStyle[] = Object.freeze([
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

export function inferTalkGestureFromText(
  text: string | null | undefined,
  opts: { emotion?: string | null } = {},
): string {
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

export function nextTalkGestureStyle(style: string | null | undefined): string {
  const cur = String(style || "explain");
  const idx = (TALK_GESTURE_STYLES as readonly string[]).indexOf(cur);
  return TALK_GESTURE_STYLES[(Math.max(0, idx) + 1) % TALK_GESTURE_STYLES.length]!;
}

export function sampleTalkGesture(
  timeSec: number,
  opts: TalkGestureSampleOptions = {},
): TalkGestureSample {
  const t = Math.max(0, Number(timeSec) || 0);
  const rawStyle = String(opts.style || "");
  const style = (TALK_GESTURE_STYLES as readonly string[]).includes(rawStyle)
    ? rawStyle
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

  const pose: PoseMap = {
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
    handLZ: 0,
    handRX: 0,
    handRY: 0.1,
    handRZ: 0,
    handLOpen: 0.45,
    handROpen: 0.45,
    handLPoint: 0,
    handRPoint: 0,
    handLSpread: 0.35,
    handRSpread: 0.35,
  };

  // Neutral rest: each finger Prox → Mid → Tip slightly open
  seedFingerPose(pose);

  applyStylePose(pose, style, {
    t,
    beat,
    sway,
    bob,
    intensity,
    energy,
    countDigit: opts.countDigit,
  });

  syncFingerAggregates(pose);

  // Round for stable inject payloads
  for (const key of Object.keys(pose)) {
    pose[key] = Number(clamp(pose[key] ?? 0, -1, 1.2).toFixed(3));
  }

  return {
    schema: TALK_GESTURE_SCHEMA,
    timeSec: Number(t.toFixed(3)),
    style,
    intensity: Number(intensity.toFixed(3)),
    emotion: opts.emotion || "neutral",
    speechActive: true,
    pose,
    fingerTips: readFingerTips(pose),
  };
}

function applyStylePose(
  pose: PoseMap,
  style: string,
  ctx: {
    t: number;
    beat: number;
    sway: number;
    bob: number;
    intensity: number;
    energy: number;
    countDigit?: number;
  },
): void {
  const { t, beat, sway, bob, intensity, energy } = ctx;
  const i = intensity;

  switch (style) {
    case "point": {
      // Dominant right-hand index point — Disney “and THIS!” to the tip
      pose.armRA = 0.55 + beat * 0.12 * i;
      pose.armRB = 0.35;
      pose.handRX = 0.25 + sway * 0.08;
      pose.handRY = 0.35 + bob * 0.1;
      pose.handRZ = 0.12;
      pose.handROpen = 0.15;
      pose.handRPoint = 0.85 + beat * 0.1;
      pose.handRSpread = 0.15;
      setFingerChain(pose, "R", "Index", 0.98, { tipBias: 1.05 });
      setFingerChain(pose, "R", "Thumb", 0.28, { tipBias: 0.7 });
      setFingerChain(pose, "R", "Middle", 0.1, { tipBias: 0.55 });
      setFingerChain(pose, "R", "Ring", 0.08, { tipBias: 0.5 });
      setFingerChain(pose, "R", "Pinky", 0.06, { tipBias: 0.45 });
      pose.armLA = 0.12;
      pose.handLOpen = 0.35;
      pose.handLSpread = 0.25;
      curlFingers(pose, "L", 0.45);
      pose.shoulderR = 0.22 + beat * 0.1;
      pose.bodyAngleY = 0.06 * i;
      break;
    }
    case "emphasize": {
      pose.armLA = 0.45 + beat * 0.25 * i;
      pose.armRA = 0.45 + (1 - beat) * 0.25 * i;
      pose.handLY = 0.4 + beat * 0.15;
      pose.handRY = 0.4 + (1 - beat) * 0.15;
      pose.handLZ = beat * 0.08;
      pose.handRZ = (1 - beat) * 0.08;
      pose.handLOpen = 0.7;
      pose.handROpen = 0.7;
      pose.handLSpread = 0.55;
      pose.handRSpread = 0.55;
      pose.shoulderL = 0.28 + beat * 0.12;
      pose.shoulderR = 0.28 + (1 - beat) * 0.12;
      pose.bodyAngleZ = sway * 0.08 * i;
      openFingers(pose, "both", 0.78, { tipLead: true });
      break;
    }
    case "shrug": {
      pose.shoulderL = 0.55 + beat * 0.08;
      pose.shoulderR = 0.55 + beat * 0.08;
      pose.armLA = 0.35;
      pose.armRA = 0.35;
      pose.handLOpen = 0.85;
      pose.handROpen = 0.85;
      pose.handLSpread = 0.7;
      pose.handRSpread = 0.7;
      pose.handLY = 0.25;
      pose.handRY = 0.25;
      pose.bodyAngleX = 0;
      openFingers(pose, "both", 0.92, { tipLead: true, splay: 0.55 });
      break;
    }
    case "celebrate": {
      pose.armLA = 0.75 + Math.sin(t * 3.2) * 0.08;
      pose.armRA = 0.75 + Math.cos(t * 3.2) * 0.08;
      pose.handLY = 0.7;
      pose.handRY = 0.7;
      pose.handLOpen = 0.9;
      pose.handROpen = 0.9;
      pose.handLSpread = 0.85;
      pose.handRSpread = 0.85;
      pose.shoulderL = 0.4;
      pose.shoulderR = 0.4;
      pose.bodyAngleY = Math.sin(t * 2.4) * 0.1 * i;
      pose.breath = 0.55 + beat * 0.3;
      openFingers(pose, "both", 0.96, { tipLead: true, splay: 0.7 });
      break;
    }
    case "count": {
      const digit = Math.max(
        1,
        Math.min(5, Number(ctx.countDigit) || inferCountDigit(t)),
      );
      pose.armRA = 0.5;
      pose.handRY = 0.45;
      pose.handRZ = 0.08;
      pose.handROpen = 0.2;
      pose.handRPoint = digit === 1 ? 0.7 : 0.2;
      pose.handRSpread = 0.2 + digit * 0.08;
      setCountFingers(pose, "R", digit);
      pose.armLA = 0.1;
      pose.handLOpen = 0.3;
      pose.handLSpread = 0.2;
      curlFingers(pose, "L", 0.5);
      pose.shoulderR = 0.2;
      break;
    }
    case "wave": {
      const w = Math.sin(t * 4.2 * Math.PI);
      pose.armRA = 0.65;
      pose.handRX = w * 0.35 * i;
      pose.handRY = 0.55;
      pose.handRZ = w * 0.15;
      pose.handROpen = 0.8;
      pose.handRSpread = 0.65;
      openFingers(pose, "R", 0.88, { tipLead: true, splay: 0.5, flutter: w });
      pose.armLA = 0.12;
      pose.shoulderR = 0.3;
      curlFingers(pose, "L", 0.4);
      break;
    }
    case "question": {
      pose.armLA = 0.4 + beat * 0.08;
      pose.armRA = 0.4 + (1 - beat) * 0.08;
      pose.handLOpen = 0.9;
      pose.handROpen = 0.9;
      pose.handLSpread = 0.75;
      pose.handRSpread = 0.75;
      pose.handLY = 0.35;
      pose.handRY = 0.35;
      pose.shoulderL = 0.25;
      pose.shoulderR = 0.25;
      pose.bodyAngleY = -0.05;
      openFingers(pose, "both", 0.94, { tipLead: true, splay: 0.6 });
      break;
    }
    case "soft": {
      pose.armLA = 0.18;
      pose.armRA = 0.18;
      pose.handLOpen = 0.35;
      pose.handROpen = 0.35;
      pose.handLSpread = 0.2;
      pose.handRSpread = 0.2;
      pose.shoulderL = 0.05;
      pose.shoulderR = 0.05;
      pose.bodyAngleY = 0.04;
      pose.breath = 0.3 + beat * 0.12;
      curlFingers(pose, "both", 0.42);
      break;
    }
    case "thinking": {
      // Left index tip near chin
      pose.armLA = 0.55;
      pose.armLB = 0.4;
      pose.handLX = -0.15;
      pose.handLY = 0.5;
      pose.handLZ = 0.1;
      pose.handLOpen = 0.25;
      pose.handLSpread = 0.15;
      setFingerChain(pose, "L", "Index", 0.82, { tipBias: 1.1 });
      setFingerChain(pose, "L", "Thumb", 0.58, { tipBias: 0.85 });
      setFingerChain(pose, "L", "Middle", 0.18, { tipBias: 0.5 });
      setFingerChain(pose, "L", "Ring", 0.12, { tipBias: 0.45 });
      setFingerChain(pose, "L", "Pinky", 0.1, { tipBias: 0.4 });
      pose.armRA = 0.1;
      pose.handROpen = 0.3;
      pose.handRSpread = 0.2;
      curlFingers(pose, "R", 0.48);
      pose.bodyAngleX = -0.06;
      pose.bodyAngleY = 0.08;
      pose.shoulderL = 0.18;
      break;
    }
    case "explain":
    default: {
      const leftLead = beat > 0.5;
      pose.armLA = leftLead ? 0.42 + energy * 0.1 : 0.22;
      pose.armRA = leftLead ? 0.22 : 0.42 + energy * 0.1;
      pose.handLY = leftLead ? 0.32 + bob * 0.08 : 0.12;
      pose.handRY = leftLead ? 0.12 : 0.32 + bob * 0.08;
      pose.handLOpen = leftLead ? 0.75 : 0.4;
      pose.handROpen = leftLead ? 0.4 : 0.75;
      pose.handLSpread = leftLead ? 0.55 : 0.28;
      pose.handRSpread = leftLead ? 0.28 : 0.55;
      pose.handLX = leftLead ? sway * 0.1 : 0;
      pose.handRX = leftLead ? 0 : sway * -0.1;
      pose.handLZ = leftLead ? 0.06 : 0;
      pose.handRZ = leftLead ? 0 : 0.06;
      pose.shoulderL = leftLead ? 0.18 : 0.1;
      pose.shoulderR = leftLead ? 0.1 : 0.18;
      pose.bodyAngleZ = sway * 0.05 * i;
      openFingers(pose, leftLead ? "L" : "R", 0.82, {
        tipLead: true,
        splay: 0.4,
      });
      curlFingers(pose, leftLead ? "R" : "L", 0.42);
      break;
    }
  }
}

/** Neutral rest pose for every Prox/Mid/Tip (+ spread). */
function seedFingerPose(pose: PoseMap): void {
  for (const side of ["L", "R"] as const) {
    for (const digit of FINGER_DIGITS) {
      const base =
        digit === "Thumb" ? 0.4 : digit === "Pinky" ? 0.45 : 0.52;
      setFingerChain(pose, side, digit, base, { tipBias: 1 });
      pose[`finger${side}${digit}Spread`] = 0.25;
    }
  }
}

export function setFingerChain(
  pose: PoseMap,
  side: HandSide,
  digit: string,
  extension: number,
  opts: { tipBias?: number } = {},
): void {
  const tipBias = opts.tipBias ?? 1;
  const ext = clamp(extension, 0, 1.05);
  // Cascade: tip most extreme, then mid, then prox
  const tip = clamp(ext * tipBias, 0, 1);
  const mid = clamp(ext * (0.92 + (tipBias - 1) * 0.3), 0, 1);
  const prox = clamp(ext * 0.82 + (1 - tipBias) * 0.05, 0, 1);
  pose[`finger${side}${digit}Prox`] = prox;
  pose[`finger${side}${digit}Mid`] = mid;
  pose[`finger${side}${digit}Tip`] = tip;
}

function openFingers(
  pose: PoseMap,
  side: HandSideOrBoth,
  open: number,
  opts: { tipLead?: boolean; splay?: number; flutter?: number } = {},
): void {
  const sides: HandSide[] = side === "both" ? ["L", "R"] : [side];
  const tipBias = opts.tipLead ? 1.08 : 1;
  const splay = opts.splay ?? 0.35;
  const flutter = opts.flutter ?? 0;
  for (const s of sides) {
    for (const digit of FINGER_DIGITS) {
      const scale =
        digit === "Thumb" ? 0.88 : digit === "Pinky" ? 0.92 : 1;
      const tipWiggle =
        digit === "Pinky" || digit === "Index" ? flutter * 0.04 : 0;
      setFingerChain(pose, s, digit, open * scale + tipWiggle, { tipBias });
      pose[`finger${s}${digit}Spread`] = clamp(
        splay * (digit === "Pinky" || digit === "Index" ? 1.15 : 1),
        0,
        1,
      );
    }
  }
}

function curlFingers(pose: PoseMap, side: HandSideOrBoth, curl: number): void {
  const open = clamp(1 - curl, 0, 1) * 0.42;
  openFingers(pose, side, open, { tipLead: false, splay: 0.12 });
  // Tips curl harder than base when closing
  const sides: HandSide[] = side === "both" ? ["L", "R"] : [side];
  for (const s of sides) {
    for (const digit of FINGER_DIGITS) {
      const tipKey = `finger${s}${digit}Tip`;
      const midKey = `finger${s}${digit}Mid`;
      pose[tipKey] = clamp((pose[tipKey] ?? 0) * 0.75, 0, 1);
      pose[midKey] = clamp((pose[midKey] ?? 0) * 0.88, 0, 1);
    }
  }
}

function setCountFingers(pose: PoseMap, side: HandSide, digit: number): void {
  for (let i = 0; i < FINGER_DIGITS.length; i += 1) {
    const name = FINGER_DIGITS[i]!;
    if (i < digit) {
      setFingerChain(pose, side, name, 0.96, { tipBias: 1.08 });
      pose[`finger${side}${name}Spread`] = 0.45;
    } else {
      setFingerChain(pose, side, name, 0.08, { tipBias: 0.45 });
      pose[`finger${side}${name}Spread`] = 0.08;
    }
  }
  if (digit === 1) {
    // Classic point-count: thumb tucked, index tip fully out
    setFingerChain(pose, side, "Thumb", 0.18, { tipBias: 0.6 });
    setFingerChain(pose, side, "Index", 0.99, { tipBias: 1.12 });
  }
}

/** Mirror tip values onto aggregate finger* aliases for HUD / older maps. */
function syncFingerAggregates(pose: PoseMap): void {
  for (const side of ["L", "R"]) {
    for (const digit of FINGER_DIGITS) {
      pose[`finger${side}${digit}`] = pose[`finger${side}${digit}Tip`] ?? 0;
    }
  }
}

export function readFingerTips(pose: PoseMap = {}): PoseMap {
  const tips: PoseMap = {};
  for (const side of ["L", "R"]) {
    for (const digit of FINGER_DIGITS) {
      const key = `finger${side}${digit}Tip`;
      tips[key] = Number(pose[key] ?? 0);
    }
  }
  return tips;
}

function inferCountDigit(t: number): number {
  return 1 + (Math.floor(t * 0.55) % 5);
}
export function talkGestureToFaceLiveParams(
  sample: { pose?: PoseMap } = {},
): FaceLiveParameter[] {
  const pose = sample.pose || {};
  const out: FaceLiveParameter[] = [];
  for (const [key, id] of Object.entries(TALK_GESTURE_PARAM_IDS)) {
    if (pose[key] == null) continue;
    out.push({ id, value: Number(pose[key]) || 0 });
  }
  return out;
}

export function mergeFaceLiveParams(
  ...lists: Array<FaceLiveParameter[] | null | undefined>
): FaceLiveParameter[] {
  const map = new Map<string, number>();
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

export class TalkGestureClock {
  opts: {
    style: string;
    intensity: number;
    emotion: string;
    speechEnergy: number;
    countDigit: number | undefined;
  };
  timeSec: number;
  active: boolean;

  constructor(opts: TalkGestureClockOptions = {}) {
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

  setStyle(
    style: string,
    extra: { intensity?: number; emotion?: string; countDigit?: number } = {},
  ): void {
    this.opts.style = style || this.opts.style;
    if (extra.intensity != null) this.opts.intensity = extra.intensity;
    if (extra.emotion != null) this.opts.emotion = extra.emotion;
    if (extra.countDigit != null) this.opts.countDigit = extra.countDigit;
  }

  setFromText(
    text: string,
    extra: { emotion?: string; intensity?: number; countDigit?: number } = {},
  ): string {
    const style = inferTalkGestureFromText(text, { emotion: extra.emotion });
    const countDigit =
      style === "count" ? extractCountDigit(text) : undefined;
    this.setStyle(style, {
      ...extra,
      countDigit: extra.countDigit ?? countDigit,
    });
    return style;
  }

  start(
    text?: string,
    extra: { emotion?: string; intensity?: number; countDigit?: number } = {},
  ): string {
    if (text) this.setFromText(text, extra);
    this.active = true;
    return this.opts.style;
  }

  stop(): void {
    this.active = false;
  }

  step(
    dtSec = 1 / 60,
    frame: { speechEnergy?: number } = {},
  ): TalkGestureSample {
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

  reset(): void {
    this.timeSec = 0;
    this.active = false;
  }
}

export function createTalkGestureClock(
  opts: TalkGestureClockOptions = {},
): TalkGestureClock {
  return new TalkGestureClock(opts);
}

function extractCountDigit(text: string | null | undefined): number {
  const raw = String(text || "");
  if (/五|five|\b5\b/.test(raw)) return 5;
  if (/四|four|\b4\b/.test(raw)) return 4;
  if (/三|third|three|\b3\b/.test(raw)) return 3;
  if (/二|兩|second|two|\b2\b/.test(raw)) return 2;
  if (/一|first|one|\b1\b/.test(raw)) return 1;
  return 1;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
