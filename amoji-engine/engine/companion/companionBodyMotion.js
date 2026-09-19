/**
 * VRM body motion — rest/listen arms-down; talk VRMA library while speaking.
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
  sampleCalmBreathIdle,
  samplePlantedAliveIdle,
  advanceIdleBeat,
  createIdleBeatState,
  startIdleBeat,
} from "./companionIdleMotion.js";
import { applyFingerRestPose } from "./companionFingerPose.js";
import {
  actionMotionEnvelope,
  dampPose,
  dampRootMotion,
  poseDampingRate,
} from "./companionPoseSmoothing.js";
import {
  buildBasePose,
  clampActionPose,
  clampArmPose,
  clampIdleArmPose,
  clampTalkArmPose,
  companionGestureStyle,
  VRM_FOOT_REST_ROTATIONS,
  VRM_HAND_REST_ROTATIONS,
  VRM_LEG_REST_ROTATIONS,
  GESTURE_DURATION_SEC,
  HEAD_GESTURE_NOD,
  mergePoses,
  REST_POSE,
  sampleVrmTalkPose,
  VRM_ARM_REST_ROTATIONS,
  restDirectedLift,
  withElbowBend,
} from "./companionPoseLibrary.js";
import {
  applyLockedFootRotations,
  FOOT_PLANT_Y_MAX,
  footPlantRootDelta,
  lockedIdleHipTilt,
} from "./companionFootLock.js";

export const COMPANION_BODY_SCHEMA = "amoji.companionBody.v1";

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 * @param {{ armRestRotations?: typeof VRM_ARM_REST_ROTATIONS }} [opts]
 */
export function createCompanionBodyMotion(humanoid, opts = {}) {
  let armRestRotations = opts.armRestRotations || VRM_ARM_REST_ROTATIONS;
  let legRestRotations = opts.legRestRotations || VRM_LEG_REST_ROTATIONS;
  /** @type {"tpose" | "apose"} */
  let armBind = "tpose";
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
  let idleBeat = createIdleBeatState(t0);
  /** @type {"x" | "z"} */
  let fingerFlexAxis = "z";
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
  let footPlantY = 0;
  /** @type {Record<string, number>} */
  let smoothedPose = { ...REST_POSE };
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
    if (
      (activeAction === "eat" || activeAction === "drink") &&
      emotion === "happy"
    ) {
      emotion = "neutral";
    }
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
    } else if (key === "eat" || key === "drink") {
      setTalkEnergy(0.45);
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
    const analysis = analyzeCompanionReply(text, moodHint);
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
    if (typeof b.rotation.set === "function") {
      b.rotation.order = "XYZ";
      b.rotation.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0);
      return;
    }
    b.rotation.x = rot.x ?? 0;
    b.rotation.y = rot.y ?? 0;
    b.rotation.z = rot.z ?? 0;
  };

  const applyArmRest = (pose = REST_POSE) => {
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
    const apose = isAposeBind();
    const foreScale = apose ? 0.14 : 1;
    applyBoneRotation("leftUpperArm", restL);
    applyBoneRotation("rightUpperArm", restR);
    applyBoneRotation(
      "leftLowerArm",
      withElbowBend(restLl, (pose.forearmL ?? REST_POSE.forearmL ?? 0) * foreScale),
    );
    applyBoneRotation(
      "rightLowerArm",
      withElbowBend(restRl, (pose.forearmR ?? REST_POSE.forearmR ?? 0) * foreScale),
    );
  };

  const isAposeBind = () => armBind === "apose";

  const applyIdleArms = (pose, k, opts = {}) => {
    const combHair = opts.combHair === true;
    const safe = clampIdleArmPose(pose);
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
    const apose = isAposeBind();
    const liftCap = apose ? (opts.boot ? 0.2 : 0.16) : opts.boot ? 0.4 : 0.34;
    const foreCap = apose ? (opts.boot ? 0.34 : 0.28) : opts.boot ? 0.7 : 0.62;
    const liftMinL = apose ? 0.05 : 0.12;
    const liftMinR = apose ? 0.04 : 0.08;
    const foreMinL = apose ? 0.1 : 0.32;
    const foreMinR = apose ? 0.08 : 0.26;
    const foreScale = apose ? 0.42 : 1;
    const liftL = Math.min(liftCap, Math.max(liftMinL, safe.armLiftL ?? REST_POSE.armLiftL) * k);
    const liftR = Math.min(liftCap, Math.max(liftMinR, safe.armLiftR ?? REST_POSE.armLiftR) * k);
    const foreL = Math.min(
      foreCap,
      Math.max(foreMinL, safe.forearmL ?? REST_POSE.forearmL) * k * foreScale,
    );
    const foreR = Math.min(
      foreCap,
      Math.max(foreMinR, safe.forearmR ?? REST_POSE.forearmR) * k * foreScale,
    );
    const zLiftMul = apose ? 0.08 : 0.55;
    const xLiftMul = apose ? 0.02 : 0.08;
    // T-pose rigs hang on Z; A-pose rigs already sit at the hips — tiny nudge only.
    applyBoneRotation("leftUpperArm", {
      x: restL.x + liftL * xLiftMul,
      y: restL.y + 0.03 * k,
      z: restDirectedLift(restL.z, liftL * zLiftMul, 1),
    });
    if (combHair) {
      const combScale = apose ? 0.62 : 1;
      applyBoneRotation("rightUpperArm", {
        x: restR.x + 0.42 * k * combScale,
        y: restR.y - 0.28 * k * combScale,
        z: restDirectedLift(restR.z, 0.92 * k * combScale, -1),
      });
      applyBoneRotation("rightLowerArm", withElbowBend(restRl, 0.82 * k * combScale));
    } else {
      applyBoneRotation("rightUpperArm", {
        x: restR.x + liftR * xLiftMul,
        y: restR.y - 0.03 * k,
        z: restDirectedLift(restR.z, liftR * zLiftMul, -1),
      });
      applyBoneRotation("rightLowerArm", withElbowBend(restRl, foreR));
    }
    applyBoneRotation("leftLowerArm", withElbowBend(restLl, foreL));
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
      z: restDirectedLift(restL.z, liftL * 0.45, 1),
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x,
      y: restR.y,
      z: restDirectedLift(restR.z, liftR * 0.45, -1),
    });
    applyBoneRotation("leftLowerArm", withElbowBend(restLl, foreL));
    applyBoneRotation("rightLowerArm", withElbowBend(restRl, foreR));
  };

  const applyEatArms = (pose, k) => {
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
    const chew = Math.max(0, Number(pose.eatChew) || 0);
    applyBoneRotation("rightUpperArm", {
      x: restR.x + (0.62 + chew * 0.1) * k,
      y: restR.y - 0.28 * k,
      z: restDirectedLift(restR.z, 0.16 * k, -1),
    });
    applyBoneRotation("rightLowerArm", withElbowBend(restRl, 0.9 * k));
    applyBoneRotation("leftUpperArm", {
      x: restL.x + 0.22 * k,
      y: restL.y + 0.1 * k,
      z: restDirectedLift(restL.z, 0.16 * k, 1),
    });
    applyBoneRotation("leftLowerArm", withElbowBend(restLl, 0.42 * k));
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
      z: restDirectedLift(restL.z, liftL * 0.75, 1),
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x,
      y: restR.y,
      z: restDirectedLift(restR.z, liftR * 0.75, -1),
    });
    applyBoneRotation("leftLowerArm", withElbowBend(restLl, foreL));
    applyBoneRotation("rightLowerArm", withElbowBend(restRl, foreR));
  };

  const applyTalkArms = (pose, k) => {
    const safe = clampTalkArmPose(pose);
    const restL = armRestRotations.leftUpperArm;
    const restR = armRestRotations.rightUpperArm;
    const restLl = armRestRotations.leftLowerArm;
    const restRl = armRestRotations.rightLowerArm;
    const liftL = Math.min(0.4, (safe.armLiftL ?? 0) * k);
    const liftR = Math.min(0.4, (safe.armLiftR ?? 0) * k);
    const foreL = Math.min(0.34, (safe.forearmL ?? 0) * k);
    const foreR = Math.min(0.34, (safe.forearmR ?? 0) * k);
    applyBoneRotation("leftUpperArm", {
      x: restL.x + Math.sin(talkTime * 3.2) * 0.05 * k,
      y: restL.y,
      z: restDirectedLift(restL.z, liftL * 0.92, 1),
    });
    applyBoneRotation("rightUpperArm", {
      x: restR.x + Math.sin(talkTime * 3.2 + 1.1) * 0.05 * k,
      y: restR.y,
      z: restDirectedLift(restR.z, liftR * 0.92, -1),
    });
    applyBoneRotation("leftLowerArm", withElbowBend(restLl, foreL));
    applyBoneRotation("rightLowerArm", withElbowBend(restRl, foreR));
  };

  const legFlexCaps = (planted) => ({
    upperCap: planted ? 0.035 : 0.72,
    lowerCap: planted ? 0.16 : 0.78,
  });

  const sampleLegFlex = (pose, k, planted = true) => {
    const { upperCap, lowerCap } = legFlexCaps(planted);
    return {
      upperL: Math.min(upperCap, (pose.upperLegL ?? REST_POSE.upperLegL ?? 0) * k),
      upperR: Math.min(upperCap, (pose.upperLegR ?? REST_POSE.upperLegR ?? 0) * k),
      lowerL: Math.min(lowerCap, (pose.lowerLegL ?? REST_POSE.lowerLegL ?? 0) * k),
      lowerR: Math.min(lowerCap, (pose.lowerLegR ?? REST_POSE.lowerLegR ?? 0) * k),
    };
  };

  const applyLegPose = (pose, k, opts = {}) => {
    const restUL = legRestRotations.leftUpperLeg;
    const restUR = legRestRotations.rightUpperLeg;
    const restLL = legRestRotations.leftLowerLeg;
    const restLR = legRestRotations.rightLowerLeg;
    const planted = opts.plantFeet !== false;
    const { upperL, upperR, lowerL, lowerR } = sampleLegFlex(pose, k, planted);
    const leftUpper = withElbowBend(restUL, upperL);
    const rightUpper = withElbowBend(restUR, upperR);
    applyBoneRotation("leftUpperLeg", {
      ...leftUpper,
      z: (leftUpper.z ?? 0) + (pose.hipZ ?? 0) * 0.04 * k,
    });
    applyBoneRotation("rightUpperLeg", {
      ...rightUpper,
      z: (rightUpper.z ?? 0) - (pose.hipZ ?? 0) * 0.04 * k,
    });
    applyBoneRotation("leftLowerLeg", withElbowBend(restLL, lowerL));
    applyBoneRotation("rightLowerLeg", withElbowBend(restLR, lowerR));
  };

  const applyFingerBone = (name, rot) => {
    // Normalized bones only. Copying the same Euler onto Mixamo raw bones
    // twists fingers along their length so they look stick-straight.
    applyBoneRotation(name, rot);
  };

  const applyFootLock = (pose = REST_POSE, k = 1, planted = true) => {
    const flex = sampleLegFlex(pose, k, planted);
    applyLockedFootRotations(applyBoneRotation, VRM_FOOT_REST_ROTATIONS, {
      leftUpper: flex.upperL,
      rightUpper: flex.upperR,
      leftLower: flex.lowerL,
      rightLower: flex.lowerR,
      hipZ: pose.hipZ ?? 0,
      leftFlexAxis:
        legRestRotations.leftLowerLeg?.flexAxis === "z" ? "z" : "x",
      rightFlexAxis:
        legRestRotations.rightLowerLeg?.flexAxis === "z" ? "z" : "x",
    });
  };

  const applyHandAndFootRest = (pose = REST_POSE, k = 1, talkBlend = 0) => {
    if (talkBlend <= 0.08) {
      applyBoneRotation("leftHand", VRM_HAND_REST_ROTATIONS.leftHand);
      applyBoneRotation("rightHand", VRM_HAND_REST_ROTATIONS.rightHand);
    }
    applyFootLock(pose, k, true);
  };

  const applyPose = (pose, intensity = 1, opts = {}) => {
    if (!humanoid) return;
    const k = Math.max(0, Math.min(1, intensity));
    const allowArms = opts.allowArms === true;
    const actionArms = opts.actionArms === true;
    const eatArms = opts.eatArms === true;
    const idleArms = opts.idleArms === true;
    const talkArmBlend = Number(opts.talkArmBlend) || 0;

    if (eatArms) {
      applyEatArms(pose, k);
    } else if (actionArms) {
      applyActionArms(pose, k);
    } else if (allowArms) {
      applyPointArms(pose, k);
    } else if (idleArms) {
      applyIdleArms(pose, k, {
        boot: opts.bootPhase === true,
        combHair: opts.combHair === true,
      });
    } else if (talkArmBlend > 0.01) {
      applyTalkArms(pose, talkArmBlend);
    } else {
      applyArmRest(pose);
    }

    const head = bone("head");
    const spine = bone("spine");
    const chest = bone("chest");
    const upperChest = bone("upperChest");
    const leftShoulder = bone("leftShoulder");
    const rightShoulder = bone("rightShoulder");
    const leftHand = bone("leftHand");
    const rightHand = bone("rightHand");
    const hips = bone("hips");

    if (head) {
      head.rotation.x = (pose.headX || 0) * k;
      head.rotation.y = (pose.headY || 0) * k;
      head.rotation.z = (pose.headZ || 0) * k;
    }
    if (spine) {
      spine.rotation.x = (pose.spineX || 0.01) * k;
      spine.rotation.y = (pose.leanY || 0) * k;
      spine.rotation.z = (pose.spineZ || 0) * k;
    }
    if (chest) {
      chest.rotation.x = (pose.chestX || -0.01) * k;
      chest.rotation.y = (pose.chestY || 0) * k;
    }
    if (upperChest) {
      upperChest.rotation.x = (pose.chestX || 0) * 0.42 * k;
      upperChest.rotation.y = (pose.leanY || 0) * 0.28 * k;
    }
    if (leftShoulder) {
      leftShoulder.rotation.z = (pose.shoulderL || 0) * k;
    }
    if (rightShoulder) {
      rightShoulder.rotation.z = -(pose.shoulderR || 0) * k;
    }
    if (leftHand && Number(pose.handWaveL)) {
      leftHand.rotation.y =
        (VRM_HAND_REST_ROTATIONS.leftHand?.y || 0) + (pose.handWaveL || 0) * k;
    }
    if (rightHand && Number(pose.handWaveR)) {
      rightHand.rotation.y =
        (VRM_HAND_REST_ROTATIONS.rightHand?.y || 0) + (pose.handWaveR || 0) * k;
    }
    if (hips) {
      const plantFeet = opts.plantFeet !== false;
      hips.rotation.z = plantFeet
        ? lockedIdleHipTilt(pose.hipZ || 0, k)
        : (pose.hipZ || 0) * k;
    }
    applyLegPose(pose, k, { plantFeet: opts.plantFeet !== false });
    applyHandAndFootRest(pose, k, talkArmBlend);
    humanoid.update?.();
  };

  const applyHandRestOnly = (opts = {}) => {
    const talkBlend = Number(opts.talkBlend) || 0;
    const elapsedSec =
      opts.elapsedSec != null
        ? Number(opts.elapsedSec)
        : opts.now != null
          ? (Number(opts.now) - t0) * 0.001
          : (performance.now() - t0) * 0.001;
    applyFingerRestPose(applyFingerBone, {
      talkBlend,
      flexAxis: fingerFlexAxis,
      elapsedSec,
      blendWeight: opts.blendWeight,
      readRotation: (name) => {
        const b = bone(name);
        return b?.rotation
          ? { x: b.rotation.x, y: b.rotation.y, z: b.rotation.z }
          : null;
      },
    });
    humanoid?.update?.();
  };

  const setFingerFlexAxis = (axis) => {
    fingerFlexAxis = axis === "x" ? "x" : "z";
    return fingerFlexAxis;
  };

  const holdForLibraryMotion = (now = performance.now()) => {
    const elapsed = (now - t0) * 0.001;
    smoothedPose = buildBasePose({ listening, emotion, nuance });
    smoothedPose = mergePoses(
      smoothedPose,
      samplePlantedAliveIdle(elapsed, { listening, emotion }),
      0.96,
    );
    smoothedRootMotion = { y: 0, rotY: 0 };
    footPlantY = 0;
    return smoothedPose;
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
      const fadeInSec = 0.42;
      const fadeOutSec = 0.48;
      const actionEnvelope = actionMotionEnvelope(
        actionElapsed,
        actionDuration,
        fadeInSec,
        fadeOutSec,
        actionLoop,
      );
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
          includeArms: false,
        });
        pose = mergePoses(pose, thinkMotion.body, 0.28);
        pose.headX = (pose.headX || 0) + Math.sin(elapsed * 0.55) * 0.024;
        pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 0.42 + 0.8) * 0.018;
      } else if (!talking) {
        const apose = isAposeBind();
        const idleMotion = apose
          ? sampleCalmBreathIdle(elapsed, { listening, emotion })
          : samplePlantedAliveIdle(elapsed, { listening, emotion });
        pose = mergePoses(pose, idleMotion, apose ? 0.42 : 0.72);
        const beat = advanceIdleBeat(idleBeat, dt, now);
        idleBeat = beat.state;
        if (beat.overlay && Object.keys(beat.overlay).length) {
          let overlay = beat.overlay;
          if (isAposeBind()) {
            overlay = { ...beat.overlay };
            for (const key of [
              "armLiftL",
              "armLiftR",
              "forearmL",
              "forearmR",
              "upperLegL",
              "upperLegR",
              "lowerLegL",
              "lowerLegR",
            ]) {
              if (key in overlay) overlay[key] = overlay[key] * 0.55;
            }
          }
          pose = mergePoses(pose, overlay, 1);
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
        const talkBlend = 0.88 + energy * 0.12;
        pose = mergePoses(pose, motion.body, talkBlend);

        const beat = Math.sin(elapsed * 7.4);
        const sway = Math.sin(elapsed * 3.6 + talkTime * 2.1);
        pose.headX = (pose.headX || 0) + beat * 0.09 * energy + sway * 0.035;
        pose.leanY = (pose.leanY || 0) + Math.sin(elapsed * 5.8) * 0.07 * energy;
        pose.headZ = (pose.headZ || 0) + Math.sin(elapsed * 4.6) * 0.055 * energy;
        pose.spineX = (pose.spineX || 0) + Math.sin(elapsed * 4.2) * 0.042 * energy;
      }
    }

    let allowArms = false;
    let actionArms = false;
    let eatArms = false;
    let idleArms = false;
    let talkArmBlend = 0;
    if (activeAction === "eat" || activeAction === "drink") {
      eatArms = true;
    } else if (activeAction) {
      actionArms = true;
    }
    if (talking && !activeGesture && !activeAction) {
      talkArmBlend = 0.72 + energy * 0.28;
    } else if (!talking && !thinking && !activeGesture && !activeAction) {
      idleArms = true;
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
      if (Math.abs(smoothedRootMotion.rotY) < 0.002) {
        smoothedRootMotion.rotY = 0;
      }
    }
    const plantFeet = !activeAction;
    applyPose(smoothedPose, 1, {
      allowArms,
      actionArms,
      eatArms,
      idleArms,
      talkArmBlend,
      bootPhase: false,
      plantFeet,
      combHair: !talking && !thinking && idleBeat.beat === "comb",
    });
    if (plantFeet) {
      const dy = footPlantRootDelta(bone, 0);
      footPlantY += dy;
      footPlantY = Math.max(
        -FOOT_PLANT_Y_MAX,
        Math.min(FOOT_PLANT_Y_MAX, footPlantY),
      );
      if (Math.abs(footPlantY) < 0.001) footPlantY = 0;
      smoothedRootMotion = {
        ...smoothedRootMotion,
        y: footPlantY,
      };
    } else {
      footPlantY = 0;
    }
    return smoothedPose;
  };

  const resetMotionClock = (now = performance.now()) => {
    t0 = now;
    smoothedPose = buildBasePose({ listening, emotion, nuance });
    smoothedPose = mergePoses(
      smoothedPose,
      samplePlantedAliveIdle(0.2, { listening, emotion }),
      0.96,
    );
    smoothedRootMotion = { y: 0, rotY: 0 };
    footPlantY = 0;
    applyPose(smoothedPose, 1, {
      allowArms: false,
      actionArms: false,
      idleArms: true,
      talkArmBlend: 0,
      bootPhase: false,
      plantFeet: true,
    });
    applyHandRestOnly({ talkBlend: 0, now });
    return smoothedPose;
  };

  const resetIdleLife = (now = performance.now()) => {
    idleBeat = createIdleBeatState(now);
    return resetMotionClock(now);
  };

  const pulseIdleBeat = (beat, now = performance.now()) => {
    idleBeat = startIdleBeat(idleBeat, beat, now);
    return idleBeat;
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
    applyHandRestOnly,
    holdForLibraryMotion,
    setFingerFlexAxis,
    get emotion() {
      return emotion;
    },
    get nuance() {
      return nuance;
    },
    get listening() {
      return listening;
    },
    get thinking() {
      return thinking;
    },
    get talkStyle() {
      return talkStyle;
    },
    get activeGesture() {
      return activeGesture;
    },
    get currentAction() {
      return activeAction;
    },
    getEatChewSample() {
      if (activeAction !== "eat" && activeAction !== "drink") return 0;
      return Math.max(0, Math.min(1, Number(smoothedPose.eatChew) || 0));
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
      smoothedPose = mergePoses(
        smoothedPose,
        sampleCalmBreathIdle(0.2, { listening, emotion }),
        isAposeBind() ? 0.22 : 0.38,
      );
      smoothedRootMotion = { y: 0, rotY: 0 };
      footPlantY = 0;
      applyPose(smoothedPose, 1, {
        allowArms: false,
        actionArms: false,
        idleArms: false,
        talkArmBlend: 0,
        bootPhase: false,
        plantFeet: true,
      });
      applyHandRestOnly({ talkBlend: 0, now: performance.now() });
      return smoothedPose;
    },
    resetIdleLife,
    pulseIdleBeat,
    resetMotionClock,
    setArmRestRotations(next) {
      if (!next) return armRestRotations;
      armRestRotations = next;
      return armRestRotations;
    },
    setLegRestRotations(next) {
      if (!next) return legRestRotations;
      legRestRotations = next;
      return legRestRotations;
    },
    setArmBind(next) {
      armBind = next === "apose" ? "apose" : "tpose";
      return armBind;
    },
    get armBind() {
      return armBind;
    },
    get armRestRotations() {
      return armRestRotations;
    },
    get legRestRotations() {
      return legRestRotations;
    },
  };
}

export { parseReplyMood } from "./companionContentMotion.js";

/** Cantonese-first companion system prompt (default Nova persona). */
export const CANTONESE_COMPANION_PROMPT = buildCharacterSystemPrompt(
  "nova",
  false,
);

/** English companion mode — default Nova persona. */
export const ENGLISH_COMPANION_PROMPT = buildCharacterSystemPrompt("nova", true);
