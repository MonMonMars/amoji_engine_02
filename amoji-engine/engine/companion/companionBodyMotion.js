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
  getActionDefExtended,
  resolveAction,
  sampleActionBodyPose,
  sampleActionRootMotion,
} from "./companionActionMotion.js";
import { buildCharacterSystemPrompt } from "./companionCharacterCatalog.js";
import {
  advanceIdleBeat,
  createIdleBeatState,
  sampleIdleBodyMotion,
} from "./companionIdleMotion.js";
import {
  dampPose,
  dampRootMotion,
  poseDampingRate,
} from "./companionPoseSmoothing.js";
import {
  buildBasePose,
  clampActionPose,
  clampArmPose,
  companionGestureStyle,
  VRM_LEG_REST_ROTATIONS,
  GESTURE_DURATION_SEC,
  HEAD_GESTURE_NOD,
  mergePoses,
  REST_POSE,
  sampleVrmTalkPose,
  VRM_ARM_REST_ROTATIONS,
} from "./companionPoseLibrary.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {{ armRestRotations?: typeof VRM_ARM_REST_ROTATIONS }} [opts]
 */
export function createCompanionBodyMotion(humanoid, opts = {}) {
  let armRestRotations = opts.armRestRotations || VRM_ARM_REST_ROTATIONS;
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
  /** @type {{ y: number, rotY: number }} */
  let rootMotion = { y: 0, rotY: 0 };
  /** @type {{ y: number, rotY: number }} */
  let smoothedRootMotion = { y: 0, rotY: 0 };
  /** @type {Record<string, number>} */
  let smoothedPose = { ...REST_POSE };
  let idleBeatState = createIdleBeatState();
  /** @type {string[]} */
  let actionQueue = [];
  /** @type {string[]} */
  let savedSequence = [];
  let sequenceLoop = false;
  /** @type {((info: { completed: string | null, next: string | null, sequenceDone?: boolean }) => void) | null} */
  let onActionComplete = null;

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

  const resetActiveAction = () => {
    activeAction = null;
    actionPhase = 0;
    actionElapsed = 0;
    actionLoop = false;
    rootMotion = { y: 0, rotY: 0 };
    return true;
  };

  const stopAction = () => {
    resetActiveAction();
    actionQueue = [];
    savedSequence = [];
    sequenceLoop = false;
    return true;
  };

  const clearActionQueue = () => {
    actionQueue = [];
    savedSequence = [];
    sequenceLoop = false;
    return true;
  };

  const shiftQueuedAction = () => {
    if (!actionQueue.length) {
      if (sequenceLoop && savedSequence.length) {
        actionQueue = [...savedSequence];
      } else {
        return false;
      }
    }
    const next = actionQueue.shift();
    if (!next) return false;
    return playAction(next, { loop: false, fromQueue: true });
  };

  const finishActionStep = () => {
    const completed = activeAction;
    resetActiveAction();
    if (!actionQueue.length && sequenceLoop && savedSequence.length) {
      actionQueue = [...savedSequence];
    }
    if (actionQueue.length) {
      const next = actionQueue[0] || null;
      shiftQueuedAction();
      onActionComplete?.({ completed, next, sequenceDone: false });
      return;
    }
    onActionComplete?.({ completed, next: null, sequenceDone: true });
  };

  const playAction = (action, opts = {}) => {
    const key = resolveAction(action) || String(action || "").toLowerCase();
    if (!key || key === "none" || key === "stop") {
      stopAction();
      if (key === "stop") {
        setTalking(false);
        thinking = false;
      }
      return false;
    }
    if (!opts.fromQueue) {
      actionQueue = [];
      savedSequence = [];
      sequenceLoop = false;
    }
    if (!getActionDefExtended(key)) return false;
    activeAction = key;
    actionPhase = 0;
    actionElapsed = 0;
    actionDuration = actionDurationSec(key);
    actionLoop = opts.loop ?? actionLoops(key);
    const def = getActionDefExtended(key);
    if (opts.emotion && opts.emotion !== "neutral") {
      emotion = opts.emotion;
    } else if (def?.emotion) {
      emotion = def.emotion;
    }
    if (key === "laugh") setTalkEnergy(0.72);
    else if (key === "kungfu") setTalkEnergy(0.78);
    else if (
      key === "jump" ||
      key === "celebrate" ||
      key === "dance" ||
      key === "cheer"
    ) {
      setTalkEnergy(0.65);
    } else if (key === "angry" || key === "punch" || key === "kick") {
      setTalkEnergy(0.7);
    } else if (key === "thinking") {
      setTalkEnergy(0.32);
    }
    talkTime = 0;
    return true;
  };

  /**
   * Play several actions back-to-back (combos / showcases).
   * @param {string[]} actions
   * @param {{ loopSequence?: boolean, emotion?: string }} [opts]
   */
  const playActionSequence = (actions, opts = {}) => {
    const list = (Array.isArray(actions) ? actions : [])
      .map((id) => resolveAction(id) || String(id || "").toLowerCase())
      .filter((id) => id && id !== "none" && id !== "stop" && getActionDefExtended(id));
    if (!list.length) return false;
    clearActionQueue();
    savedSequence = [...list];
    actionQueue = [...list];
    sequenceLoop = Boolean(opts.loopSequence);
    if (opts.emotion) emotion = opts.emotion;
    return shiftQueuedAction();
  };

  const setActionCompleteHandler = (fn) => {
    onActionComplete = typeof fn === "function" ? fn : null;
    return onActionComplete;
  };

  const applyContentFromReply = (text, moodHint = null) => {
    const analysis = analyzeCompanionReply(text, moodHint || emotion);
    emotion = analysis.emotion;
    nuance = analysis.nuance;
    talkStyle = companionGestureStyle(analysis.talkStyle);
    talkTime = 0;
    setTalkEnergy(analysis.speechEnergy);
    if (analysis.action) {
      playAction(analysis.action, { emotion: analysis.emotion, single: true });
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
    if (analysis.action === "stop") {
      stopAction();
    }
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
      applyBoneRotation(name, armRestRotations[name]);
    }
  };

  const applyPointArms = (pose, k) => {
    const safe = clampArmPose(pose);
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
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

  const applyActionArms = (pose, k) => {
    const safe = clampActionPose(pose);
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
    const liftL = Math.min(0.82, (safe.armLiftL ?? 0) * k);
    const liftR = Math.min(0.82, (safe.armLiftR ?? 0) * k);
    const foreL = Math.min(0.62, (safe.forearmL ?? 0) * k);
    const foreR = Math.min(0.62, (safe.forearmR ?? 0) * k);
    applyBoneRotation("leftUpperArm", {
      x: restL.x,
      y: restL.y,
      z: restL.z + liftL * 0.75,
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x,
      y: restR.y,
      z: restR.z - liftR * 0.75,
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
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
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

  const applyLegPose = (pose, k, actionMode = false) => {
    const restUL = VRM_LEG_REST_ROTATIONS.leftUpperLeg;
    const restUR = VRM_LEG_REST_ROTATIONS.rightUpperLeg;
    const restLL = VRM_LEG_REST_ROTATIONS.leftLowerLeg;
    const restLR = VRM_LEG_REST_ROTATIONS.rightLowerLeg;
    const legScale = actionMode ? 1 : 0.55;
    const upperL = Math.min(0.72, (pose.upperLegL ?? 0) * k * legScale);
    const upperR = Math.min(0.72, (pose.upperLegR ?? 0) * k * legScale);
    const lowerL = Math.min(0.78, (pose.lowerLegL ?? 0) * k * legScale);
    const lowerR = Math.min(0.78, (pose.lowerLegR ?? 0) * k * legScale);
    applyBoneRotation("leftUpperLeg", {
      x: restUL.x + upperL,
      y: restUL.y,
      z: restUL.z + (pose.hipZ ?? 0) * 0.35 * k,
    });
    applyBoneRotation("rightUpperLeg", {
      x: restUR.x + upperR,
      y: restUR.y,
      z: restUR.z - (pose.hipZ ?? 0) * 0.35 * k,
    });
    applyBoneRotation("leftLowerLeg", {
      x: restLL.x + lowerL,
      y: restLL.y,
      z: restLL.z,
    });
    applyBoneRotation("rightLowerLeg", {
      x: restLR.x + lowerR,
      y: restLR.y,
      z: restLR.z,
    });
  };

  const applyPose = (pose, intensity = 1, opts = {}) => {
    if (!humanoid) return;
    const k = Math.max(0, Math.min(1, intensity));
    const allowArms = opts.allowArms === true;
    const actionArms = opts.actionArms === true;
    const talkArmBlend = Number(opts.talkArmBlend) || 0;

    if (actionArms) {
      applyActionArms(pose, k);
    } else if (allowArms) {
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
    applyLegPose(pose, k, opts.actionArms === true);
  };

  const update = (dt, opts = {}) => {
    const now = opts.now ?? performance.now();
    const elapsed = (now - t0) * 0.001;

    let pose = buildBasePose({ listening, emotion, nuance });
    const energy = talking ? Math.max(0.2, talkEnergy) : 0;

    if (activeAction) {
      actionElapsed += dt;
      actionPhase = (actionElapsed % actionDuration) / actionDuration;
      const actionPose = clampActionPose(
        sampleActionBodyPose(activeAction, actionPhase, actionElapsed),
      );
      const actionBlend =
        activeAction === "kungfu" || activeAction === "laugh" ? 0.94 : 0.86;
      const fadeInSec = 0.38;
      const fadeOutSec = 0.44;
      const fadeIn = Math.min(1, actionElapsed / fadeInSec);
      const fadeOut = actionLoop
        ? 1
        : Math.min(1, Math.max(0, actionDuration - actionElapsed) / fadeOutSec);
      const actionEnvelope = Math.min(fadeIn, fadeOut);
      pose = mergePoses(pose, actionPose, actionBlend * actionEnvelope);
      rootMotion = sampleActionRootMotion(
        activeAction,
        actionPhase,
        actionElapsed,
      );
      if (!actionLoop && actionElapsed >= actionDuration) {
        finishActionStep();
      }
    } else {
      rootMotion = { y: 0, rotY: 0 };
    }

    if (!activeAction) {
      if (thinking && !talking) {
        const thinkMotion = sampleBodyTalkMotion(elapsed, {
          style: companionGestureStyle("thinking"),
          emotion: "thinking",
          speechEnergy: 0.18,
          includeArms: true,
        });
        pose = mergePoses(pose, thinkMotion.body, 0.42);
        pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.55) * 0.024;
        pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 0.42 + 0.8) * 0.018;
      } else if (!talking) {
        const idleMotion = sampleIdleBodyMotion(elapsed, { listening, emotion });
        pose = mergePoses(pose, idleMotion, listening ? 0.96 : 0.92);
        const beat = advanceIdleBeat(idleBeatState, dt, now);
        idleBeatState = beat.state;
        if (beat.overlay && Object.keys(beat.overlay).length) {
          pose = mergePoses(pose, beat.overlay, 0.9);
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
    }

    let allowArms = false;
    let actionArms = false;
    let talkArmBlend = 0;
    if (activeAction) {
      actionArms = true;
    }
    if (talking && !activeGesture && !activeAction) {
      talkArmBlend = 0.28 + energy * 0.32;
    } else if (!talking && !thinking && !activeGesture && !activeAction) {
      talkArmBlend = listening ? 0.42 : 0.36;
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

    const dampRate = poseDampingRate(Boolean(activeAction), talking);
    smoothedPose = dampPose(smoothedPose, pose, dt, dampRate);
    smoothedRootMotion = dampRootMotion(
      smoothedRootMotion,
      rootMotion,
      dt,
      activeAction ? 11 : 12,
    );
    if (!activeAction) {
      if (Math.abs(smoothedRootMotion.y) < 0.002) smoothedRootMotion.y = 0;
      if (Math.abs(smoothedRootMotion.rotY) < 0.002) {
        smoothedRootMotion.rotY = 0;
      }
    }
    applyPose(smoothedPose, 1, { allowArms, actionArms, talkArmBlend });
    return smoothedPose;
  };

  return {
    schema: COMPANION_BODY_SCHEMA,
    setEmotion,
    setContentNuance,
    setThinking,
    setListening,
    playGesture,
    playAction,
    playActionSequence,
    stopAction,
    clearActionQueue,
    setActionCompleteHandler,
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
    get thinking() {
      return thinking;
    },
    get activeGesture() {
      return activeGesture;
    },
    get currentAction() {
      return activeAction;
    },
    get queuedActions() {
      return [...actionQueue];
    },
    get sequenceLoop() {
      return sequenceLoop;
    },
    getRootMotion() {
      return smoothedRootMotion;
    },
    snapToRestPose() {
      smoothedPose = buildBasePose({ listening, emotion, nuance });
      smoothedRootMotion = { y: 0, rotY: 0 };
      applyPose(smoothedPose, 1, {
        allowArms: false,
        actionArms: false,
        talkArmBlend: 0,
      });
      return smoothedPose;
    },
    setArmRestRotations(next) {
      if (!next) return armRestRotations;
      armRestRotations = next;
      return armRestRotations;
    },
    get armRestRotations() {
      return armRestRotations;
    },
  };
}

export { parseReplyMood } from "./companionContentMotion.js";

/** Cantonese-first companion system prompt (default Amoji persona). */
export const CANTONESE_COMPANION_PROMPT = buildCharacterSystemPrompt(
  "amoji",
  false,
);

/** English companion mode — default Amoji persona. */
export const ENGLISH_COMPANION_PROMPT = buildCharacterSystemPrompt("amoji", true);
