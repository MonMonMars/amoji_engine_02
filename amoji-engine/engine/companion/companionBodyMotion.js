/**
 * Grok Ani–style body motion: emotion poses + talk gestures for VRM humanoid rigs.
 */
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import {
  blendBodyPoses,
  inferTalkStyleFromChunk,
  sampleBodyTalkMotion,
} from "./companionTalkMotionBridge.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/** Standing pose offsets layered on top of lowered arms. */
const EMOTION_POSE = Object.freeze({
  neutral: {
    headX: 0,
    headZ: 0,
    spineX: 0.02,
    chestX: -0.01,
    hipZ: 0,
    armLiftL: 0.04,
    armLiftR: 0.04,
    leanY: 0,
  },
  happy: {
    headX: -0.03,
    headZ: 0.03,
    spineX: 0.02,
    chestX: 0,
    hipZ: -0.01,
    armLiftL: 0.1,
    armLiftR: 0.12,
    leanY: 0.02,
  },
  thinking: {
    headX: 0.05,
    headZ: -0.05,
    spineX: 0.03,
    chestX: 0.01,
    hipZ: 0.02,
    armLiftL: 0.22,
    armLiftR: 0.06,
    forearmL: 0.28,
    leanY: -0.01,
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
      armLiftR: 0.28 + t * 0.18,
      armLiftL: 0.06,
      forearmR: 0.12 + t * 0.08,
      headZ: 0.04,
      leanY: 0.02,
    };
  },
});

const GESTURE_CELEBRATE = Object.freeze({
  duration: 1.4,
  sample(phase) {
    const bounce = Math.sin(phase * Math.PI * 2) * (1 - phase);
    return {
      armLiftL: 0.32 + bounce * 0.12,
      armLiftR: 0.32 + bounce * 0.12,
      headX: -0.04,
      leanY: -0.02 - bounce * 0.01,
    };
  },
});

const GESTURE_THINKING = Object.freeze({
  duration: 2.2,
  sample(phase) {
    const ease = Math.min(1, phase * 2);
    return {
      armLiftL: 0.28 * ease,
      armLiftR: 0.05,
      forearmL: 0.22 * ease,
      headX: 0.05 * ease,
      headZ: -0.06 * ease,
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

const GESTURE_NOD = Object.freeze({
  duration: 0.9,
  sample(phase) {
    const nod = Math.sin(phase * Math.PI * 2);
    return {
      headX: -0.12 * nod,
      leanY: nod * 0.02,
    };
  },
});

const GESTURE_DISAGREE = Object.freeze({
  duration: 1.1,
  sample(phase) {
    const shake = Math.sin(phase * Math.PI * 4);
    return {
      headZ: shake * 0.14,
      armLiftL: 0.18,
      armLiftR: 0.18,
    };
  },
});

const GESTURE_LEAN = Object.freeze({
  duration: 1.8,
  sample(phase) {
    const ease = Math.min(1, phase * 1.8);
    return {
      leanY: 0.08 * ease,
      headX: 0.05 * ease,
      armLiftL: 0.22 * ease,
      armLiftR: 0.28 * ease,
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
  nod: GESTURE_NOD,
  disagree: GESTURE_DISAGREE,
  lean: GESTURE_LEAN,
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
  let talkStyle = "explain";
  let talkTime = 0;
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
    talkStyle = style;
    talkTime = 0;
    return playGesture(style);
  };

  const setTalkStyle = (style) => {
    const key = String(style || "").toLowerCase();
    if (GESTURES[key] || key === "explain") {
      talkStyle = key;
      talkTime = 0;
      return talkStyle;
    }
    talkStyle = inferTalkGestureFromText(key, { emotion });
    talkTime = 0;
    return talkStyle;
  };

  const reactToSpeechChunk = (chunk, opts = {}) => {
    const next = inferTalkStyleFromChunk(chunk, {
      emotion: opts.emotion || emotion,
      prevStyle: talkStyle,
    });
    if (next !== talkStyle) {
      talkStyle = next;
      talkTime = 0;
    }
    return talkStyle;
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    if (!talking) {
      talkEnergy = 0;
      talkTime = 0;
    } else {
      talkTime = 0;
    }
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

    // A-pose VRM models (companion-girl.vrm): rest is near zero — avoid T-pose
    // correction (~1.4 rad) which pins arms up into the hair.
    const baseArmZ = 0.1;
    const baseArmX = 0.05;
    const liftL = Math.min(0.45, (pose.armLiftL ?? 0.04) * k);
    const liftR = Math.min(0.45, (pose.armLiftR ?? 0.04) * k);

    if (lua) {
      lua.rotation.z = baseArmZ + liftL * 0.55;
      lua.rotation.x = baseArmX + (pose.spineX || 0) * 0.2;
      lua.rotation.y = 0;
    }
    if (rua) {
      rua.rotation.z = -baseArmZ - liftR * 0.55;
      rua.rotation.x = baseArmX + (pose.spineX || 0) * 0.2;
      rua.rotation.y = 0;
    }
    const foreL = (pose.forearmL ?? 0) * k;
    const foreR = (pose.forearmR ?? 0) * k;
    if (lla) {
      lla.rotation.z = 0.15 + liftL * 0.08 + (pose.handWaveL || 0) * k;
      lla.rotation.x = 0.05 + foreL;
    }
    if (rla) {
      rla.rotation.z = -0.15 - liftR * 0.08 + (pose.handWaveR || 0) * k;
      rla.rotation.x = 0.05 + foreR;
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
      talkTime += dt;
      const motion = sampleBodyTalkMotion(talkTime, {
        style: talkStyle,
        emotion,
        speechEnergy: energy,
      });
      pose = blendBodyPoses(pose, motion.body, 0.32 + energy * 0.28);

      const beat = Math.sin(elapsed * 7.2);
      const beat2 = Math.sin(elapsed * 5.4 + 0.6);
      pose.headX = (pose.headX || 0) + beat * 0.018 * energy;
      pose.leanY = (pose.leanY || 0) + beat2 * 0.014 * energy;

      switch (emotion) {
        case "happy":
          pose.headZ = (pose.headZ || 0) + beat2 * 0.04 * energy;
          pose.hipZ = (pose.hipZ || 0) - beat * 0.02 * energy;
          break;
        case "thinking":
          pose.forearmL = Math.max(pose.forearmL || 0, 0.2 + beat * 0.04 * energy);
          pose.headX = (pose.headX || 0) + 0.03;
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
    setTalkStyle,
    reactToSpeechChunk,
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
