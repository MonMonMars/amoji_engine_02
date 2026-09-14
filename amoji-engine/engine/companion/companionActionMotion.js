/**
 * LLM-driven companion actions — jump, laugh, kung fu, wave, stop, etc.
 */

export const COMPANION_ACTION_MOTION_SCHEMA = "amoji.companionActionMotion.v1";

export const COMPANION_ACTIONS = Object.freeze([
  "jump",
  "laugh",
  "kungfu",
  "wave",
  "celebrate",
  "stop",
  "nod",
  "thinking",
  "none",
]);

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
    action = actionMatch[1].toLowerCase();
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
  const raw = String(text || "");
  const lower = raw.toLowerCase();
  if (/跳|jump/.test(lower)) return "jump";
  if (/功夫|kung\s*fu|martial|打拳|拳/.test(lower)) return "kungfu";
  if (/一齊笑|一起笑|笑埋我|laugh with|laugh together|哈哈/.test(lower)) {
    return "laugh";
  }
  if (/揮手|wave/.test(lower)) return "wave";
  if (/慶祝|celebrate|開心跳/.test(lower)) return "celebrate";
  return null;
}

/**
 * @param {string | null | undefined} text
 * @param {string | null | undefined} [taggedAction]
 */
export function inferActionFromReply(text, taggedAction = null) {
  if (taggedAction && COMPANION_ACTIONS.includes(taggedAction)) {
    return taggedAction === "none" ? null : taggedAction;
  }
  const parsed = parseReplyTags(text);
  if (parsed.action && parsed.action !== "none") return parsed.action;

  const lower = parsed.reply.toLowerCase();
  if (/跳起|跳一下|jump/.test(lower)) return "jump";
  if (/功夫|kung\s*fu|打拳|拳法/.test(lower)) return "kungfu";
  if (/哈哈|笑埋|laugh/.test(lower)) return "laugh";
  if (/揮手|wave/.test(lower)) return "wave";
  if (/慶祝|yay|celebrate/.test(lower)) return "celebrate";
  return null;
}

/**
 * @param {string} action
 */
export function actionDurationSec(action) {
  switch (String(action || "").toLowerCase()) {
    case "jump":
      return 1.05;
    case "laugh":
      return 2.8;
    case "kungfu":
      return 4.2;
    case "wave":
      return 1.8;
    case "celebrate":
      return 2.2;
    case "nod":
      return 0.9;
    case "thinking":
      return 2.2;
    default:
      return 1.4;
  }
}

/**
 * Sample a VRM body pose overlay for scripted actions.
 * @param {string} action
 * @param {number} phase 0..1 within action cycle
 * @param {number} elapsedSec wall clock for loops
 */
export function sampleActionBodyPose(action, phase, elapsedSec = 0) {
  const key = String(action || "").toLowerCase();
  const p = Math.max(0, Math.min(1, phase));
  const t = elapsedSec;
  /** @type {Record<string, number>} */
  const pose = {};

  switch (key) {
    case "jump": {
      const hop = Math.sin(p * Math.PI);
      pose.hipZ = hop * 0.12;
      pose.spineX = -hop * 0.2;
      pose.headX = -hop * 0.1;
      pose.armLiftL = hop * 0.22;
      pose.armLiftR = hop * 0.22;
      pose.forearmL = hop * 0.14;
      pose.forearmR = hop * 0.14;
      pose.leanY = hop * 0.06;
      break;
    }
    case "laugh": {
      const shake = Math.sin(t * 11.5) * 0.035;
      pose.headX = -0.04 + shake;
      pose.headZ = Math.sin(t * 8.2) * 0.04;
      pose.spineX = 0.02 + Math.abs(Math.sin(t * 10)) * 0.03;
      pose.armLiftL = 0.06 + Math.sin(t * 9) * 0.04;
      pose.armLiftR = 0.06 + Math.sin(t * 9 + 1) * 0.04;
      pose.leanY = Math.sin(t * 7.5) * 0.02;
      break;
    }
    case "kungfu": {
      const combo = Math.floor(t * 1.6) % 4;
      const beat = Math.sin(t * 8.4 + combo);
      if (combo === 0 || combo === 2) {
        pose.armLiftL = 0.2 + beat * 0.08;
        pose.armLiftR = 0.06;
        pose.forearmL = 0.16 + Math.max(0, beat) * 0.1;
        pose.leanY = beat * 0.08;
        pose.headZ = -0.08;
      } else {
        pose.armLiftR = 0.2 + beat * 0.08;
        pose.armLiftL = 0.06;
        pose.forearmR = 0.16 + Math.max(0, beat) * 0.1;
        pose.leanY = -beat * 0.08;
        pose.headZ = 0.08;
      }
      pose.spineX = 0.04 + Math.sin(t * 6.2) * 0.03;
      pose.hipZ = Math.sin(t * 5.5) * 0.06;
      break;
    }
    case "wave": {
      const w = Math.sin(t * 5.8);
      pose.armLiftR = 0.1 + w * 0.04;
      pose.forearmR = 0.08 + Math.max(0, w) * 0.06;
      pose.headZ = w * 0.03;
      break;
    }
    case "celebrate": {
      const c = Math.sin(t * 6.8);
      pose.armLiftL = 0.1 + c * 0.05;
      pose.armLiftR = 0.1 - c * 0.05;
      pose.headX = -0.05;
      pose.leanY = Math.sin(t * 5.2) * 0.03;
      break;
    }
    default:
      break;
  }

  return pose;
}

/**
 * @param {string} action
 */
export function actionLoops(action) {
  const key = String(action || "").toLowerCase();
  return key === "laugh" || key === "kungfu" || key === "celebrate";
}
