/**
 * VRM anime companion avatar — MToon shading, expressions, spring bones,
 * Unreal-style OrbitControls. Default model: companion-girl.vrm (VRM 1.0 sample).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { applyAutoCameraFrame } from "./companionCameraApply.js";
import {
  createCompanionCameraDirector,
} from "./companionCameraDirector.js";
import {
  applyOrbitFollowAnchor,
  computeVrmFrameAnchor,
  smoothFrameAnchor,
} from "./companionCameraFollow.js";
import {
  PORTRAIT_FOV,
  applyUpperBodyPortraitFrame,
  applyUserOrbitLimits,
  detectPortraitCameraZSign,
  isHeadFacingCamera,
  portraitDistanceForHeight,
} from "./companionPortraitFraming.js";
import {
  bindOrbitControlSession,
  bindOrbitTouchGuard,
  configureCompanionOrbitControls,
  resolveOrbitDomElement,
} from "./companionOrbitControls.js";
import { actionLoops } from "./companionActionMotion.js";
import { detectVrmIdleRestRotations } from "./companionArmRestCalibration.js";
import { createCompanionBodyMotion } from "./companionBodyMotion.js";
import { inferFingerFlexAxis } from "./companionFingerPose.js";
import { buildVrmExpressionBlend } from "./companionContentMotion.js";
import {
  isOnlineIdleAction,
  isOnlineLoopingLibraryAction,
  resolveOnlineMotionClipUrl,
} from "./companionOnlineMotionClips.mjs";
import { createVrmMotionPlayer } from "./companionVrmMotionPlayer.js";
import { sampleIdleExpressionBlend } from "./companionIdleMotion.js";
import { configureVrmSpringStability } from "./vrmSpringStability.js";
import { applyVrmOutfitTint } from "./companionOutfitApply.js";
import {
  applyBlinkWeight,
  applyMorphMouthOpen,
  blinkExpressionNames,
  blinkPulseFinished,
  blinkWeightFromPhase,
  clampRestFaceBlend,
  applyRestEyeOpen,
  applyRestEyeOpenMorphs,
  guardLookAtLids,
  inspectVrmFaceHazards,
  resolveMouthPresets,
  sampleEatMouthPulse,
  sampleTalkMouthPulse,
  shapeToVisemePreset,
  talkJawRotationX,
  talkingMouthOpen,
  zeroAllExpressions,
  zeroHazardMorphInfluences,
} from "./companionFaceRest.js";

export const VRM_AVATAR_SCHEMA = "amoji.vrmAvatar.v1";

const EMOTION_EXPRESSIONS = {
  neutral: {},
  happy: { [VRMExpressionPresetName.Happy]: 0.98 },
  thinking: {
    [VRMExpressionPresetName.Relaxed]: 0.28,
    [VRMExpressionPresetName.Surprised]: 0.12,
  },
  sad: { [VRMExpressionPresetName.Sad]: 0.92 },
  surprised: {
    [VRMExpressionPresetName.Surprised]: 0.98,
    [VRMExpressionPresetName.Happy]: 0.32,
  },
  angry: { [VRMExpressionPresetName.Angry]: 0.94 },
};

const VRM_BLEND_PRESET_MAP = {
  Happy: VRMExpressionPresetName.Happy,
  Relaxed: VRMExpressionPresetName.Relaxed,
  Sad: VRMExpressionPresetName.Sad,
  Surprised: VRMExpressionPresetName.Surprised,
  Angry: VRMExpressionPresetName.Angry,
};

const TALK_MOUTH_BLOCK_PRESETS = new Set([
  VRMExpressionPresetName.Happy,
  VRMExpressionPresetName.Surprised,
]);

/**
 * @param {GLTFLoader} loader
 * @param {string} modelUrl
 * @param {(ratio: number, label?: string) => void} [onProgress]
 */
async function loadVrmGltf(loader, modelUrl, onProgress) {
  // Only use a prefetch buffer for the exact model URL — never fall back to the
  // default boot preload (companion-girl.vrm) or the wrong character appears.
  const preload = globalThis.__amojiPreload?.getVrm?.(modelUrl) ?? null;
  if (preload) {
    try {
      const buffer = await preload;
      return await loader.parseAsync(buffer, modelUrl);
    } catch (err) {
      console.warn("[vrm] prefetched model parse failed, falling back to URL", err);
    }
  }
  return loader.loadAsync(modelUrl, (event) => {
    if (event.lengthComputable && event.total > 0) {
      onProgress?.(event.loaded / event.total, "model");
    }
  });
}

/** Grok Ani–style framing: upper body visible, not extreme face close-up. */
function frameFaceCamera({
  vrm,
  model,
  camera,
  controls,
  fitted,
  cameraZSign: cameraZSignOverride,
}) {
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const anchor = computeVrmFrameAnchor(vrm, model);
  const head = vrm.humanoid?.getNormalizedBoneNode?.("head");
  const distGuess = portraitDistanceForHeight(fittedSize.y);
  const cameraZSign =
    cameraZSignOverride ??
    detectPortraitCameraZSign(head, anchor, distGuess, vrm.humanoid);
  const portraitDist = applyUpperBodyPortraitFrame({
    camera,
    controls,
    anchor,
    fittedHeight: fittedSize.y,
    cameraZSign,
  });
  return { face: anchor, portraitDist, cameraZSign };
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   controlsElement?: HTMLElement | null,
 *   modelUrl?: string,
 *   onCharacterTap?: (info: { point: import('three').Vector3 }) => void,
 *   onProgress?: (ratio: number, label?: string) => void,
 * }} opts
 */
export async function createVrmAvatar(opts) {
  const canvas = opts.canvas;
  const orbitElement = resolveOrbitDomElement({
    canvas,
    controlsElement: opts.controlsElement,
  });
  const modelUrl = opts.modelUrl || "/prototypes/assets/companion-girl.vrm";

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "default",
      failIfMajorPerformanceCaveat: false,
    });
    if (!renderer.getContext?.()) throw new Error("WebGL context missing");
  } catch (err) {
    throw new Error(`WebGL unavailable: ${err?.message || err}`);
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if ("toneMapping" in renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(PORTRAIT_FOV, 1, 0.05, 100);
  camera.position.set(0, 1.28, 2.85);

  scene.add(new THREE.HemisphereLight(0xffe8dc, 0x1a2030, 1.05));
  const key = new THREE.DirectionalLight(0xfff6ee, 1.55);
  key.position.set(2.2, 4.2, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ad7ff, 0.85);
  rim.position.set(-2.8, 2.2, -2.4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc6d9, 0.45);
  fill.position.set(-1.2, 1.6, 3.2);
  scene.add(fill);
  const faceLight = new THREE.PointLight(0xffe6d4, 0.65, 6);
  faceLight.position.set(0.2, 1.55, 1.4);
  scene.add(faceLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x7fd4cf,
      transparent: true,
      opacity: 0.16,
      roughness: 1,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new OrbitControls(camera, orbitElement || canvas);
  configureCompanionOrbitControls(controls);
  controls.target.set(0, 1.15, 0);
  controls.update();

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loadVrmGltf(loader, modelUrl, opts.onProgress);
  opts.onProgress?.(1, "model");
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error("VRM data missing from model");

  const model = vrm.scene;
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m?.map) m.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });

  // Portrait framing — upper body / face
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 0.92 / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.z = -center.z * scale;
  model.position.y = -box.min.y * scale;
  const baseModelY = model.position.y;
  let baseModelRotY = model.rotation.y;
  scene.add(model);
  vrm.humanoid?.resetNormalizedPose?.();
  const bodyMotion = createCompanionBodyMotion(vrm.humanoid);
  bodyMotion.setFingerFlexAxis?.(inferFingerFlexAxis(vrm.humanoid));
  /** @type {string | null} */
  let vrmaAction = null;
  let vrmaPending = false;
  let vrmaPlayGen = 0;
  const restoreAfterVrma = () => {
    if (vrmaPending) return;
    const finished = vrmaAction;
    if (isOnlineLoopingLibraryAction(finished) && motionPlayer.isPlaying?.()) {
      return;
    }
    void resumeCalmStand();
  };

  const resumeCalmStand = async () => {
    if (bodyMotion.thinking) {
      const ok = await tryPlayVrmaAction("thinking", {
        loop: true,
        emotion: "thinking",
      });
      if (ok) return true;
    }
    vrmaPlayGen += 1;
    vrmaPending = false;
    vrmaAction = null;
    motionPlayer.stop();
    bodyMotion.snapToRestPose?.();
    syncHumanoidPose();
    return false;
  };

  const motionPlayer = createVrmMotionPlayer({
    vrm,
    onComplete: () => {
      restoreAfterVrma();
    },
  });

  const syncHumanoidPose = () => {
    try {
      vrm.humanoid?.update?.();
    } catch (err) {
      console.warn("[vrm] humanoid.update failed", err);
    }
  };

  const frameAnchor = new THREE.Vector3();
  const smoothedFrameAnchor = new THREE.Vector3();
  const fitted = new THREE.Box3().setFromObject(model);
  let {
    face: faceAnchor,
    portraitDist,
    cameraZSign: portraitCameraZSign,
  } = frameFaceCamera({
    vrm,
    model,
    camera,
    controls,
    fitted,
  });
  const headBone = vrm.humanoid?.getNormalizedBoneNode?.("head");
  if (!isHeadFacingCamera(headBone, camera, vrm.humanoid)) {
    model.rotation.y += Math.PI;
    vrm.humanoid?.resetNormalizedPose?.();
    const refitted = new THREE.Box3().setFromObject(model);
    const reframed = frameFaceCamera({
      vrm,
      model,
      camera,
      controls,
      fitted: refitted,
    });
    faceAnchor = reframed.face;
    portraitDist = reframed.portraitDist;
    portraitCameraZSign = reframed.cameraZSign;
    baseModelRotY = model.rotation.y;
  }

  const idleRest = detectVrmIdleRestRotations(vrm);
  bodyMotion.setArmRestRotations?.(idleRest.arms);
  bodyMotion.setLegRestRotations?.(idleRest.legs);
  bodyMotion.snapToRestPose?.();
  syncHumanoidPose();
  configureVrmSpringStability(vrm);
  for (let i = 0; i < 18; i += 1) {
    bodyMotion.update(1 / 60);
    syncHumanoidPose();
    vrm.update(1 / 60);
  }
  bodyMotion.resetMotionClock?.();
  configureVrmSpringStability(vrm);
  faceLight.position.set(0.2, 1.55, portraitCameraZSign * 1.4);
  smoothedFrameAnchor.copy(faceAnchor);
  /** @type {{ position: THREE.Vector3, target: THREE.Vector3, fov: number, distance: number }} */
  const portraitCamera = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
    distance: portraitDist,
  };
  const defaultPortrait = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
    distance: portraitDist,
  };
  const syncPortraitFromControls = () => {
    portraitCamera.position.copy(camera.position);
    portraitCamera.target.copy(controls.target);
    portraitCamera.fov = camera.fov;
    portraitCamera.distance = camera.position.distanceTo(controls.target);
  };
  const cameraDirector = createCompanionCameraDirector();
  cameraDirector.resetBootGrace();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  /** @type {{ x: number, y: number } | null} */
  let pointerDown = null;

  // Look toward the camera in azimuth, but at eye height so lookDown
  // blendshapes cannot shut the lids on models that bind eyelids to pitch.
  const lookEyeA = new THREE.Vector3();
  const lookEyeB = new THREE.Vector3();
  const lookHead = new THREE.Vector3();
  const syncLookTarget = () => {
    if (!vrm.lookAt?.target) return;
    const leftEye = vrm.humanoid?.getNormalizedBoneNode?.("leftEye");
    const rightEye = vrm.humanoid?.getNormalizedBoneNode?.("rightEye");
    const head = vrm.humanoid?.getNormalizedBoneNode?.("head");
    let eyeY = camera.position.y;
    if (leftEye && rightEye) {
      leftEye.getWorldPosition(lookEyeA);
      rightEye.getWorldPosition(lookEyeB);
      eyeY = (lookEyeA.y + lookEyeB.y) * 0.5;
    } else if (head) {
      head.getWorldPosition(lookHead);
      eyeY = lookHead.y;
    }
    vrm.lookAt.target.position.set(camera.position.x, eyeY, camera.position.z);
  };
  if (vrm.lookAt) {
    vrm.lookAt.target = new THREE.Object3D();
    scene.add(vrm.lookAt.target);
    syncLookTarget();
    controls.addEventListener?.("change", syncLookTarget);
  }
  guardLookAtLids(vrm);

  controls.addEventListener?.("start", () => {
    cameraDirector.setUserOrbiting(true);
  });
  controls.addEventListener?.("end", () => {
    cameraDirector.setUserOrbiting(false);
    syncPortraitFromControls();
  });

  const expr = vrm.expressionManager;
  const faceHazards = inspectVrmFaceHazards(expr);
  zeroAllExpressions(expr);
  zeroHazardMorphInfluences(model);
  const blinkPresets = blinkExpressionNames(expr);
  const mouthPresets = resolveMouthPresets(expr);

  let emotion = "neutral";
  let mouthOpen = 0;
  let mouthTarget = 0;
  /** @type {string | null} */
  let mouthShape = null;
  let talking = false;
  let eating = false;
  let t0 = performance.now();
  const clock = new THREE.Clock();
  let blinkTimer = 0;
  let nextBlink = 2.4 + Math.random() * 2.5;
  /** @type {Record<string, number>} */
  let expressionTarget = {};
  /** @type {Record<string, number>} */
  let expressionCurrent = {};

  const emotionPresetKeys = () =>
    Object.values(VRM_BLEND_PRESET_MAP).filter((preset) =>
      expr?.getExpression?.(preset),
    );

  const clearExpressionTargets = () => {
    expressionTarget = {};
    for (const preset of emotionPresetKeys()) {
      expressionTarget[preset] = 0;
    }
  };

  const setExpressionTargetFromBlend = (blend) => {
    clearExpressionTargets();
    const safe = clampRestFaceBlend(blend, {
      talking: talking || eating,
      hazards: faceHazards,
    });
    for (const [key, weight] of Object.entries(safe || {})) {
      const preset = VRM_BLEND_PRESET_MAP[key];
      if (preset && expr?.getExpression?.(preset)) {
        expressionTarget[preset] = Math.max(0, Math.min(1, Number(weight) || 0));
      }
    }
  };

  const applyEmotionExpressions = (next) => {
    const nuance =
      bodyMotion.nuance && bodyMotion.nuance !== "none"
        ? bodyMotion.nuance
        : "none";
    setExpressionTargetFromBlend(buildVrmExpressionBlend(next, nuance));
    return nuance;
  };

  const applyExpressionProfile = ({ emotion: em = "neutral", nuance = "none" } = {}) => {
    const blend = buildVrmExpressionBlend(em, nuance);
    setExpressionTargetFromBlend(blend);
    return { emotion: em, nuance, blend };
  };

  const tickExpressionBlend = (dt) => {
    if (!expr) return;
    const rate = Math.min(1, dt * (talking ? 28 : 16));
    for (const preset of emotionPresetKeys()) {
      if ((talking || eating) && TALK_MOUTH_BLOCK_PRESETS.has(preset)) {
        expressionTarget[preset] = 0;
        expressionCurrent[preset] = 0;
        expr.setValue(preset, 0);
        continue;
      }
      const target = expressionTarget[preset] ?? 0;
      const current = expressionCurrent[preset] ?? 0;
      const next = current + (target - current) * rate;
      expressionCurrent[preset] = next;
      if (next > 0.001) {
        expr.setValue(preset, next);
      } else {
        expr.setValue(preset, 0);
        expressionCurrent[preset] = 0;
      }
    }
  };

  const warmExpressionPresets = () => {
    if (!expr) return false;
    zeroAllExpressions(expr);
    for (const preset of emotionPresetKeys()) {
      expr.setValue(preset, 0.001);
      expr.setValue(preset, 0);
    }
    for (const preset of mouthPresets) {
      expr.setValue(preset, 0.001);
      expr.setValue(preset, 0);
    }
    for (const name of blinkPresets) {
      expr.setValue(name, 0.001);
      expr.setValue(name, 0);
    }
    for (const em of Object.keys(EMOTION_EXPRESSIONS)) {
      applyEmotionExpressions(em);
      tickExpressionBlend(0.12);
    }
    for (const nuance of ["shy", "curious", "excited", "love", "stress"]) {
      setExpressionTargetFromBlend(
        buildVrmExpressionBlend("happy", nuance),
      );
      tickExpressionBlend(0.12);
    }
    zeroAllExpressions(expr);
    applyEmotionExpressions("neutral");
    tickExpressionBlend(0.12);
    zeroAllExpressions(expr);
    return true;
  };

  warmExpressionPresets();

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };

  const setEmotion = (next) => {
    emotion = bodyMotion.setEmotion(next);
    applyEmotionExpressions(emotion);
    return emotion;
  };

  const setListening = (on) => bodyMotion.setListening(on);

  const playGesture = (style) => bodyMotion.playGesture(style);

  const tryPlayVrmaAction = async (action, opts = {}) => {
    const key = String(action || "").toLowerCase();
    if (!key || key === "none" || key === "stop") return false;
    if (!resolveOnlineMotionClipUrl(key)) return false;

    const loop = Boolean(
      opts.loop ??
        (isOnlineLoopingLibraryAction(key) || actionLoops(key)),
    );
    if (loop && motionPlayer.activeActionId === key && motionPlayer.isPlaying?.()) {
      vrmaAction = key;
      vrmaPending = false;
      return true;
    }

    const gen = ++vrmaPlayGen;
    vrmaPending = true;
    vrmaAction = key;
    const ok = await motionPlayer.play(key, { loop });
    if (gen !== vrmaPlayGen) return true;
    vrmaPending = false;
    if (!ok) {
      if (vrmaAction === key) vrmaAction = null;
      return false;
    }

    bodyMotion.stopAction();
    vrmaAction = key;
    if (opts.emotion && opts.emotion !== "neutral" && !isOnlineIdleAction(key)) {
      emotion = opts.emotion;
      bodyMotion.setEmotion?.(emotion);
      applyEmotionExpressions(emotion);
    } else if (!isOnlineIdleAction(key)) {
      emotion = bodyMotion.emotion;
      applyEmotionExpressions(emotion);
    }
    return true;
  };

  const playAction = (action, opts = {}) => {
    const key = String(action || "").toLowerCase();
    if (!key || key === "stop") {
      vrmaPlayGen += 1;
      vrmaPending = false;
      motionPlayer.stop();
      vrmaAction = null;
      const ok = bodyMotion.playAction(action, {
        emotion: opts.emotion || emotion,
        loop: opts.loop,
        loopSequence: opts.loopSequence,
        single: opts.single,
        maxMoves: opts.maxMoves,
      });
      emotion = bodyMotion.emotion;
      applyEmotionExpressions(emotion);
      void resumeCalmStand();
      return ok;
    }

    if (resolveOnlineMotionClipUrl(key)) {
      vrmaAction = key;
      void tryPlayVrmaAction(key, opts).then((ok) => {
        if (!ok && !vrmaPending && !motionPlayer.isPlaying?.()) {
          vrmaAction = null;
          bodyMotion.playAction(action, {
            emotion: opts.emotion || emotion,
            loop: opts.loop,
            loopSequence: opts.loopSequence,
            single: opts.single,
            maxMoves: opts.maxMoves,
          });
          emotion = bodyMotion.emotion;
          applyEmotionExpressions(emotion);
        }
      });
      return true;
    }

    const ok = bodyMotion.playAction(action, {
      emotion: opts.emotion || emotion,
      loop: opts.loop,
      loopSequence: opts.loopSequence,
      single: opts.single,
      maxMoves: opts.maxMoves,
    });
    emotion = bodyMotion.emotion;
    applyEmotionExpressions(emotion);
    return ok;
  };

  const playActionSequence = (actions, opts = {}) => {
    const sequence = Array.isArray(actions)
      ? actions.map((id) => String(id || "").toLowerCase()).filter(Boolean)
      : [];
    if (
      sequence.length === 1 &&
      resolveOnlineMotionClipUrl(sequence[0])
    ) {
      void tryPlayVrmaAction(sequence[0], {
        emotion: opts.emotion || emotion,
        loop: opts.loopSequence,
      });
      return true;
    }

    const ok = bodyMotion.playActionSequence(actions, {
      emotion: opts.emotion || emotion,
      loopSequence: opts.loopSequence,
    });
    emotion = bodyMotion.emotion;
    applyEmotionExpressions(emotion);
    return ok;
  };

  const stopAction = () => {
    vrmaPlayGen += 1;
    vrmaPending = false;
    motionPlayer.stop();
    vrmaAction = null;
    const ok = bodyMotion.stopAction();
    applyEmotionExpressions(emotion);
    bodyMotion.snapToRestPose?.();
    syncHumanoidPose();
    return ok;
  };
  const playGestureForText = (text, opts = {}) =>
    bodyMotion.playGestureForText(text, { emotion: opts.emotion || emotion });

  const applyContentFromReply = (text, moodHint = null) => {
    const analysis = bodyMotion.applyContentFromReply(text, moodHint);
    emotion = analysis.emotion;
    applyEmotionExpressions(emotion);
    setExpressionTargetFromBlend(analysis.expressionBlend);
    if (analysis.action && analysis.action !== "stop") {
      playAction(analysis.action, { emotion: analysis.emotion, single: true });
    } else if (analysis.action === "stop") {
      stopAction();
    }
    return analysis;
  };

  const setThinking = (on) => {
    bodyMotion.setThinking(on);
    if (on) {
      emotion = "thinking";
      applyEmotionExpressions("thinking");
      vrmaAction = "thinking";
      void tryPlayVrmaAction("thinking", { loop: true, emotion: "thinking" });
    } else if (vrmaAction === "thinking" || bodyMotion.currentAction == null) {
      applyEmotionExpressions(emotion === "thinking" ? "neutral" : emotion);
      void resumeCalmStand();
    }
    return Boolean(on);
  };

  const applyStreamingContent = (partialText) => {
    const analysis = bodyMotion.applyStreamingContent(partialText);
    emotion = analysis.emotion;
    applyEmotionExpressions(emotion);
    setExpressionTargetFromBlend(analysis.expressionBlend);
    if (analysis.action === "stop") {
      stopAction();
    }
    return analysis;
  };

  const prepareThinkingFromUser = (userText, isEnglish = false) => {
    const analysis = bodyMotion.prepareThinkingFromUser(userText, isEnglish);
    emotion = analysis.emotion;
    setExpressionTargetFromBlend(analysis.expressionBlend);
    return analysis;
  };

  const shapeToPreset = (shape) =>
    shapeToVisemePreset(shape, mouthPresets);

  const applyJawOpen = (open) => {
    const x = talkJawRotationX(open);
    const bones = [
      vrm.humanoid?.getNormalizedBoneNode?.("jaw"),
      vrm.humanoid?.getRawBoneNode?.("jaw"),
    ];
    for (const jaw of bones) {
      if (!jaw?.rotation) continue;
      jaw.rotation.x = x;
      jaw.rotation.y = 0;
      jaw.rotation.z = 0;
    }
  };

  const applyMouth = (v) => {
    const open = Math.max(0, Math.min(1, Number(v) || 0));
    if (expr && mouthPresets.length) {
      for (const preset of mouthPresets) expr.setValue(preset, 0);
      if (open > 0) {
        const preset = mouthShape ? shapeToPreset(mouthShape) : mouthPresets[0];
        if (preset) expr.setValue(preset, open);
      }
    }
    applyMorphMouthOpen(model, mouthShape || "aa", open);
    applyJawOpen(open);
  };

  const applyTalkMouthNow = (now = performance.now()) => {
    const open = talkingMouthOpen(talking, mouthOpen, now, eating);
    applyMouth(open);
    expr?.update?.();
    applyJawOpen(open);
    return open;
  };

  const setMouthOpen = (v) => {
    mouthTarget = Math.max(0, Math.min(1, Number(v) || 0));
    return mouthTarget;
  };

  const setMouthShape = (shape) => {
    mouthShape = shape ? String(shape).toLowerCase() : null;
    return mouthShape;
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    bodyMotion.setTalking(talking);
    cameraDirector.setTalking(talking);
    if (!talking) {
      cameraDirector.resetDialogue();
      if (!eating) {
        mouthTarget = 0;
        mouthOpen = 0;
        mouthShape = null;
        applyMouth(0);
      }
      applyEmotionExpressions(emotion);
    } else {
      applyEmotionExpressions(emotion);
      if (mouthTarget < 0.2) mouthTarget = Math.max(mouthTarget, 0.55);
    }
    return talking;
  };

  const setEating = (on) => {
    eating = Boolean(on);
    if (!eating && !talking) {
      mouthTarget = 0;
      mouthOpen = 0;
      applyMouth(0);
    }
    return eating;
  };

  const setTalkEnergy = (v) => bodyMotion.setTalkEnergy(v);
  const setTalkStyle = (style) => bodyMotion.setTalkStyle(style);
  const reactToSpeechChunk = (chunk, opts) => {
    cameraDirector.notifySpeech(chunk);
    const analysis = bodyMotion.reactToSpeechChunk(chunk, opts);
    if (analysis?.expressionBlend) {
      emotion = analysis.emotion || emotion;
      setExpressionTargetFromBlend(analysis.expressionBlend);
    }
    return analysis;
  };

  const tickFace = (dt, now, activeMotion) => {
    if (!talking && !eating && !activeMotion && !bodyMotion.thinking) {
      const idleBlend = clampRestFaceBlend(
        sampleIdleExpressionBlend((now - t0) * 0.001, emotion),
        { talking: false, hazards: faceHazards },
      );
      for (const [key, weight] of Object.entries(idleBlend)) {
        const preset = VRM_BLEND_PRESET_MAP[key];
        if (preset && expr?.getExpression?.(preset)) {
          expressionTarget[preset] = Math.max(
            expressionTarget[preset] ?? 0,
            weight,
          );
        }
      }
    }

    mouthOpen += (mouthTarget - mouthOpen) * Math.min(1, dt * (talking || eating ? 36 : 22));
    if (!talking && !eating && mouthOpen < 0.04) mouthOpen = 0;
    if (talking && mouthOpen < 0.12) {
      mouthOpen = Math.max(mouthOpen, sampleTalkMouthPulse(now, true) * 0.7);
    }
    if (eating && !talking) {
      mouthOpen = Math.max(mouthOpen, sampleEatMouthPulse(now, true) * 0.86);
    }

    zeroAllExpressions(expr);
    tickExpressionBlend(dt);
    applyMouth(talkingMouthOpen(talking, mouthOpen, now, eating));

    blinkTimer += dt;
    let blinkW = 0;
    if (blinkPresets.length && blinkTimer >= nextBlink) {
      const phase = blinkTimer - nextBlink;
      blinkW = blinkWeightFromPhase(phase);
      if (blinkPulseFinished(phase)) {
        blinkTimer = 0;
        nextBlink = 2.4 + Math.random() * 2.8;
      }
    }
    applyBlinkWeight(expr, blinkW);
    const open = 0.42 * (1 - blinkW);
    applyRestEyeOpen(expr, open);
    applyRestEyeOpenMorphs(model, open);
  };

  let raf = 0;

  const frame = () => {
    const dt = clock.getDelta();
    const now = performance.now();
    const vrmaPlaying = Boolean(motionPlayer.isPlaying?.());
    if (vrmaAction && !vrmaPlaying && !vrmaPending) {
      restoreAfterVrma();
    }
    const libraryMotion = vrmaPlaying || vrmaPending || Boolean(vrmaAction);
    const activeMotion = vrmaPlaying || vrmaPending
      ? vrmaAction
      : bodyMotion.currentAction;
    try {
      if (!libraryMotion) {
        bodyMotion.update(dt, { talking, now });
      }
      motionPlayer.update(dt);
      if (!libraryMotion) {
        const root = bodyMotion.getRootMotion?.() || { y: 0, rotY: 0 };
        model.position.y = baseModelY + (root.y || 0);
        model.rotation.y = baseModelRotY + (root.rotY || 0);
      } else {
        model.position.y = baseModelY;
        model.rotation.y = baseModelRotY;
      }
      if (vrm.lookAt) {
        vrm.lookAt.autoUpdate = !activeMotion;
      }
      syncLookTarget();
      syncHumanoidPose();
      tickFace(dt, now, activeMotion);
      vrm.update(dt);
      // Fingers last — VRMA mixer and vrm.update would otherwise leave Mixamo
      // hands in a T-pose (stick-straight).
      bodyMotion.applyHandRestOnly?.({
        talkBlend: talking || eating ? 0.7 : 0,
        now,
      });
      applyTalkMouthNow(now);

      computeVrmFrameAnchor(vrm, model, frameAnchor);
      if (smoothedFrameAnchor.lengthSq() < 1e-6) {
        smoothedFrameAnchor.copy(frameAnchor);
      } else {
        smoothFrameAnchor(smoothedFrameAnchor, frameAnchor, dt);
      }
      faceAnchor.copy(smoothedFrameAnchor);

      cameraDirector.setCurrentAction(activeMotion);
      const camState = cameraDirector.update(dt);
      applyUserOrbitLimits(controls);
      controls.enabled = true;
      const userOwnsCamera =
        Boolean(pointerDown) ||
        camState.userOrbiting ||
        camState.userFramingHeld;
      if (!userOwnsCamera && camState.autoActive) {
        const desired = applyAutoCameraFrame(
          controls,
          camera,
          smoothedFrameAnchor,
          portraitDist,
          {
            talkCloseBlend: camState.talkCloseBlend,
            fullBodyBlend: camState.fullBodyBlend,
          },
          dt,
          PORTRAIT_FOV,
          portraitCameraZSign,
        );
        portraitCamera.position.copy(desired.position);
        portraitCamera.target.copy(desired.target);
        portraitCamera.fov = desired.fov;
        portraitCamera.distance = desired.distance;
      } else {
        if (!userOwnsCamera) {
          applyOrbitFollowAnchor(controls, camera, smoothedFrameAnchor);
        }
        controls.update();
      }
    } catch (err) {
      console.warn("[vrm] frame update failed", err);
    }

    // Keep model scale fixed — uniform scale breathing disturbs spring-bone hair/skirt.
    model.scale.setScalar(scale);

    faceLight.intensity = 0.55 + (talking ? 0.2 : 0) + Math.sin((now - t0) * 0.002) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  clearExpressionTargets();
  setEmotion("neutral");
  zeroAllExpressions(expr);
  applyBlinkWeight(expr, 0);
  applyMouth(0);
  bodyMotion.update(1 / 60);
  syncLookTarget();
  syncHumanoidPose();
  vrm.update(1 / 60);
  applyTalkMouthNow(performance.now());
  renderer.render(scene, camera);
  void motionPlayer.warmClip("wave");
  void motionPlayer.warmClip("thinking");
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  const reactToTap = () => {
    setEmotion("happy");
    playGesture("nod");
    return emotion;
  };

  const resetCameraView = () => {
    const fittedNow = new THREE.Box3().setFromObject(model);
    frameFaceCamera({
      vrm,
      model,
      camera,
      controls,
      fitted: fittedNow,
      cameraZSign: portraitCameraZSign,
    });
    defaultPortrait.position.copy(camera.position);
    defaultPortrait.target.copy(controls.target);
    defaultPortrait.fov = camera.fov;
    defaultPortrait.distance = camera.position.distanceTo(controls.target);
    cameraDirector.resetDialogue();
    cameraDirector.holdUserFraming(false);
    cameraDirector.setUserOrbiting(false);
    syncPortraitFromControls();
    controls.update();
  };

  canvas.style.touchAction = "none";
  const orbitSurface = orbitElement || canvas;
  orbitSurface.style.touchAction = "none";
  orbitSurface.style.userSelect = "none";
  orbitSurface.style.webkitUserSelect = "none";
  orbitSurface.style.cursor = "grab";
  const unbindOrbitGuard = bindOrbitTouchGuard(orbitSurface);
  const unbindOrbitSession = bindOrbitControlSession(
    controls,
    () => {
      cameraDirector.setUserOrbiting(true);
    },
    () => {
      cameraDirector.holdUserFraming(true);
    },
  );
  orbitSurface.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    pointerDown = { x: e.clientX, y: e.clientY };
    cameraDirector.setUserOrbiting(true);
    orbitSurface.style.cursor = "grabbing";
  });
  orbitSurface.addEventListener("pointercancel", () => {
    orbitSurface.style.cursor = "grab";
    pointerDown = null;
  });
  orbitSurface.addEventListener("pointerup", (e) => {
    orbitSurface.style.cursor = "grab";
    if (!pointerDown) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if (dx * dx + dy * dy > 256) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(model, true);
    if (!hits.length) return;

    orbitSurface.style.cursor = "pointer";
    reactToTap();
    opts.onCharacterTap?.({ point: hits[0].point });
  });
  orbitSurface.addEventListener("pointermove", (e) => {
    if (pointerDown) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(model, true);
    orbitSurface.style.cursor = hits.length ? "pointer" : "grab";
  });

  const setOutfitPreset = (outfitId) => {
    applyVrmOutfitTint(model, outfitId);
  };

  return {
    schema: VRM_AVATAR_SCHEMA,
    kind: "vrm",
    vrm,
    setOutfitPreset,
    setEmotion,
    applyExpressionProfile,
    warmExpressionPresets,
    setListening,
    setMouthOpen,
    setMouthShape,
    setTalking,
    setEating,
    setTalkEnergy,
    setTalkStyle,
    reactToSpeechChunk,
    playGesture,
    playAction,
    playActionSequence,
    stopAction,
    playGestureForText,
    applyContentFromReply,
    setThinking,
    applyStreamingContent,
    prepareThinkingFromUser,
    reactToTap,
    get emotion() {
      return emotion;
    },
    get eating() {
      return eating;
    },
    get currentAction() {
      return vrmaAction || bodyMotion.currentAction;
    },
    warmMotionClip(actionId) {
      return motionPlayer.warmClip(actionId);
    },
    resetIdleLife(now) {
      return bodyMotion.resetIdleLife?.(now);
    },
    resetMotionClock(now) {
      return bodyMotion.resetMotionClock?.(now);
    },
    get mouthOpen() {
      return mouthOpen;
    },
    resize,
    resetCameraView,
    hitTest(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(model, true).length > 0;
    },
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener?.("resize", resize);
      unbindOrbitGuard();
      unbindOrbitSession();
      controls.dispose();
      vrm.dispose?.();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
