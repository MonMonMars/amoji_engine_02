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
  const amp = 1.75;
  /** @type {Record<string, number>} */
  const pose = {};

  switch (key) {
    case "jump": {
      const hop = Math.sin(p * Math.PI);
      pose.hipZ = hop * 0.12 * amp;
      pose.spineX = -hop * 0.2 * amp;
      pose.headX = -hop * 0.1 * amp;
      pose.armLiftL = hop * 0.22 * amp;
      pose.armLiftR = hop * 0.22 * amp;
      pose.forearmL = hop * 0.14 * amp;
      pose.forearmR = hop * 0.14 * amp;
      pose.leanY = hop * 0.06 * amp;
      break;
    }
    case "laugh": {
      const shake = Math.sin(t * 11.5) * 0.035 * amp;
      pose.headX = -0.04 * amp + shake;
      pose.headZ = Math.sin(t * 8.2) * 0.04 * amp;
      pose.spineX = 0.02 * amp + Math.abs(Math.sin(t * 10)) * 0.03 * amp;
      pose.armLiftL = 0.06 * amp + Math.sin(t * 9) * 0.04 * amp;
      pose.armLiftR = 0.06 * amp + Math.sin(t * 9 + 1) * 0.04 * amp;
      pose.leanY = Math.sin(t * 7.5) * 0.02 * amp;
      break;
    }
    case "kungfu": {
      const combo = Math.floor(t * 1.6) % 4;
      const beat = Math.sin(t * 8.4 + combo);
      if (combo === 0 || combo === 2) {
        pose.armLiftL = 0.2 * amp + beat * 0.08 * amp;
        pose.armLiftR = 0.06 * amp;
        pose.forearmL = 0.16 * amp + Math.max(0, beat) * 0.1 * amp;
        pose.leanY = beat * 0.08 * amp;
        pose.headZ = -0.08 * amp;
      } else {
        pose.armLiftR = 0.2 * amp + beat * 0.08 * amp;
        pose.armLiftL = 0.06 * amp;
        pose.forearmR = 0.16 * amp + Math.max(0, beat) * 0.1 * amp;
        pose.leanY = -beat * 0.08 * amp;
        pose.headZ = 0.08 * amp;
      }
      pose.spineX = 0.04 * amp + Math.sin(t * 6.2) * 0.03 * amp;
      pose.hipZ = Math.sin(t * 5.5) * 0.06 * amp;
      break;
    }
    case "wave": {
      const w = Math.sin(t * 5.8);
      pose.armLiftR = 0.1 * amp + w * 0.04 * amp;
      pose.forearmR = 0.08 * amp + Math.max(0, w) * 0.06 * amp;
      pose.headZ = w * 0.03 * amp;
      break;
    }
    case "celebrate": {
      const c = Math.sin(t * 6.8);
      pose.armLiftL = 0.1 * amp + c * 0.05 * amp;
      pose.armLiftR = 0.1 * amp - c * 0.05 * amp;
      pose.headX = -0.05 * amp;
      pose.leanY = Math.sin(t * 5.2) * 0.03 * amp;
      break;
    }
    default:
      break;
  }

  return pose;
}

/**
 * Whole-body root motion so actions read clearly on small screens.
 * @param {string} action
 * @param {number} phase 0..1
 * @param {number} elapsedSec
 * @returns {{ y: number, rotY: number }}
 */
export function sampleActionRootMotion(action, phase, elapsedSec = 0) {
  const key = String(action || "").toLowerCase();
  const p = Math.max(0, Math.min(1, phase));
  const t = elapsedSec;

  const amp = 1.85;
  switch (key) {
    case "jump": {
      const hop = Math.sin(p * Math.PI);
      return { y: hop * 0.14 * amp, rotY: 0 };
    }
    case "kungfu": {
      const combo = Math.floor(t * 1.6) % 4;
      const beat = Math.sin(t * 8.4 + combo);
      return { y: Math.abs(beat) * 0.02 * amp, rotY: beat * 0.18 * amp };
    }
    case "laugh": {
      return {
        y: Math.sin(t * 10) * 0.015 * amp,
        rotY: Math.sin(t * 7.5) * 0.06 * amp,
      };
    }
    case "celebrate": {
      return {
        y: Math.sin(t * 6.8) * 0.03 * amp,
        rotY: Math.sin(t * 5.2) * 0.1 * amp,
      };
    }
    case "wave": {
      return { y: 0, rotY: Math.sin(t * 5.8) * 0.05 * amp };
    }
    default:
      return { y: 0, rotY: 0 };
  }
}

/**
 * @param {string} action
 */
export function actionLoops(action) {
  const key = String(action || "").toLowerCase();
  return key === "laugh" || key === "kungfu" || key === "celebrate";
}
