/**
 * LLM-driven companion actions — procedural body pose + root motion per action.
 */
import {
  ACTION_CATALOG,
  COMPANION_ACTIONS,
  actionDurationFromCatalog,
  actionLoopsFromCatalog,
  inferActionFromCatalogText,
  resolveAction as resolveCatalogAction,
} from "./companionActionCatalog.js";
import { resolveCloudAction } from "./motionPackData.mjs";
import { getExtendedActionDef, resolveMotionSamplerKey } from "./companionMotionLibrary.js";

export {
  ACTION_CATALOG,
  COMPANION_ACTIONS,
  PLAYABLE_ACTIONS,
  buildActionPromptFragment,
} from "./companionActionCatalog.js";

export { getActionDef } from "./companionActionCatalog.js";

/**
 * Resolve catalog or cloud-extension action id.
 * @param {string | null | undefined} input
 */
export function resolveAction(input) {
  return resolveCatalogAction(input) || resolveCloudAction(input);
}

/**
 * @param {string} actionId
 */
export function getActionDefExtended(actionId) {
  return getExtendedActionDef(actionId);
}

export const COMPANION_ACTION_MOTION_SCHEMA = "amoji.companionActionMotion.v1";

/**
 * @param {string | null | undefined} text
 */
export function parseReplyTags(text) {
  let reply = String(text || "").trim();
  let emotion = null;
  let action = null;

  const moodMatch = reply.match(/\[mood:(\w+)\]/i);
  if (moodMatch) {
    emotion = moodMatch[1].toLowerCase();
  }

  const actionMatch = reply.match(/\[action:(\w+)\]/i);
  if (actionMatch) {
    action = resolveAction(actionMatch[1]);
  }

  reply = reply
    .replace(/\s*\[mood:\w+\]\s*/gi, " ")
    .replace(/\s*\[action:\w+\]\s*/gi, " ")
    .trim();

  return { reply, emotion, action };
}

/**
 * @param {string | null | undefined} text
 */
export function isUserStopCommand(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  return (
    /^(停|停手|停呀|停啦|停一下|唔好|不要|够啦|够喇|收|停住)/.test(raw) ||
    /^(stop|stop moving|enough|halt)\b/i.test(lower) ||
    /\b(停低|停一停|唔好再|不要再)\b/.test(raw)
  );
}

/**
 * @param {string | null | undefined} text
 */
export function inferActionFromUserText(text) {
  if (isUserStopCommand(text)) return "stop";
  return inferActionFromCatalogText(text) || resolveCloudAction(text);
}

/**
 * @param {string | null | undefined} text
 * @param {string | null | undefined} [taggedAction]
 */
export function inferActionFromReply(text, taggedAction = null) {
  const resolvedTag = resolveAction(taggedAction);
  if (resolvedTag === "none") return null;
  if (resolvedTag) return resolvedTag;

  const parsed = parseReplyTags(text);
  if (!parsed.action || parsed.action === "none") return null;
  return parsed.action;
}

/**
 * @param {string} action
 */
export function actionDurationSec(action) {
  const key = resolveAction(action);
  const ext = key ? getExtendedActionDef(key) : null;
  if (ext?.duration) return ext.duration;
  return actionDurationFromCatalog(action);
}

/**
 * @param {string} action
 */
export function actionLoops(action) {
  const key = resolveAction(action);
  const ext = key ? getExtendedActionDef(key) : null;
  if (ext) return Boolean(ext.loops);
  return actionLoopsFromCatalog(action);
}

/** @param {number} t @param {number} f @param {number} a */
const sway = (t, f, a) => Math.sin(t * f) * a;

/** @param {number} t @param {number} f */
const beat = (t, f) => Math.max(0, Math.sin(t * f));

/**
 * @type {Record<string, (p: number, t: number, amp: number) => Record<string, number>>}
 */
const BODY_SAMPLERS = {
  jump(p, t, amp) {
    const hop = Math.sin(p * Math.PI);
    return {
      hipZ: hop * 0.12 * amp,
      spineX: -hop * 0.2 * amp,
      headX: -hop * 0.1 * amp,
      armLiftL: hop * 0.22 * amp,
      armLiftR: hop * 0.22 * amp,
      forearmL: hop * 0.14 * amp,
      forearmR: hop * 0.14 * amp,
      leanY: hop * 0.06 * amp,
    };
  },
  laugh(_p, t, amp) {
    const shake = sway(t, 11.5, 0.035 * amp);
    return {
      headX: -0.04 * amp + shake,
      headZ: sway(t, 8.2, 0.04 * amp),
      spineX: 0.02 * amp + Math.abs(Math.sin(t * 10)) * 0.03 * amp,
      armLiftL: 0.06 * amp + sway(t, 9, 0.04 * amp),
      armLiftR: 0.06 * amp + sway(t, 9, 0.04 * amp),
      leanY: sway(t, 7.5, 0.02 * amp),
    };
  },
  kungfu(_p, t, amp) {
    const combo = Math.floor(t * 1.6) % 4;
    const b = sway(t, 8.4 + combo, 1);
    const pose = {
      spineX: 0.04 * amp + sway(t, 6.2, 0.03 * amp),
      hipZ: sway(t, 5.5, 0.06 * amp),
    };
    if (combo === 0 || combo === 2) {
      pose.armLiftL = 0.2 * amp + b * 0.08 * amp;
      pose.armLiftR = 0.06 * amp;
      pose.forearmL = 0.16 * amp + beat(t, 8.4 + combo) * 0.1 * amp;
      pose.leanY = b * 0.08 * amp;
      pose.headZ = -0.08 * amp;
    } else {
      pose.armLiftR = 0.2 * amp + b * 0.08 * amp;
      pose.armLiftL = 0.06 * amp;
      pose.forearmR = 0.16 * amp + beat(t, 8.4 + combo) * 0.1 * amp;
      pose.leanY = -b * 0.08 * amp;
      pose.headZ = 0.08 * amp;
    }
    return pose;
  },
  wave(_p, t, amp) {
    const w = sway(t, 5.8, 1);
    return {
      armLiftR: 0.1 * amp + w * 0.04 * amp,
      forearmR: 0.08 * amp + beat(t, 5.8) * 0.06 * amp,
      headZ: w * 0.03 * amp,
    };
  },
  celebrate(_p, t, amp) {
    const c = sway(t, 6.8, 1);
    return {
      armLiftL: 0.1 * amp + c * 0.05 * amp,
      armLiftR: 0.1 * amp - c * 0.05 * amp,
      headX: -0.05 * amp,
      leanY: sway(t, 5.2, 0.03 * amp),
    };
  },
  nod(p, _t, amp) {
    const n = Math.sin(p * Math.PI * 2);
    return {
      headX: n * 0.14 * amp,
      spineX: n * 0.05 * amp,
    };
  },
  headshake(_p, t, amp) {
    return {
      headZ: sway(t, 9.5, 0.12 * amp),
      spineX: 0.02 * amp,
    };
  },
  thinking(_p, t, amp) {
    return {
      armLiftR: 0.08 * amp,
      forearmR: 0.12 * amp + beat(t, 2.2) * 0.04 * amp,
      headX: 0.06 * amp,
      headZ: sway(t, 1.8, 0.03 * amp),
      leanY: -0.04 * amp,
    };
  },
  learning(_p, t, amp) {
    const p = beat(t, 2.4);
    return {
      armLiftL: 0.06 * amp + p * 0.05 * amp,
      armLiftR: 0.1 * amp,
      forearmR: 0.14 * amp + sway(t, 3.2, 0.05 * amp),
      headX: 0.08 * amp + sway(t, 1.6, 0.04 * amp),
      headZ: sway(t, 2.1, 0.05 * amp),
      leanY: -0.05 * amp,
      spineX: 0.03 * amp,
    };
  },
  downloading(_p, t, amp) {
    const pulse = beat(t, 4.5);
    return {
      armLiftL: 0.05 * amp + pulse * 0.04 * amp,
      armLiftR: 0.05 * amp + pulse * 0.04 * amp,
      forearmL: pulse * 0.06 * amp,
      forearmR: pulse * 0.06 * amp,
      headX: 0.04 * amp,
      headZ: sway(t, 5.5, 0.03 * amp),
      hipZ: pulse * 0.02 * amp,
    };
  },
  dance(_p, t, amp) {
    const b = sway(t, 5.5, 1);
    return {
      armLiftL: 0.08 * amp + b * 0.06 * amp,
      armLiftR: 0.08 * amp - b * 0.06 * amp,
      hipZ: sway(t, 4.8, 0.08 * amp),
      leanY: sway(t, 3.6, 0.1 * amp),
      headZ: sway(t, 6.2, 0.05 * amp),
    };
  },
  bow(p, _t, amp) {
    const b = Math.sin(Math.min(1, p * 1.4) * Math.PI);
    return {
      spineX: b * 0.28 * amp,
      headX: b * 0.12 * amp,
      armLiftL: -0.04 * amp,
      armLiftR: -0.04 * amp,
    };
  },
  salute(_p, t, amp) {
    const hold = beat(t, 1.2);
    return {
      armLiftR: 0.18 * amp + hold * 0.04 * amp,
      forearmR: 0.1 * amp,
      headX: -0.03 * amp,
      leanY: 0.04 * amp,
    };
  },
  clap(_p, t, amp) {
    const c = beat(t, 7.5);
    return {
      armLiftL: 0.1 * amp + c * 0.06 * amp,
      armLiftR: 0.1 * amp + c * 0.06 * amp,
      forearmL: c * 0.08 * amp,
      forearmR: c * 0.08 * amp,
      spineX: c * 0.02 * amp,
    };
  },
  stretch(p, _t, amp) {
    const s = Math.sin(Math.min(1, p * 1.2) * Math.PI);
    return {
      armLiftL: s * 0.2 * amp,
      armLiftR: s * 0.2 * amp,
      spineX: -s * 0.08 * amp,
      headX: -s * 0.04 * amp,
    };
  },
  sit(_p, t, amp) {
    return {
      hipZ: 0.14 * amp,
      spineX: 0.1 * amp,
      armLiftL: 0.04 * amp + sway(t, 2.5, 0.02 * amp),
      armLiftR: 0.04 * amp,
      headX: 0.03 * amp,
    };
  },
  squat(p, _t, amp) {
    const s = Math.sin(Math.min(1, p * 1.1) * Math.PI);
    return {
      hipZ: s * 0.2 * amp,
      spineX: s * 0.14 * amp,
      armLiftL: s * 0.06 * amp,
      armLiftR: s * 0.06 * amp,
    };
  },
  run(_p, t, amp) {
    const r = sway(t, 8.5, 1);
    return {
      spineX: 0.1 * amp,
      leanY: 0.06 * amp + r * 0.03 * amp,
      armLiftL: beat(t, 8.5) * 0.12 * amp,
      armLiftR: beat(t, 8.5 + Math.PI) * 0.12 * amp,
      hipZ: sway(t, 8.5, 0.05 * amp),
    };
  },
  walk(_p, t, amp) {
    const w = sway(t, 4.2, 1);
    return {
      leanY: w * 0.05 * amp,
      armLiftL: beat(t, 4.2) * 0.06 * amp,
      armLiftR: beat(t, 4.2 + Math.PI) * 0.06 * amp,
      hipZ: w * 0.03 * amp,
    };
  },
  spin(_p, t, amp) {
    return {
      armLiftL: 0.1 * amp,
      armLiftR: 0.1 * amp,
      leanY: sway(t, 6, 0.08 * amp),
      headZ: sway(t, 6, 0.06 * amp),
    };
  },
  moonwalk(_p, t, amp) {
    return {
      spineX: 0.06 * amp,
      armLiftL: 0.06 * amp + sway(t, 3.5, 0.03 * amp),
      armLiftR: 0.06 * amp - sway(t, 3.5, 0.03 * amp),
      leanY: -0.05 * amp,
    };
  },
  dab(_p, t, amp) {
    const d = beat(t, 2.5);
    return {
      armLiftL: 0.18 * amp * d,
      armLiftR: -0.02 * amp,
      headZ: -0.06 * amp,
      leanY: 0.04 * amp,
    };
  },
  punch(_p, t, amp) {
    const p = beat(t, 6.5);
    return {
      armLiftL: 0.08 * amp,
      armLiftR: 0.14 * amp + p * 0.1 * amp,
      forearmR: 0.18 * amp + p * 0.12 * amp,
      leanY: p * 0.08 * amp,
      headZ: 0.05 * amp,
    };
  },
  kick(_p, t, amp) {
    const k = beat(t, 5.2);
    return {
      hipZ: k * 0.1 * amp,
      spineX: 0.04 * amp,
      armLiftL: 0.1 * amp,
      armLiftR: 0.06 * amp,
      leanY: -k * 0.1 * amp,
    };
  },
  cheer(_p, t, amp) {
    const c = sway(t, 7, 1);
    return {
      armLiftL: 0.14 * amp + c * 0.06 * amp,
      armLiftR: 0.14 * amp - c * 0.06 * amp,
      headX: -0.06 * amp,
      leanY: sway(t, 5.5, 0.04 * amp),
    };
  },
  hug(_p, t, amp) {
    const h = beat(t, 1.5);
    return {
      armLiftL: 0.1 * amp + h * 0.04 * amp,
      armLiftR: 0.1 * amp + h * 0.04 * amp,
      forearmL: 0.08 * amp,
      forearmR: 0.08 * amp,
      spineX: 0.03 * amp,
    };
  },
  kiss(_p, t, amp) {
    const k = beat(t, 3.2);
    return {
      armLiftR: 0.1 * amp + k * 0.05 * amp,
      forearmR: 0.12 * amp + k * 0.06 * amp,
      headZ: -0.05 * amp,
      headX: 0.04 * amp,
    };
  },
  point(_p, t, amp) {
    return {
      armLiftR: 0.12 * amp,
      forearmR: 0.14 * amp + beat(t, 2) * 0.02 * amp,
      leanY: 0.03 * amp,
    };
  },
  shrug(_p, t, amp) {
    const s = beat(t, 2.8);
    return {
      armLiftL: 0.06 * amp + s * 0.05 * amp,
      armLiftR: 0.06 * amp + s * 0.05 * amp,
      headZ: sway(t, 2, 0.03 * amp),
      spineX: 0.02 * amp,
    };
  },
  facepalm(_p, t, amp) {
    const f = Math.min(1, t * 1.8);
    return {
      armLiftR: f * 0.16 * amp,
      forearmR: f * 0.18 * amp,
      headX: f * 0.08 * amp,
      headZ: -0.04 * amp,
      spineX: f * 0.04 * amp,
    };
  },
  thumbsup(_p, t, amp) {
    const u = beat(t, 2);
    return {
      armLiftR: 0.12 * amp + u * 0.04 * amp,
      forearmR: 0.06 * amp,
      headX: -0.03 * amp,
    };
  },
  peace(_p, t, amp) {
    return {
      armLiftR: 0.14 * amp,
      forearmR: 0.08 * amp + beat(t, 2.5) * 0.02 * amp,
      headZ: 0.03 * amp,
    };
  },
  rock(_p, t, amp) {
    const r = sway(t, 5.5, 1);
    return {
      armLiftL: 0.1 * amp + r * 0.04 * amp,
      armLiftR: 0.12 * amp - r * 0.04 * amp,
      forearmL: 0.1 * amp,
      forearmR: 0.1 * amp,
      leanY: sway(t, 4, 0.04 * amp),
    };
  },
  cry(_p, t, amp) {
    return {
      headX: 0.1 * amp,
      spineX: 0.06 * amp + sway(t, 6, 0.02 * amp),
      armLiftL: 0.08 * amp,
      armLiftR: 0.08 * amp,
      headZ: sway(t, 5, 0.04 * amp),
    };
  },
  angry(_p, t, amp) {
    const a = beat(t, 7);
    return {
      spineX: 0.05 * amp,
      leanY: a * 0.06 * amp,
      armLiftL: 0.06 * amp + a * 0.05 * amp,
      armLiftR: 0.06 * amp + a * 0.05 * amp,
      headX: -0.04 * amp,
      hipZ: a * 0.04 * amp,
    };
  },
  shy(_p, t, amp) {
    return {
      headZ: 0.1 * amp,
      headX: 0.06 * amp,
      armLiftL: 0.06 * amp,
      armLiftR: 0.04 * amp,
      forearmL: 0.06 * amp,
      leanY: -0.03 * amp,
    };
  },
  sleep(_p, t, amp) {
    const s = 0.5 + beat(t, 0.8) * 0.5;
    return {
      headX: 0.14 * amp * s,
      spineX: 0.08 * amp * s,
      armLiftL: 0.04 * amp,
      armLiftR: 0.04 * amp,
    };
  },
  eat(_p, t, amp) {
    const e = beat(t, 4.5);
    return {
      armLiftR: 0.1 * amp + e * 0.04 * amp,
      forearmR: 0.12 * amp + e * 0.08 * amp,
      headX: e * 0.04 * amp,
    };
  },
  drink(_p, t, amp) {
    const d = beat(t, 3.8);
    return {
      armLiftR: 0.12 * amp,
      forearmR: 0.14 * amp + d * 0.06 * amp,
      headX: -0.04 * amp,
      leanY: -0.02 * amp,
    };
  },
  yoga(_p, t, amp) {
    const y = sway(t, 1.8, 1);
    return {
      armLiftL: 0.12 * amp + y * 0.04 * amp,
      armLiftR: 0.12 * amp - y * 0.04 * amp,
      spineX: -0.06 * amp,
      headX: -0.03 * amp,
      hipZ: sway(t, 1.2, 0.03 * amp),
    };
  },
};

/**
 * @type {Record<string, (p: number, t: number, amp: number) => { y: number, rotY: number }>}
 */
const ROOT_SAMPLERS = {
  jump(p, _t, amp) {
    const hop = Math.sin(p * Math.PI);
    return { y: hop * 0.14 * amp, rotY: 0 };
  },
  kungfu(_p, t, amp) {
    const combo = Math.floor(t * 1.6) % 4;
    const b = sway(t, 8.4 + combo, 1);
    return { y: Math.abs(b) * 0.02 * amp, rotY: b * 0.18 * amp };
  },
  laugh(_p, t, amp) {
    return { y: sway(t, 10, 0.015 * amp), rotY: sway(t, 7.5, 0.06 * amp) };
  },
  celebrate(_p, t, amp) {
    return { y: sway(t, 6.8, 0.03 * amp), rotY: sway(t, 5.2, 0.1 * amp) };
  },
  wave(_p, t, amp) {
    return { y: 0, rotY: sway(t, 5.8, 0.05 * amp) };
  },
  dance(_p, t, amp) {
    return { y: sway(t, 5.5, 0.025 * amp), rotY: sway(t, 3.8, 0.14 * amp) };
  },
  run(_p, t, amp) {
    return { y: beat(t, 8.5) * 0.03 * amp, rotY: sway(t, 4, 0.04 * amp) };
  },
  walk(_p, t, amp) {
    return { y: beat(t, 4.2) * 0.015 * amp, rotY: sway(t, 2.5, 0.06 * amp) };
  },
  spin(_p, t, amp) {
    return { y: 0, rotY: t * 2.8 * amp };
  },
  moonwalk(_p, t, amp) {
    return { y: 0, rotY: -t * 0.55 * amp };
  },
  angry(_p, t, amp) {
    return { y: beat(t, 7) * 0.04 * amp, rotY: 0 };
  },
  cheer(_p, t, amp) {
    return { y: sway(t, 7, 0.03 * amp), rotY: sway(t, 5, 0.08 * amp) };
  },
  clap(_p, t, amp) {
    return { y: beat(t, 7.5) * 0.01 * amp, rotY: 0 };
  },
  squat(p, _t, amp) {
    return { y: -Math.sin(Math.min(1, p * 1.1) * Math.PI) * 0.06 * amp, rotY: 0 };
  },
  sit(_p, _t, amp) {
    return { y: -0.05 * amp, rotY: 0 };
  },
  bow(p, _t, amp) {
    return { y: -Math.sin(Math.min(1, p * 1.4) * Math.PI) * 0.03 * amp, rotY: 0 };
  },
};

/**
 * Sample a VRM body pose overlay for scripted actions.
 * @param {string} action
 * @param {number} phase 0..1 within action cycle
 * @param {number} elapsedSec wall clock for loops
 */
export function sampleActionBodyPose(action, phase, elapsedSec = 0) {
  const key = resolveMotionSamplerKey(
    resolveAction(action) || String(action || "").toLowerCase(),
  );
  const p = Math.max(0, Math.min(1, phase));
  const t = elapsedSec;
  const amp = 1.75;
  const sampler = BODY_SAMPLERS[key];
  return sampler ? sampler(p, t, amp) : {};
}

/**
 * Whole-body root motion so actions read clearly on small screens.
 * @param {string} action
 * @param {number} phase 0..1
 * @param {number} elapsedSec
 * @returns {{ y: number, rotY: number }}
 */
export function sampleActionRootMotion(action, phase, elapsedSec = 0) {
  const key = resolveMotionSamplerKey(
    resolveAction(action) || String(action || "").toLowerCase(),
  );
  const p = Math.max(0, Math.min(1, phase));
  const t = elapsedSec;
  const amp = 1.85;
  const sampler = ROOT_SAMPLERS[key];
  return sampler ? sampler(p, t, amp) : { y: 0, rotY: 0 };
}
