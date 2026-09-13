/**
 * Grok Ani–style body motion: emotion poses + talk gestures for VRM humanoid rigs.
 */
import { inferTalkGestureFromText } from "../face/talkGestures.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/** Standing pose offsets layered on top of lowered arms. */
const EMOTION_POSE = Object.freeze({
  neutral: {
    headX: 0,
    headZ: 0,
    spineX: 0.02,
    chestX: -0.01,
    hipZ: 0,
    armLiftL: 0.12,
    armLiftR: 0.12,
    leanY: 0,
  },
  happy: {
    headX: -0.04,
    headZ: 0.04,
    spineX: 0.03,
    chestX: 0,
    hipZ: -0.02,
    armLiftL: 0.35,
    armLiftR: 0.42,
    leanY: 0.03,
  },
  thinking: {
    headX: 0.07,
    headZ: -0.09,
    spineX: 0.05,
    chestX: 0.02,
    hipZ: 0.03,
    armLiftL: 0.82,
    armLiftR: 0.08,
    leanY: -0.02,
  },
  sad: {
    headX: 0.09,
    headZ: 0.05,
    spineX: 0.07,
    chestX: 0.04,
    hipZ: 0.04,
    armLiftL: 0.02,
    armLiftR: 0.02,
    leanY: 0.02,
  },
  surprised: {
    headX: -0.1,
    headZ: 0,
    spineX: -0.03,
    chestX: -0.02,
    hipZ: -0.03,
    armLiftL: 0.55,
    armLiftR: 0.55,
    leanY: -0.04,
  },
  angry: {
    headX: 0.05,
    headZ: -0.05,
    spineX: 0.06,
    chestX: 0.03,
    hipZ: 0,
    armLiftL: 0.28,
    armLiftR: 0.28,
    leanY: 0.01,
  },
});

/** Short gesture overlays (0–1 phase). */
const GESTURE_WAVE = Object.freeze({
  duration: 1.6,
  sample(phase) {
    const t = Math.sin(phase * Math.PI * 3) * (1 - phase * 0.35);
    return {
      armLiftR: 0.55 + t * 0.35,
      armLiftL: 0.1,
      headZ: 0.06,
      leanY: 0.04,
    };
  },
});

const GESTURE_CELEBRATE = Object.freeze({
  duration: 1.4,
  sample(phase) {
    const bounce = Math.sin(phase * Math.PI * 2) * (1 - phase);
    return {
      armLiftL: 0.7 + bounce * 0.2,
      armLiftR: 0.7 + bounce * 0.2,
      headX: -0.05,
      leanY: -0.03 - bounce * 0.02,
    };
  },
});

const GESTURE_THINKING = Object.freeze({
  duration: 2.2,
  sample(phase) {
    const ease = Math.min(1, phase * 2);
    return {
      armLiftL: 0.75 * ease,
      armLiftR: 0.05,
      headX: 0.08 * ease,
      headZ: -0.1 * ease,
    };
  },
});

const GESTURE_SHRUG = Object.freeze({
  duration: 1.3,
  sample(phase) {
    const up = Math.sin(phase * Math.PI);
    return {
      armLiftL: 0.25 + up * 0.2,
      armLiftR: 0.25 + up * 0.2,
      headZ: 0.03,
      spineX: 0.02 + up * 0.03,
    };
  },
});

const GESTURE_POINT = Object.freeze({
  duration: 1.5,
  sample(phase) {
    const ease = Math.min(1, phase * 2.5);
    return {
      armLiftR: 0.45 * ease,
      armLiftL: 0.08,
      headZ: -0.05 * ease,
      leanY: 0.02 * ease,
    };
  },
});

const GESTURE_QUESTION = Object.freeze({
  duration: 1.4,
  sample(phase) {
    const tilt = Math.sin(phase * Math.PI);
    return {
      headZ: -0.12 * tilt,
      armLiftL: 0.35 * tilt,
      armLiftR: 0.15,
    };
  },
});

const GESTURE_EXPLAIN = Object.freeze({
  duration: 2,
  sample(phase) {
    const sway = Math.sin(phase * Math.PI * 2);
    return {
      armLiftL: 0.3 + sway * 0.12,
      armLiftR: 0.35 - sway * 0.12,
      leanY: sway * 0.02,
    };
  },
});

const GESTURES = Object.freeze({
  wave: GESTURE_WAVE,
  celebrate: GESTURE_CELEBRATE,
  thinking: GESTURE_THINKING,
  shrug: GESTURE_SHRUG,
  point: GESTURE_POINT,
  question: GESTURE_QUESTION,
  explain: GESTURE_EXPLAIN,
  emphasize: GESTURE_CELEBRATE,
  soft: GESTURE_EXPLAIN,
  count: GESTURE_EXPLAIN,
});

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 */
export function createCompanionBodyMotion(humanoid) {
  let emotion = "neutral";
  /** @type {string | null} */
  let activeGesture = null;
  let gesturePhase = 0;
  let gestureDuration = 1;
  let talking = false;
  let talkEnergy = 0;
  let t0 = performance.now();

  const bone = (name) => humanoid?.getNormalizedBoneNode?.(name) || null;

  const setEmotion = (next) => {
    emotion = String(next || "neutral").toLowerCase();
    if (!EMOTION_POSE[emotion]) emotion = "neutral";
    return emotion;
  };

  const playGesture = (style) => {
    const key = String(style || "").toLowerCase();
    if (!GESTURES[key]) return false;
    activeGesture = key;
    gesturePhase = 0;
    gestureDuration = GESTURES[key].duration;
    return true;
  };

  const playGestureForText = (text, opts = {}) => {
    const style = inferTalkGestureFromText(text, {
      emotion: opts.emotion || emotion,
    });
    return playGesture(style);
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    if (!talking) talkEnergy = 0;
    return talking;
  };

  const setTalkEnergy = (v) => {
    talkEnergy = Math.max(0, Math.min(1, Number(v) || 0));
    return talkEnergy;
  };

  const applyPose = (pose, intensity = 1) => {
    if (!humanoid) return;
    const k = Math.max(0, Math.min(1, intensity));

    const lua = bone("leftUpperArm");
    const rua = bone("rightUpperArm");
    const lla = bone("leftLowerArm");
    const rla = bone("rightLowerArm");
    const head = bone("head");
    const spine = bone("spine");
    const chest = bone("chest");
    const hips = bone("hips");

    const baseArmZ = 1.4;
    const baseArmX = 0.12;
    const liftL = (pose.armLiftL ?? 0.12) * k;
    const liftR = (pose.armLiftR ?? 0.12) * k;

    if (lua) {
      lua.rotation.z = baseArmZ + liftL * 0.35;
      lua.rotation.x = baseArmX + (pose.spineX || 0) * 0.3;
      lua.rotation.y = 0;
    }
    if (rua) {
      rua.rotation.z = -baseArmZ - liftR * 0.35;
      rua.rotation.x = baseArmX + (pose.spineX || 0) * 0.3;
      rua.rotation.y = 0;
    }
    if (lla) {
      lla.rotation.z = 0.15 + liftL * 0.08;
      lla.rotation.x = 0.05;
    }
    if (rla) {
      rla.rotation.z = -0.15 - liftR * 0.08;
      rla.rotation.x = 0.05;
    }
    if (head) {
      head.rotation.x = (pose.headX || 0) * k;
      head.rotation.z = (pose.headZ || 0) * k;
    }
    if (spine) {
      spine.rotation.x = (pose.spineX || 0.02) * k;
      spine.rotation.y = (pose.leanY || 0) * k;
    }
    if (chest) {
      chest.rotation.x = (pose.chestX || -0.01) * k;
    }
    if (hips) {
      hips.rotation.z = (pose.hipZ || 0) * k;
    }
  };

  const update = (dt, opts = {}) => {
    const now = opts.now ?? performance.now();
    const elapsed = (now - t0) * 0.001;
    const base = EMOTION_POSE[emotion] || EMOTION_POSE.neutral;

    /** @type {Record<string, number>} */
    let pose = { ...base };

    const energy = talking ? Math.max(0.25, talkEnergy) : 0;

    // Idle life — subtle sway like Grok Ani
    if (!talking) {
      pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 0.9) * 0.025;
      pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 1.1 + 0.5) * 0.02;
      pose.spineX = (pose.spineX || 0) + Math.sin(elapsed * 1.4) * 0.008;
    } else {
      const beat = Math.sin(elapsed * 7.2);
      const beat2 = Math.sin(elapsed * 5.4 + 0.6);
      pose.headX = (pose.headX || 0) + beat * 0.022 * energy;
      pose.leanY = (pose.leanY || 0) + beat2 * 0.018 * energy;
      pose.armLiftL = (pose.armLiftL || 0) + beat * 0.14 * energy;
      pose.armLiftR = (pose.armLiftR || 0) + beat2 * 0.12 * energy;

      switch (emotion) {
        case "happy":
          pose.headZ = (pose.headZ || 0) + beat2 * 0.04 * energy;
          pose.hipZ = (pose.hipZ || 0) - beat * 0.02 * energy;
          break;
        case "thinking":
          pose.armLiftL = Math.max(pose.armLiftL || 0, 0.55 + beat * 0.08 * energy);
          pose.headX = (pose.headX || 0) + 0.04;
          break;
        case "sad":
          pose.headX = (pose.headX || 0) + 0.05;
          pose.armLiftL = (pose.armLiftL || 0) * 0.6;
          pose.armLiftR = (pose.armLiftR || 0) * 0.6;
          break;
        case "surprised":
          pose.armLiftL = (pose.armLiftL || 0) + 0.2 * energy;
          pose.armLiftR = (pose.armLiftR || 0) + 0.2 * energy;
          pose.headX = (pose.headX || 0) - 0.04 * energy;
          break;
        case "angry":
          pose.headZ = (pose.headZ || 0) - beat * 0.03 * energy;
          pose.spineX = (pose.spineX || 0) + 0.02 * energy;
          break;
        default:
          break;
      }
    }

    if (activeGesture) {
      gesturePhase += dt / gestureDuration;
      if (gesturePhase >= 1) {
        activeGesture = null;
        gesturePhase = 0;
      } else {
        const g = GESTURES[activeGesture];
        const overlay = g.sample(gesturePhase);
        pose = { ...pose, ...overlay };
      }
    }

    applyPose(pose, 1);
    return pose;
  };

  return {
    schema: COMPANION_BODY_SCHEMA,
    setEmotion,
    playGesture,
    playGestureForText,
    setTalking,
    setTalkEnergy,
    update,
    get emotion() {
      return emotion;
    },
    get activeGesture() {
      return activeGesture;
    },
  };
}

/**
 * Strip `[mood:happy]` tag from LLM replies and return emotion.
 * @param {string} text
 */
export function parseReplyMood(text) {
  const raw = String(text || "").trim();
  const moodMatch = raw.match(/\s*\[mood:(\w+)\]\s*$/i);
  if (moodMatch) {
    const emotion = moodMatch[1].toLowerCase();
    const reply = raw.replace(/\s*\[mood:\w+\]\s*$/i, "").trim();
    return { reply, emotion };
  }
  return { reply: raw, emotion: null };
}

/** Cantonese-first companion system prompt (Grok Ani tone). */
export const CANTONESE_COMPANION_PROMPT = [
  "You are Amoji, a playful anime companion like Grok Ani.",
  "ALWAYS reply in spoken Cantonese (粵語口語) with natural particles: 呀、啦、囉、咩、喎、嘛。",
  "Only use English if the user clearly writes in English.",
  "Keep replies short (1–3 sentences), warm, witty, and emotionally expressive.",
  "End EVERY reply with exactly one mood tag on its own: [mood:happy], [mood:thinking], [mood:sad], [mood:surprised], or [mood:angry].",
  "Pick the mood that matches your reply energy. Never mention being an AI.",
].join(" ");
