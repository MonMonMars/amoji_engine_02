/**
 * VRM body motion — rest/listen arms-down; talkGestures library while speaking.
 */
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import {
  inferTalkStyleFromChunk,
  sampleBodyTalkMotion,
} from "./companionTalkMotionBridge.js";
import {
  analyzeCompanionReply,
  analyzeSpeechChunk,
  analyzeStreamingReply,
  analyzeUserInput,
} from "./companionContentMotion.js";
import {
  actionDurationSec,
  actionLoops,
  sampleActionBodyPose,
} from "./companionActionMotion.js";
import {
  buildBasePose,
  clampArmPose,
  companionGestureStyle,
  GESTURE_DURATION_SEC,
  HEAD_GESTURE_NOD,
  mergePoses,
  sampleVrmTalkPose,
  VRM_ARM_REST_ROTATIONS,
} from "./companionPoseLibrary.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 */
export function createCompanionBodyMotion(humanoid) {
  let emotion = "neutral";
  let nuance = "none";
  let thinking = false;
  let listening = false;
  let lastChunkAt = 0;
  let styleCycle = 0;
  /** @type {string | null} */
  let activeGesture = null;
  let gesturePhase = 0;
  let gestureDuration = 1;
  let talking = false;
  let talkEnergy = 0;
  let talkStyle = "explain";
  let talkTime = 0;
  let t0 = performance.now();
  /** @type {string | null} */
  let activeAction = null;
  let actionPhase = 0;
  let actionDuration = 1;
  let actionElapsed = 0;
  let actionLoop = false;

  const bone = (name) => humanoid?.getNormalizedBoneNode?.(name) || null;

  const setEmotion = (next) => {
    emotion = String(next || "neutral").toLowerCase();
    return emotion;
  };

  const setContentNuance = (next) => {
    nuance = String(next || "none").toLowerCase();
    return nuance;
  };

  const setListening = (on) => {
    listening = Boolean(on);
    if (listening) thinking = false;
    return listening;
  };

  const setThinking = (on) => {
    thinking = Boolean(on);
    if (thinking) {
      emotion = "thinking";
      talkStyle = "thinking";
      talkTime = 0;
      listening = false;
    }
    return thinking;
  };

  const playGesture = (style) => {
    const key = companionGestureStyle(style);
    if (key === "nod") {
      activeGesture = "nod";
      gesturePhase = 0;
      gestureDuration = HEAD_GESTURE_NOD.duration;
      return true;
    }
    if (key === "point") {
      activeGesture = "point";
      gesturePhase = 0;
      gestureDuration = GESTURE_DURATION_SEC.point;
      return true;
    }
    talkStyle = key;
    talkTime = 0;
    return true;
  };

  const playGestureForText = (text, opts = {}) => {
    const analysis = analyzeCompanionReply(text, opts.emotion || emotion);
    if (opts.emotion) emotion = analysis.emotion;
    nuance = analysis.nuance;
    talkStyle = companionGestureStyle(analysis.talkStyle);
    talkTime = 0;
    setTalkEnergy(analysis.speechEnergy);
    if (analysis.gesture) {
      return playGesture(analysis.gesture);
    }
    if (talkStyle === "nod" || talkStyle === "point") {
      return playGesture(talkStyle);
    }
    return true;
  };

  const stopAction = () => {
    activeAction = null;
    actionPhase = 0;
    actionElapsed = 0;
    actionLoop = false;
    return true;
  };

  const playAction = (action, opts = {}) => {
    const key = String(action || "").toLowerCase();
    if (!key || key === "none" || key === "stop") {
      stopAction();
      if (key === "stop") {
        setTalking(false);
        thinking = false;
      }
      return false;
    }
    activeAction = key;
    actionPhase = 0;
    actionElapsed = 0;
    actionDuration = actionDurationSec(key);
    actionLoop = opts.loop ?? actionLoops(key);
    if (key === "laugh") {
      emotion = "happy";
      setTalkEnergy(0.72);
    } else if (key === "kungfu") {
      emotion = opts.emotion || "neutral";
      setTalkEnergy(0.78);
    } else if (key === "jump" || key === "celebrate") {
      emotion = "happy";
      setTalkEnergy(0.65);
    }
    talkTime = 0;
    return true;
  };

  const applyContentFromReply = (text, moodHint = null) => {
    const analysis = analyzeCompanionReply(text, moodHint || emotion);
    emotion = analysis.emotion;
    nuance = analysis.nuance;
    talkStyle = companionGestureStyle(analysis.talkStyle);
    talkTime = 0;
    setTalkEnergy(analysis.speechEnergy);
    if (analysis.action) {
      playAction(analysis.action, { emotion: analysis.emotion });
    } else if (analysis.gesture) {
      playGesture(analysis.gesture);
    }
    return analysis;
  };

  const setTalkStyle = (style) => {
    talkStyle = companionGestureStyle(style || talkStyle);
    talkTime = 0;
    return talkStyle;
  };

  const reactToSpeechChunk = (chunk, opts = {}) => {
    const analysis = analyzeSpeechChunk(chunk, {
      emotion: opts.emotion || emotion,
      nuance: opts.nuance || nuance,
    });
    if (analysis.emotion && analysis.emotion !== "neutral") {
      emotion = analysis.emotion;
    }
    if (analysis.nuance && analysis.nuance !== "none") {
      nuance = analysis.nuance;
    }
    const next = companionGestureStyle(analysis.talkStyle);
    if (next !== talkStyle || analysis.boundary) {
      talkStyle = next;
      talkTime = 0;
      setTalkEnergy(analysis.speechEnergy);
    }
    lastChunkAt = performance.now();
    if (analysis.gesture && !activeGesture) {
      playGesture(analysis.gesture);
    } else if (analysis.boundary && Math.random() < 0.58) {
      playGesture("nod");
    } else if (Math.random() < 0.08) {
      talkStyle = companionGestureStyle(analysis.talkStyle);
      talkTime = 0;
    }
    return analysis;
  };

  const applyStreamingContent = (partialText) => {
    const analysis = analyzeStreamingReply(partialText);
    emotion = analysis.emotion;
    nuance = analysis.nuance;
    talkStyle = companionGestureStyle(analysis.talkStyle);
    talkTime = 0;
    setTalkEnergy(analysis.speechEnergy);
    return analysis;
  };

  const prepareThinkingFromUser = (userText, isEnglish = false) => {
    const input = analyzeUserInput(userText, isEnglish);
    emotion = input.emotion === "neutral" ? "thinking" : input.emotion;
    nuance = input.nuance;
    talkStyle = "thinking";
    talkTime = 0;
    setTalkEnergy(0.25);
    return input;
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

  const ARM_BONE_NAMES = [
    "leftUpperArm",
    "rightUpperArm",
    "leftLowerArm",
    "rightLowerArm",
  ];

  const applyBoneRotation = (name, rot) => {
    const b = bone(name);
    if (!b || !rot) return;
    b.rotation.x = rot.x ?? 0;
    b.rotation.y = rot.y ?? 0;
    b.rotation.z = rot.z ?? 0;
  };

  const applyArmRest = () => {
    for (const name of ARM_BONE_NAMES) {
      applyBoneRotation(name, VRM_ARM_REST_ROTATIONS[name]);
    }
  };

  const applyPointArms = (pose, k) => {
    const safe = clampArmPose(pose);
    const restL = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    const restR = VRM_ARM_REST_ROTATIONS.rightUpperArm;
    const restLl = VRM_ARM_REST_ROTATIONS.leftLowerArm;
    const restRl = VRM_ARM_REST_ROTATIONS.rightLowerArm;
    const liftL = Math.min(0.22, (safe.armLiftL ?? 0) * k);
    const liftR = Math.min(0.22, (safe.armLiftR ?? 0) * k);
    const foreL = Math.min(0.18, (safe.forearmL ?? 0) * k);
    const foreR = Math.min(0.18, (safe.forearmR ?? 0) * k);
    applyBoneRotation("leftUpperArm", {
      x: restL.x,
      y: restL.y,
      z: restL.z + liftL * 0.45,
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x,
      y: restR.y,
      z: restR.z - liftR * 0.45,
    });
    applyBoneRotation("leftLowerArm", {
      x: restLl.x + foreL,
      y: restLl.y,
      z: restLl.z,
    });
    applyBoneRotation("rightLowerArm", {
      x: restRl.x + foreR,
      y: restRl.y,
      z: restRl.z,
    });
  };

  const applyTalkArms = (pose, k) => {
    const safe = clampArmPose(pose);
    const restL = VRM_ARM_REST_ROTATIONS.leftUpperArm;
    const restR = VRM_ARM_REST_ROTATIONS.rightUpperArm;
    const restLl = VRM_ARM_REST_ROTATIONS.leftLowerArm;
    const restRl = VRM_ARM_REST_ROTATIONS.rightLowerArm;
    const liftL = Math.min(0.14, (safe.armLiftL ?? 0) * k);
    const liftR = Math.min(0.14, (safe.armLiftR ?? 0) * k);
    const foreL = Math.min(0.12, (safe.forearmL ?? 0) * k);
    const foreR = Math.min(0.12, (safe.forearmR ?? 0) * k);
    applyBoneRotation("leftUpperArm", {
      x: restL.x + Math.sin(talkTime * 3.2) * 0.02 * k,
      y: restL.y,
      z: restL.z + liftL * 0.55,
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x + Math.sin(talkTime * 3.2 + 1.1) * 0.02 * k,
      y: restR.y,
      z: restR.z - liftR * 0.55,
    });
    applyBoneRotation("leftLowerArm", {
      x: restLl.x + foreL,
      y: restLl.y,
      z: restLl.z,
    });
    applyBoneRotation("rightLowerArm", {
      x: restRl.x + foreR,
      y: restRl.y,
      z: restRl.z,
    });
  };

  const applyPose = (pose, intensity = 1, opts = {}) => {
    if (!humanoid) return;
    const k = Math.max(0, Math.min(1, intensity));
    const allowArms = opts.allowArms === true;
    const talkArmBlend = Number(opts.talkArmBlend) || 0;

    if (allowArms) {
      applyPointArms(pose, k);
    } else if (talkArmBlend > 0.01) {
      applyTalkArms(pose, talkArmBlend);
    } else {
      applyArmRest();
    }

    const head = bone("head");
    const spine = bone("spine");
    const chest = bone("chest");
    const hips = bone("hips");

    if (head) {
      head.rotation.x = (pose.headX || 0) * k;
      head.rotation.z = (pose.headZ || 0) * k;
    }
    if (spine) {
      spine.rotation.x = (pose.spineX || 0.01) * k;
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

    let pose = buildBasePose({ listening, emotion, nuance });
    const energy = talking ? Math.max(0.2, talkEnergy) : 0;

    if (activeAction) {
      actionElapsed += dt;
      actionPhase = (actionElapsed % actionDuration) / actionDuration;
      const actionPose = clampArmPose(
        sampleActionBodyPose(activeAction, actionPhase, actionElapsed),
      );
      const actionBlend =
        activeAction === "kungfu" || activeAction === "laugh" ? 0.78 : 0.68;
      pose = mergePoses(pose, actionPose, actionBlend);
      if (!actionLoop && actionElapsed >= actionDuration) {
        stopAction();
      }
    } else if (thinking && !talking) {
      const thinkMotion = sampleBodyTalkMotion(elapsed, {
        style: companionGestureStyle("thinking"),
        emotion: "thinking",
        speechEnergy: 0.28,
        includeArms: true,
      });
      pose = mergePoses(pose, thinkMotion.body, 0.64);
      pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.72) * 0.042;
      pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 0.55 + 0.8) * 0.034;
    } else if (!talking) {
      pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 0.95) * 0.028;
      pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 1.2 + 0.5) * 0.022;
      pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.78) * 0.016;
      if (listening) {
        pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.85) * 0.018;
      }
    } else {
      talkTime += dt;
      const nowMs = performance.now();
      if (nowMs - lastChunkAt > 850) {
        styleCycle += 1;
        const styles = ["explain", "soft", "question", "emphasize"];
        talkStyle = companionGestureStyle(
          styles[styleCycle % styles.length] || talkStyle,
        );
        talkTime = 0;
        lastChunkAt = nowMs;
      }
      const motion = sampleBodyTalkMotion(talkTime, {
        style: companionGestureStyle(talkStyle),
        emotion,
        speechEnergy: energy,
        includeArms: true,
      });
      const talkBlend = 0.5 + energy * 0.38;
      pose = mergePoses(pose, motion.body, talkBlend);

      const beat = Math.sin(elapsed * 7.4);
      const sway = Math.sin(elapsed * 3.6 + talkTime * 2.1);
      pose.headX = (pose.headX || 0) + beat * 0.032 * energy + sway * 0.012;
      pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 5.8) * 0.026 * energy;
      pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 4.6) * 0.02 * energy;
      pose.spineX = (pose.spineX || 0) + Math.sin(elapsed * 4.2) * 0.015 * energy;
    }

    let allowArms = false;
    let talkArmBlend = 0;
    if (talking && !activeGesture) {
      talkArmBlend = 0.28 + energy * 0.32;
    }
    if (activeGesture) {
      gesturePhase += dt / gestureDuration;
      if (gesturePhase >= 1) {
        activeGesture = null;
        gesturePhase = 0;
      } else if (activeGesture === "nod") {
        pose = mergePoses(pose, HEAD_GESTURE_NOD.sample(gesturePhase), 1);
      } else if (activeGesture === "point") {
        const tSec = gesturePhase * gestureDuration;
        const overlay = sampleVrmTalkPose("point", tSec, {
          emotion,
          speechEnergy: 0.3,
          intensity: 0.32,
          includeArms: true,
        });
        const fade = gesturePhase < 0.15
          ? gesturePhase / 0.15
          : gesturePhase > 0.85
            ? (1 - gesturePhase) / 0.15
            : 1;
        pose = mergePoses(pose, overlay, 0.22 * fade);
        allowArms = true;
      }
    }

    applyPose(pose, 1, { allowArms, talkArmBlend });
    return pose;
  };

  return {
    schema: COMPANION_BODY_SCHEMA,
    setEmotion,
    setContentNuance,
    setThinking,
    setListening,
    playGesture,
    playAction,
    stopAction,
    playGestureForText,
    applyContentFromReply,
    applyStreamingContent,
    prepareThinkingFromUser,
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
    get currentAction() {
      return activeAction;
    },
  };
}

export { parseReplyMood } from "./companionContentMotion.js";

/** Cantonese-first companion system prompt (anime companion tone). */
export const CANTONESE_COMPANION_PROMPT = [
  "You are Amoji, a playful anime companion.",
  "ALWAYS reply in spoken Cantonese (粵語口語) with natural particles: 呀、啦、囉、咩、喎、嘛。",
  "Only use English if the user clearly writes in English.",
  "Keep replies short (1–3 sentences), warm, witty, and emotionally expressive.",
  "End EVERY reply with exactly one mood tag: [mood:happy], [mood:thinking], [mood:sad], [mood:surprised], or [mood:angry].",
  "When the user asks you to MOVE or PERFORM (jump, laugh together, kung fu, wave, celebrate, stop), add an action tag before the mood tag: [action:jump], [action:laugh], [action:kungfu], [action:wave], [action:celebrate], or [action:stop].",
  "If the user says stop / 停 / 唔好再動, reply briefly and use [action:stop].",
  "Pick mood + action that match your reply energy. Never mention being an AI.",
].join(" ");

/** English companion mode — free Edge TTS + English replies. */
export const ENGLISH_COMPANION_PROMPT = [
  "You are Amoji, a playful anime companion.",
  "ALWAYS reply in natural spoken English.",
  "Keep replies short (1–3 sentences), warm, witty, and emotionally expressive.",
  "End EVERY reply with exactly one mood tag: [mood:happy], [mood:thinking], [mood:sad], [mood:surprised], or [mood:angry].",
  "When the user asks you to jump, laugh with them, do kung fu, wave, celebrate, or stop moving, add [action:jump], [action:laugh], [action:kungfu], [action:wave], [action:celebrate], or [action:stop] before the mood tag.",
  "If the user says stop, reply briefly and use [action:stop].",
  "Pick mood + action that match your reply energy. Never mention being an AI.",
].join(" ");
