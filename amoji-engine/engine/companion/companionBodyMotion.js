/**
 * VRM body motion — rest/listen arms-down; talkGestures library while speaking.
 */
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import {
  inferTalkStyleFromChunk,
  sampleBodyTalkMotion,
} from "./companionTalkMotionBridge.js";
import {
  buildBasePose,
  clampArmPose,
  companionGestureStyle,
  GESTURE_DURATION_SEC,
  HEAD_GESTURE_NOD,
  mergePoses,
  sampleVrmTalkPose,
} from "./companionPoseLibrary.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 */
export function createCompanionBodyMotion(humanoid) {
  let emotion = "neutral";
  let listening = false;
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
    humanoid?.resetNormalizedPose?.();
    return emotion;
  };

  const setListening = (on) => {
    listening = Boolean(on);
    humanoid?.resetNormalizedPose?.();
    return listening;
  };

  const playGesture = (style) => {
    const key = companionGestureStyle(style);
    if (key === "nod") {
      activeGesture = "nod";
      gesturePhase = 0;
      gestureDuration = HEAD_GESTURE_NOD.duration;
      return true;
    }
    activeGesture = key;
    gesturePhase = 0;
    gestureDuration = GESTURE_DURATION_SEC[key] || 1.5;
    humanoid?.resetNormalizedPose?.();
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
    talkStyle = companionGestureStyle(style || talkStyle);
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
    // Do not call resetNormalizedPose every frame — it walks the full skeleton
    // and can freeze WebGL on desktop GPUs. We set absolute rotations each frame.
    const k = Math.max(0, Math.min(1, intensity));
    const safe = clampArmPose(pose);

    const lua = bone("leftUpperArm");
    const rua = bone("rightUpperArm");
    const lla = bone("leftLowerArm");
    const rla = bone("rightLowerArm");
    const head = bone("head");
    const spine = bone("spine");
    const chest = bone("chest");
    const hips = bone("hips");

    const baseArmZ = 0;
    const baseArmX = 0.03;
    const liftL = Math.min(0.14, (safe.armLiftL ?? 0.02) * k);
    const liftR = Math.min(0.14, (safe.armLiftR ?? 0.02) * k);

    if (lua) {
      lua.rotation.z = baseArmZ + liftL * 0.35;
      lua.rotation.x = baseArmX + (safe.spineX || 0) * 0.1;
      lua.rotation.y = 0;
    }
    if (rua) {
      rua.rotation.z = -baseArmZ - liftR * 0.35;
      rua.rotation.x = baseArmX + (safe.spineX || 0) * 0.1;
      rua.rotation.y = 0;
    }
    const foreL = Math.min(0.1, (safe.forearmL ?? 0) * k);
    const foreR = Math.min(0.1, (safe.forearmR ?? 0) * k);
    if (lla) {
      lla.rotation.z = 0.02 + liftL * 0.03;
      lla.rotation.x = 0.02 + foreL;
    }
    if (rla) {
      rla.rotation.z = -0.02 - liftR * 0.03;
      rla.rotation.x = 0.02 + foreR;
    }
    if (head) {
      head.rotation.x = (safe.headX || 0) * k;
      head.rotation.z = (safe.headZ || 0) * k;
    }
    if (spine) {
      spine.rotation.x = (safe.spineX || 0.01) * k;
      spine.rotation.y = (safe.leanY || 0) * k;
    }
    if (chest) {
      chest.rotation.x = (safe.chestX || -0.01) * k;
    }
    if (hips) {
      hips.rotation.z = (safe.hipZ || 0) * k;
    }
  };

  const update = (dt, opts = {}) => {
    const now = opts.now ?? performance.now();
    const elapsed = (now - t0) * 0.001;

    let pose = buildBasePose({ listening, emotion });
    const energy = talking ? Math.max(0.2, talkEnergy) : 0;

    if (!talking) {
      pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 0.85) * 0.018;
      pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 1.05 + 0.5) * 0.015;
      if (listening) {
        pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.6) * 0.012;
      }
    } else {
      talkTime += dt;
      const motion = sampleBodyTalkMotion(talkTime, {
        style: companionGestureStyle(talkStyle),
        emotion,
        speechEnergy: energy,
        includeArms: false,
      });
      pose = mergePoses(pose, motion.body, 0.22 + energy * 0.15);

      const beat = Math.sin(elapsed * 6.8);
      pose.headX = (pose.headX || 0) + beat * 0.012 * energy;
      pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 5.2) * 0.01 * energy;
    }

    if (activeGesture) {
      gesturePhase += dt / gestureDuration;
      if (gesturePhase >= 1) {
        activeGesture = null;
        gesturePhase = 0;
      } else if (activeGesture === "nod") {
        pose = mergePoses(pose, HEAD_GESTURE_NOD.sample(gesturePhase), 1);
      } else {
        const tSec = gesturePhase * gestureDuration;
        const overlay = sampleVrmTalkPose(activeGesture, tSec, {
          emotion,
          speechEnergy: 0.3,
          intensity: 0.32,
          includeArms: activeGesture === "point",
        });
        const fade = gesturePhase < 0.15
          ? gesturePhase / 0.15
          : gesturePhase > 0.85
            ? (1 - gesturePhase) / 0.15
            : 1;
        pose = mergePoses(pose, overlay, 0.22 * fade);
      }
    }

    applyPose(pose, 1);
    return pose;
  };

  return {
    schema: COMPANION_BODY_SCHEMA,
    setEmotion,
    setListening,
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
    get listening() {
      return listening;
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
    const parsedEmotion = moodMatch[1].toLowerCase();
    const reply = raw.replace(/\s*\[mood:\w+\]\s*$/i, "").trim();
    return { reply, emotion: parsedEmotion };
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
