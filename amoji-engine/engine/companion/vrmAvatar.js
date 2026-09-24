/**
 * VRM anime companion avatar — MToon shading, expressions, spring bones,
 * Unreal-style OrbitControls. Default model: companion-girl.vrm (VRM 1.0 sample).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";
import {
  applyAutoCameraFrame,
  applyPortraitShot,
  CAMERA_RESET_LERP_RATE,
  lerpCameraTowardShot,
  resolveFrontPortraitFrame,
} from "./companionCameraApply.js";
import {
  createCompanionCameraDirector,
} from "./companionCameraDirector.js";
import {
  applyOrbitFollowAnchor,
  computeVrmFrameAnchor,
  smoothFrameAnchor,
} from "./companionCameraFollow.js";
import {
  PORTRAIT_CAMERA_Z_SIGN,
  PORTRAIT_FOV,
  applyUserOrbitLimits,
  correctPortraitModelYaw,
  facingAlignmentScore,
  isHeadFacingCamera,
  modelBodyFacingScore,
  normalizeModelYaw,
  portraitFrameResolveScore,
  portraitVisibleFacingScore,
  portraitDistanceForHeight,
} from "./companionPortraitFraming.js";
import {
  bindCompanionAvatarPointer,
  computeAvatarScreenBand,
  collectAvatarPokeMeshes,
  computePokeWaistYFromObject,
} from "./companionAvatarPointer.js";
import {
  bindOrbitControlSession,
  bindOrbitTouchGuard,
  bindOrbitWheelZoom,
  configureCompanionOrbitControls,
  resolveOrbitDomElement,
} from "./companionOrbitControls.js";
import { actionLoops } from "./companionActionMotion.js";
import { BOOT_FULL_LIBRARY_WARM_CLIP_IDS } from "./companionIdleMotionPreload.js";
import { detectVrmIdleRestRotations } from "./companionArmRestCalibration.js";
import {
  applyIdlePresentation,
  establishCalmStandFromBind,
} from "./companionCalmStandFoundation.js";
import { createCompanionBodyMotion } from "./companionBodyMotion.js";
import {
  auditPlantedLimbDualWrite,
  syncHumanoidSkinnedRawFromNormalized,
} from "./companionPlantedLimbLock.js";
import { characterGender } from "./companionCharacterCatalog.js";
import {
  inferFingerFlexAxis,
} from "./companionFingerPose.js";
import {
  blendIdleExpressionLayer,
  buildVrmExpressionBlend,
  mergeVrmExpressionBlends,
} from "./companionContentMotion.js";
import {
  adaptBlendForFaceProfile,
  buildModelFaceProfile,
  resolveTalkEmotionMorphWeights,
} from "./companionFaceEmotion.js";
import {
  CALM_IDLE_USES_PROCEDURAL_BODY,
  hostedVrmaSkipsVrmBody,
  isOnlineIdleAction,
  isOnlineLoopingLibraryAction,
  ONLINE_CALM_IDLE_ACTION,
  PROCEDURAL_PREFERRED_ACTIONS,
  resolveOnlineMotionClipUrl,
} from "./companionOnlineMotionClips.mjs";
import { createCompanionTreatProp } from "./companionTreatProp.js";
import {
  isTalkBackgroundLibraryAction,
  isTalkLibraryLoopAction,
  resolveTalkGestureLibraryAction,
  resolveTalkLibraryAction,
} from "./companionTalkMotionLibrary.mjs";
import { createVrmMotionPlayer } from "./companionVrmMotionPlayer.js";
import {
  auditVrmSkeletonDegrees,
  DEFAULT_MOTION_CROSSFADE_SEC,
  libraryOwnsVrmBody,
  planMotionTransition,
  resolveMotionCrossfadeSec,
  tickVrmMotionTransition,
} from "./vrmMotionTransition.js";
import { companionGestureStyle } from "./companionPoseLibrary.js";
import {
  idleBeatDurationSec,
  sampleIdleExpressionBlend,
} from "./companionIdleMotion.js";
import { resolveVrmLookAtAutoUpdate } from "./companionVrmLookAt.js";
import {
  auditVrmSpringGravity,
  configureVrmSpringStability,
  createIdleSpringRecenterState,
  recenterVrmSpringBones,
  setVrmSceneWindMode,
  stabilizeVrmSpringBones,
  tickIdleSpringRecenter,
  tickOutdoorSceneWind,
  THINK_SPRING_RECENTER_SEC,
  TALK_SPRING_RECENTER_SEC,
} from "./vrmSpringStability.js";
import { applyVrmOutfitTint } from "./companionOutfitApply.js";
import {
  computeVrmDisplayBounds,
  resolveVrmFitHeight,
} from "./vrmModelBounds.js";
import {
  hemisphereIntensityForScene,
  rendererExposureForScene,
  syncCameraRelativeStageLights,
} from "./companionStageLighting.js";
import {
  countMeshTriangles,
  summarizeMorphTargets,
} from "./companionMeshStats.js";
import {
  applyBlinkWeight,
  applyMorphMouthOpen,
  applyTalkEmotionMorphs,
  blinkExpressionNames,
  blinkPulseFinished,
  blinkWeightFromPhase,
  clampRestFaceBlend,
  applyRestEyeOpen,
  applyRestEyeOpenMorphs,
  capTalkingEmotionWeight,
  guardLookAtLids,
  inspectVrmFaceHazards,
  listExpressionNames,
  MOUTH_CLOSE_EPS,
  TALK_MOUTH_OPEN_MAX,
  resolveMouthPresets,
  sampleEatMouthPulse,
  sampleTalkMouthPulse,
  shapeToVisemePreset,
  scaleTalkMouthOpen,
  softenTalkMouthOverrides,
  talkJawRotationX,
  talkingMouthOpen,
  talkingVisemeShape,
  zeroAllExpressions,
  zeroHazardMorphInfluences,
} from "./companionFaceRest.js";

export const VRM_AVATAR_SCHEMA = "amoji.vrmAvatar.v1";

const EMOTION_EXPRESSIONS = {
  neutral: {},
  happy: { [VRMExpressionPresetName.Happy]: 0.98 },
  thinking: {
    [VRMExpressionPresetName.Relaxed]: 0.32,
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

/**
 * @param {GLTFLoader} loader
 * @param {string} modelUrl
 * @param {(ratio: number, label?: string) => void} [onProgress]
 */
async function loadVrmGltf(loader, modelUrl, onProgress, characterId) {
  const { modelPathMatchesCharacterId } = await import("./companionModelAssets.mjs");
  const id = String(characterId || "").trim().toLowerCase();

  // Only use a prefetch buffer when it belongs to this character's roster path.
  let preload =
    globalThis.__amojiPreload?.getVrm?.(modelUrl) ??
    globalThis.__amojiPreload?.getVrm?.(modelUrl.split("?")[0]) ??
    null;
  if (preload && id && !modelPathMatchesCharacterId(modelUrl, id)) {
    preload = null;
  }
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

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   controlsElement?: HTMLElement | null,
 *   modelUrl?: string,
 *   onCharacterTap?: (info: { point: import('three').Vector3 }) => void,
 *   onProgress?: (ratio: number, label?: string) => void,
 *   isAssistantSpeaking?: () => boolean,
 * }} opts
 */
export async function createVrmAvatar(opts) {
  const canvas = opts.canvas;
  const orbitElement = resolveOrbitDomElement({
    canvas,
    controlsElement: opts.controlsElement,
  });
  let modelUrl = opts.modelUrl || "";
  try {
    const { coerceCanonicalModelFetchUrl, defaultVrmModelFetchUrl } =
      await import("./companionModelAssets.mjs");
    if (!modelUrl) {
      modelUrl =
        defaultVrmModelFetchUrl(opts.characterId) ||
        defaultVrmModelFetchUrl("nova");
    }
    modelUrl =
      coerceCanonicalModelFetchUrl(modelUrl, opts.characterId) || modelUrl;
    const { modelPathMatchesCharacterId, characterModelFetchUrl } =
      await import("./companionModelAssets.mjs");
    if (
      opts.characterId &&
      modelUrl &&
      !modelPathMatchesCharacterId(modelUrl, opts.characterId)
    ) {
      modelUrl = characterModelFetchUrl(opts.characterId);
    }
  } catch {
    if (!modelUrl) {
      modelUrl = "/prototypes/assets/companion-nova.vrm";
    }
  }

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
  camera.position.set(0, 1.42, 3.35);

  const hemi = new THREE.HemisphereLight(0xffe8dc, 0x1a2030, 1.05);
  scene.add(hemi);
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
  controls.target.set(0, 1.42, 0);
  controls.update();

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const loadedModelUrl = modelUrl;
  const loadedCharacterId = String(opts.characterId || "nova").toLowerCase();
  const idleRestOpts = { characterId: loadedCharacterId };
  const gltf = await loadVrmGltf(
    loader,
    modelUrl,
    opts.onProgress,
    loadedCharacterId,
  );
  opts.onProgress?.(1, "model");
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error("VRM data missing from model");

  const model = vrm.scene;
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        m.visible = true;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        if (typeof m.envMapIntensity === "number") {
          m.envMapIntensity = Math.max(m.envMapIntensity, 0.85);
        }
        m.needsUpdate = true;
      }
    }
  });

  // Portrait framing — upper body / face (skip stray oversized meshes in some VRMs)
  const box = computeVrmDisplayBounds(model);
  const size = box.getSize(new THREE.Vector3());
  size.y = Math.max(size.y, resolveVrmFitHeight(model, vrm.humanoid));
  const center = box.getCenter(new THREE.Vector3());
  const hipsNode = vrm.humanoid?.getNormalizedBoneNode?.("hips");
  if (hipsNode) {
    const hipsWorld = new THREE.Vector3();
    hipsNode.updateMatrixWorld(true);
    hipsNode.getWorldPosition(hipsWorld);
    center.x = hipsWorld.x;
    center.z = hipsWorld.z;
  }
  const scale = 0.92 / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.z = -center.z * scale;
  model.position.y = -box.min.y * scale;
  const baseModelY = model.position.y;
  let baseModelRotY = model.rotation.y;
  let lastPortraitFacingFixMs = 0;
  let portraitFacingBootFrames = 0;
  scene.add(model);
  vrm.humanoid?.resetNormalizedPose?.();
  const bodyMotion = createCompanionBodyMotion(vrm.humanoid);
  bodyMotion.setFingerFlexAxis?.(inferFingerFlexAxis(vrm.humanoid));
  bodyMotion.setIdleGender?.(
    characterGender(opts.characterId || "nova", "yue"),
  );
  /** @type {"indoor" | "outdoor"} */
  let sceneEnvironment = "indoor";
  let sceneBackgroundId = null;
  const bootIdleRest = detectVrmIdleRestRotations(vrm, idleRestOpts);
  bodyMotion.setArmRestRotations?.(bootIdleRest.arms);
  bodyMotion.setLegRestRotations?.(bootIdleRest.legs);
  bodyMotion.setArmBind?.(bootIdleRest.bind);
  bodyMotion.snapToRestPose?.();
  configureVrmSpringStability(vrm, sceneEnvironment);
  const treatProp = createCompanionTreatProp(vrm.humanoid);
  let springIdleState = createIdleSpringRecenterState();
  let springTalkState = createIdleSpringRecenterState();
  /** @type {ReturnType<typeof createMotionTransitionState>} */
  let motionTransitionState = null;
  /** @type {string | null} */
  let vrmaAction = null;
  let vrmaPending = false;
  let vrmaPlayGen = 0;
  /** @type {string | null} */
  let talkLibraryAction = null;
  /** @type {string[]} */
  let vrmaSequenceQueue = [];
  /** @type {object | null} */
  let vrmaSequenceOpts = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let idleBeatRestoreTimer = null;

  const scheduleCalmIdleAfterBeat = (beat, now = performance.now()) => {
    if (CALM_IDLE_USES_PROCEDURAL_BODY) return;
    if (idleBeatRestoreTimer) clearTimeout(idleBeatRestoreTimer);
    const durationMs = idleBeatDurationSec(beat) * 1000 + 260;
    idleBeatRestoreTimer = setTimeout(() => {
      idleBeatRestoreTimer = null;
      if (
        talking ||
        eating ||
        bodyMotion.thinking ||
        bodyMotion.currentAction ||
        vrmaPending
      ) {
        return;
      }
      void playCalmLibraryIdle();
    }, durationMs);
  };

  const syncThinkingLibraryMotion = () => {
    if (talking || eating || !bodyMotion.thinking) return false;
    if (hostedVrmaSkipsVrmBody("thinking")) {
      if (
        vrmaAction &&
        (motionPlayer.isPlaying?.() || motionPlayer.isCrossfading?.() || vrmaPending)
      ) {
        clearHostedBodyMotion();
      }
      return true;
    }
    if (
      vrmaAction === "thinking" &&
      (motionPlayer.isAnimating?.() || motionPlayer.isPlaying?.())
    ) {
      return true;
    }
    return tryPlayVrmaAction("thinking", { loop: true });
  };

  const syncTalkLibraryMotion = (force = false) => {
    if (!talking || eating) {
      talkLibraryAction = null;
      return false;
    }
    if (hostedVrmaSkipsVrmBody("thinking")) {
      talkLibraryAction = null;
      if (
        vrmaAction &&
        (motionPlayer.isPlaying?.() || motionPlayer.isCrossfading?.() || vrmaPending)
      ) {
        clearHostedBodyMotion();
      }
      return false;
    }
    const desired = resolveTalkLibraryAction(bodyMotion.talkStyle, emotion);
    if (!desired || !resolveOnlineMotionClipUrl(desired)) {
      talkLibraryAction = null;
      return false;
    }
    const sameTrack =
      talkLibraryAction === desired &&
      vrmaAction === desired &&
      (motionPlayer.isPlaying?.() || vrmaPending);
    if (!force && sameTrack) return true;

    if (
      !force &&
      vrmaAction &&
      !isTalkBackgroundLibraryAction(vrmaAction) &&
      (motionPlayer.isPlaying?.() || vrmaPending)
    ) {
      return false;
    }

    talkLibraryAction = desired;
    void tryPlayVrmaAction(desired, { loop: isTalkLibraryLoopAction(desired) });
    return true;
  };

  const restoreAfterVrma = () => {
    if (vrmaPending) return;
    const finished = vrmaAction;
    if (isOnlineLoopingLibraryAction(finished) && motionPlayer.isPlaying?.()) {
      return;
    }
    if (talking && !eating) {
      syncTalkLibraryMotion(true);
      return;
    }
    if (bodyMotion.thinking && !eating) {
      syncThinkingLibraryMotion();
      return;
    }
    void resumeCalmStand();
  };

  /** Drop hosted VRMA body weight without resetting procedural idle life. */
  const clearHostedBodyMotion = () => {
    const hadHosted = Boolean(
      vrmaAction ||
        vrmaPending ||
        motionPlayer.isPlaying?.() ||
        motionPlayer.isCrossfading?.(),
    );
    if (!hadHosted) {
      vrmaAction = null;
      vrmaPending = false;
      return false;
    }
    vrmaPlayGen += 1;
    vrmaPending = false;
    vrmaSequenceQueue = [];
    vrmaSequenceOpts = null;
    if (CALM_IDLE_USES_PROCEDURAL_BODY) {
      motionPlayer.forceStop?.(true);
    } else {
      motionPlayer.stop?.(DEFAULT_MOTION_CROSSFADE_SEC);
    }
    motionTransitionState = null;
    vrmaAction = null;
    return true;
  };

  const restoreProceduralCalmStand = (opts = {}) => {
    clearHostedBodyMotion();
    if (CALM_IDLE_USES_PROCEDURAL_BODY) {
      establishCalmStandFromBind(vrm, bodyMotion, {
        resetIdleLife: opts.resetIdleLife !== false,
        warmFrames: Number(opts.warmFrames) || 16,
        characterId: loadedCharacterId,
      });
    } else {
      vrm.humanoid?.resetNormalizedPose?.();
      const rest = detectVrmIdleRestRotations(vrm, idleRestOpts);
      bodyMotion.setArmRestRotations?.(rest.arms);
      bodyMotion.setLegRestRotations?.(rest.legs);
      bodyMotion.setArmBind?.(rest.bind);
      bodyMotion.snapToRestPose?.();
      if (opts.resetIdleLife !== false) {
        bodyMotion.resetIdleLife?.();
      }
    }
    syncHumanoidPose();
    syncSpringsAfterPose();
    springIdleState = createIdleSpringRecenterState();
    springTalkState = createIdleSpringRecenterState();
    return true;
  };

  const playCalmLibraryIdle = (opts = {}) => {
    if (CALM_IDLE_USES_PROCEDURAL_BODY) {
      clearHostedBodyMotion();
      if (opts.full === true) {
        restoreProceduralCalmStand({ resetIdleLife: false });
      }
      return Promise.resolve(true);
    }
    if (
      motionPlayer.isPlaying?.() &&
      vrmaAction === ONLINE_CALM_IDLE_ACTION &&
      !vrmaPending
    ) {
      return Promise.resolve(true);
    }
    if (!opts.skipTransitionPlan) {
      motionTransitionState =
        planMotionTransition(vrm, motionPlayer, {
          nextActionId: ONLINE_CALM_IDLE_ACTION,
          durationSec: DEFAULT_MOTION_CROSSFADE_SEC + 0.08,
          label: "calm-idle",
        }) ?? motionTransitionState;
    }
    return tryPlayVrmaAction(ONLINE_CALM_IDLE_ACTION, {
      loop: true,
      skipTransitionPlan: true,
    });
  };

  const restorePlantedIdle = () => {
    restoreProceduralCalmStand({ resetIdleLife: false });
  };

  const resumeCalmStand = async () => {
    restoreProceduralCalmStand({ resetIdleLife: true });
    return false;
  };

  const motionPlayer = createVrmMotionPlayer({
    vrm,
    onComplete: () => {
      if (vrmaSequenceQueue.length > 0) {
        const next = vrmaSequenceQueue.shift();
        void tryPlayVrmaAction(next, vrmaSequenceOpts || {});
        return;
      }
      vrmaSequenceOpts = null;
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

  const syncSpringsAfterPose = (opts = {}) => {
    try {
      vrm.scene?.updateMatrixWorld?.(true);
    } catch {
      /* ignore */
    }
    return recenterVrmSpringBones(vrm, {
      retune: true,
      captureInit: opts.captureInit,
    });
  };

  bodyMotion.setActionCompleteHandler?.(({ sequenceDone, next }) => {
    if (!sequenceDone || next) return;
    restoreProceduralCalmStand({ resetIdleLife: false });
  });

  const frameAnchor = new THREE.Vector3();
  const smoothedFrameAnchor = new THREE.Vector3();
  const headBone = vrm.humanoid?.getNormalizedBoneNode?.("head");
  let faceAnchor = computeVrmFrameAnchor(vrm, model);
  let portraitDist = portraitDistanceForHeight(
    resolveVrmFitHeight(model, vrm.humanoid),
  );
  let portraitCameraZSign = PORTRAIT_CAMERA_Z_SIGN;
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
  /** @type {(() => import('./companionCameraApply.js').ReturnType<typeof resolveFrontPortraitFrame>) | null} */
  let applyDefaultPortraitFrame = null;

  configureVrmSpringStability(vrm, sceneEnvironment);
  establishCalmStandFromBind(vrm, bodyMotion, {
    resetIdleLife: false,
    warmFrames: 48,
    characterId: loadedCharacterId,
  });
  configureVrmSpringStability(vrm, sceneEnvironment);
  recenterVrmSpringBones(vrm, { retune: true, captureInit: true });
  clearHostedBodyMotion();
  restoreProceduralCalmStand({ resetIdleLife: true, warmFrames: 20 });
  syncSpringsAfterPose({ captureInit: true });
  const syncPortraitFromControls = () => {
    portraitCamera.position.copy(camera.position);
    portraitCamera.target.copy(controls.target);
    portraitCamera.fov = camera.fov;
    portraitCamera.distance = camera.position.distanceTo(controls.target);
  };
  const cameraDirector = createCompanionCameraDirector();
  cameraDirector.resetBootGrace();
  const refreshPokeMeshes = () => collectAvatarPokeMeshes(model);
  let pokeMeshes = refreshPokeMeshes();
  /** @type {{ target: THREE.Vector3, position: THREE.Vector3, fov: number } | null} */
  let cameraResetAnim = null;
  /** @type {ReturnType<typeof bindCompanionAvatarPointer> | null} */
  let avatarPointer = null;

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

  applyDefaultPortraitFrame = () => {
    bodyMotion.cancelPokeShake?.();
    bodyMotion.resetSmoothedRoot?.();
    model.rotation.y = baseModelRotY;
    model.position.y = baseModelY;
    vrm.scene?.updateMatrixWorld?.(true);
    headBone?.updateMatrixWorld?.(true);
    const fittedNow = computeVrmDisplayBounds(model);
    const fittedHeight = resolveVrmFitHeight(model, vrm.humanoid);
    faceAnchor = computeVrmFrameAnchor(vrm, model);
    const resolved = resolveFrontPortraitFrame({
      model,
      headBone,
      humanoid: vrm.humanoid,
      anchor: faceAnchor,
      fittedHeight,
      baseFov: PORTRAIT_FOV,
      baseYaw: baseModelRotY,
    });
    portraitDist = resolved.portraitDist;
    portraitCameraZSign = resolved.zSign;
    baseModelRotY = normalizeModelYaw(model);
    applyUserOrbitLimits(controls);
    applyPortraitShot(controls, camera, resolved.shot, { portraitDist });
    smoothedFrameAnchor.copy(faceAnchor);
    defaultPortrait.position.copy(camera.position);
    defaultPortrait.target.copy(controls.target);
    defaultPortrait.fov = camera.fov;
    defaultPortrait.distance = portraitDist;
    portraitCamera.position.copy(camera.position);
    portraitCamera.target.copy(controls.target);
    portraitCamera.fov = camera.fov;
    portraitCamera.distance = portraitDist;
    cameraResetAnim = null;
    cameraDirector.resetDialogue();
    cameraDirector.holdUserFraming(false);
    cameraDirector.setUserOrbiting(false);
    if (
      !isHeadFacingCamera(headBone, camera, vrm.humanoid, model) &&
      correctPortraitModelYaw(model, headBone, camera, vrm.humanoid)
    ) {
      baseModelRotY = normalizeModelYaw(model);
      const refit = resolveFrontPortraitFrame({
        model,
        headBone,
        humanoid: vrm.humanoid,
        anchor: faceAnchor,
        fittedHeight,
        baseFov: PORTRAIT_FOV,
        baseYaw: baseModelRotY,
      });
      portraitDist = refit.portraitDist;
      portraitCameraZSign = refit.zSign;
      applyPortraitShot(controls, camera, refit.shot, { portraitDist });
      portraitCamera.position.copy(camera.position);
      portraitCamera.target.copy(controls.target);
      portraitCamera.fov = camera.fov;
      portraitCamera.distance = portraitDist;
    }
    syncLookTarget();
    return resolved;
  };
  applyDefaultPortraitFrame();

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
  const morphSummary = summarizeMorphTargets(model);
  const expressionNames = listExpressionNames(expr);
  const triangleCount = countMeshTriangles(model);
  const faceProfile = buildModelFaceProfile({
    expr,
    morphSummary,
    hazards: faceHazards,
    expressionNames,
    triangleCount,
    modelUrl,
    characterId: opts.characterId || null,
  });
  const faceReport = {
    triangleCount,
    morphTargetCount: morphSummary.morphTargetCount,
    morphNamesSample: morphSummary.morphNames.slice(0, 16),
    expressionNames,
    mouthPresets: [...mouthPresets],
    blinkPresets: [...blinkPresets],
    hasVisemes: mouthPresets.length >= 3,
    faceProfile: {
      rigType: faceProfile.rigType,
      usePresets: faceProfile.usePresets,
      useMorphFallback: faceProfile.useMorphFallback,
      presetScale: { ...faceProfile.presetScale },
    },
    hazards: {
      opensMouth: [...(faceHazards.opensMouth || [])],
      blocksMouth: [...(faceHazards.blocksMouth || [])],
      closesEyes: [...(faceHazards.closesEyes || [])],
    },
  };

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

  const resolveMorphWeights = (activeTalking = talking || eating) =>
    resolveTalkEmotionMorphWeights(
      emotion,
      activeTalking,
      bodyMotion.nuance && bodyMotion.nuance !== "none"
        ? bodyMotion.nuance
        : "none",
      faceProfile,
    );

  const setExpressionTargetFromBlend = (blend) => {
    clearExpressionTargets();
    const adapted = adaptBlendForFaceProfile(blend, faceProfile);
    const safe = clampRestFaceBlend(adapted, {
      talking: talking || eating,
      hazards: faceHazards,
      caps: faceProfile.caps,
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

  let expressionSnapBoost = 0;

  const applyExpressionProfile = ({
    emotion: em = "neutral",
    nuance = "none",
    blend: blendOverride,
    snapStrength = 0,
  } = {}) => {
    emotion = bodyMotion.setEmotion(em);
    bodyMotion.setContentNuance(nuance);
    const blend = blendOverride || buildVrmExpressionBlend(em, nuance);
    setExpressionTargetFromBlend(blend);
    const snap = Math.max(0, Math.min(1, Number(snapStrength) || 0));
    if (snap > 0.35) {
      expressionSnapBoost = Math.max(expressionSnapBoost, snap);
      if (talking && expr) {
        const pull = Math.min(1, 0.42 + snap * 0.58);
        for (const preset of emotionPresetKeys()) {
          const target = expressionTarget[preset] ?? 0;
          const current = expressionCurrent[preset] ?? 0;
          expressionCurrent[preset] = current + (target - current) * pull;
        }
      }
    }
    return { emotion: em, nuance, blend };
  };

  const tickExpressionBlend = (dt) => {
    if (!expr) return;
    const snap = expressionSnapBoost;
    expressionSnapBoost = Math.max(0, expressionSnapBoost - dt * 3.6);
    const talkRate = talking ? 42 + snap * 48 : 26;
    const rate = Math.min(1, dt * talkRate);
    for (const preset of emotionPresetKeys()) {
      if (talking || eating) {
        expressionTarget[preset] = capTalkingEmotionWeight(
          preset,
          expressionTarget[preset] ?? 0,
          { talking, eating, caps: faceProfile.caps },
        );
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
    for (const emotion of [
      "neutral",
      "happy",
      "thinking",
      "sad",
      "surprised",
      "angry",
    ]) {
      for (const nuance of [
        "none",
        "shy",
        "curious",
        "excited",
        "love",
        "stress",
      ]) {
        setExpressionTargetFromBlend(
          buildVrmExpressionBlend(emotion, nuance),
        );
        tickExpressionBlend(0.12);
      }
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

  const playGesture = (style) => {
    const key = companionGestureStyle(style);
    const libraryId =
      resolveTalkGestureLibraryAction(key) ||
      (key === "nod" || key === "bow" ? "nod" : key === "point" ? "point" : null);
    if (
      libraryId &&
      resolveOnlineMotionClipUrl(libraryId) &&
      !hostedVrmaSkipsVrmBody(libraryId)
    ) {
      void tryPlayVrmaAction(libraryId, { loop: false });
      return true;
    }
    return bodyMotion.playGesture(style);
  };

  const tryPlayVrmaAction = async (action, opts = {}) => {
    const key = String(action || "").toLowerCase();
    if (!key || key === "none" || key === "stop") return false;
    if (!resolveOnlineMotionClipUrl(key)) return false;
    if (hostedVrmaSkipsVrmBody(key)) return false;

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
    const crossfadeSec = resolveMotionCrossfadeSec(
      motionPlayer.activeActionId,
      key,
    );
    if (!opts.skipTransitionPlan) {
      motionTransitionState =
        planMotionTransition(vrm, motionPlayer, {
          nextActionId: key,
          durationSec: crossfadeSec + 0.08,
          label: key,
        }) ?? null;
    }
    const ok = await motionPlayer.play(key, {
      loop,
      transitionSec: crossfadeSec,
    });
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
      vrmaSequenceQueue = [];
      vrmaSequenceOpts = null;
      if (CALM_IDLE_USES_PROCEDURAL_BODY) {
        motionPlayer.forceStop?.(false);
      } else {
        motionPlayer.stop(DEFAULT_MOTION_CROSSFADE_SEC);
      }
      vrmaAction = null;
      motionTransitionState = null;
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

    const useProceduralBody =
      PROCEDURAL_PREFERRED_ACTIONS.has(key) ||
      hostedVrmaSkipsVrmBody(key) ||
      !resolveOnlineMotionClipUrl(key);

    if (useProceduralBody) {
      vrmaPlayGen += 1;
      vrmaPending = false;
      vrmaSequenceQueue = [];
      vrmaSequenceOpts = null;
      motionTransitionState = null;
      motionPlayer.forceStop?.(false);
      vrmaAction = null;
      const ok = bodyMotion.playAction(action, {
        emotion: opts.emotion || emotion,
        loop: opts.loop,
        single: opts.single ?? !opts.loop,
        maxMoves: opts.maxMoves,
      });
      emotion = bodyMotion.emotion;
      applyEmotionExpressions(emotion);
      return ok;
    }

    vrmaSequenceQueue = [];
    vrmaSequenceOpts = null;
    vrmaAction = key;
    void tryPlayVrmaAction(key, opts).then((ok) => {
      if (ok || vrmaPending || motionPlayer.isPlaying?.()) return;
      vrmaAction = null;
      bodyMotion.playAction(key, {
        emotion: opts.emotion || emotion,
        loop: opts.loop,
        single: opts.single ?? !opts.loop,
        maxMoves: opts.maxMoves,
      });
      emotion = bodyMotion.emotion;
      applyEmotionExpressions(emotion);
    });
    return true;
  };

  const playActionSequence = (actions, opts = {}) => {
    const sequence = Array.isArray(actions)
      ? actions.map((id) => String(id || "").toLowerCase()).filter(Boolean)
      : [];
    if (!sequence.length) return false;

    if (
      CALM_IDLE_USES_PROCEDURAL_BODY ||
      sequence.every((id) => hostedVrmaSkipsVrmBody(id))
    ) {
      vrmaPlayGen += 1;
      vrmaPending = false;
      vrmaSequenceQueue = [];
      vrmaSequenceOpts = null;
      motionTransitionState = null;
      motionPlayer.forceStop?.(false);
      vrmaAction = null;
      return bodyMotion.playAction(sequence[0], {
        emotion: opts.emotion || emotion,
        loop: opts.loopSequence,
        loopSequence: opts.loopSequence,
      });
    }

    const online = sequence.filter((id) => resolveOnlineMotionClipUrl(id));
    if (!online.length) return false;

    vrmaPlayGen += 1;
    vrmaSequenceOpts = {
      emotion: opts.emotion || emotion,
      loop: opts.loopSequence,
    };
    if (online.length === 1) {
      vrmaSequenceQueue = [];
      void tryPlayVrmaAction(online[0], vrmaSequenceOpts);
      return true;
    }

    vrmaSequenceQueue = online.slice(1);
    void tryPlayVrmaAction(online[0], vrmaSequenceOpts);
    emotion = bodyMotion.emotion;
    applyEmotionExpressions(emotion);
    return true;
  };

  const stopAction = () => {
    treatProp.detach();
    const ok = bodyMotion.stopAction();
    emotion = bodyMotion.emotion;
    applyEmotionExpressions(emotion);
    restoreProceduralCalmStand();
    return ok;
  };
  const attachTreatProp = (item) => treatProp.attach(item);
  const detachTreatProp = () => treatProp.detach();
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
      if (!talking && !eating) {
        syncThinkingLibraryMotion();
      }
    } else {
      if (emotion === "thinking") emotion = "neutral";
      applyEmotionExpressions(emotion);
      if (!talking && !eating) {
        void playCalmLibraryIdle();
      }
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
    applyEmotionExpressions(emotion);
    setExpressionTargetFromBlend(analysis.expressionBlend);
    if (!talking && !eating) {
      bodyMotion.setThinking(true);
      syncThinkingLibraryMotion();
    }
    return analysis;
  };

  const shapeToPreset = (shape) =>
    shapeToVisemePreset(shape, mouthPresets);

  const applyJawOpen = (open) => {
    const x = talkJawRotationX(open, faceProfile.talkJawScale ?? 1);
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

  const applyMouth = (v, now = performance.now()) => {
    const open = Math.max(0, Math.min(1, Number(v) || 0));
    const shape = talkingVisemeShape(now, talking || eating, mouthShape);
    if (expr && mouthPresets.length) {
      for (const preset of mouthPresets) expr.setValue(preset, 0);
      if (open > 0) {
        const preset = shapeToPreset(shape) || mouthPresets[0];
        if (preset) {
          const floor =
            talking || eating ? Math.min(TALK_MOUTH_OPEN_MAX, 0.18) : 0;
          expr.setValue(preset, Math.max(open, floor));
        }
      }
    }
    return { open, shape };
  };

  const applyTalkMouthNow = (now = performance.now()) => {
    softenTalkMouthOverrides(expr, talking || eating);
    const voiceDrivingMouth =
      mouthTarget > MOUTH_CLOSE_EPS || mouthOpen > MOUTH_CLOSE_EPS;
    let open = talkingMouthOpen(
      talking || voiceDrivingMouth,
      mouthOpen,
      now,
      eating,
    );
    if (!talking && !eating && !voiceDrivingMouth) {
      open = 0;
      if (mouthOpen < MOUTH_CLOSE_EPS) mouthOpen = 0;
      if (mouthTarget < MOUTH_CLOSE_EPS) mouthTarget = 0;
    }
    open = scaleTalkMouthOpen(open, faceProfile);
    const { shape } = applyMouth(open, now);
    expr?.update?.();
    // Visemes + jaw last so Happy/Surprised cannot freeze the mouth.
    const skipMorphMouth =
      faceProfile.skipMorphMouthWhenPresets && mouthPresets.length >= 3;
    if (!skipMorphMouth) {
      applyMorphMouthOpen(model, shape, open);
    }
    applyTalkEmotionMorphs(
      model,
      emotion,
      talking || eating,
      resolveMorphWeights(talking || eating),
    );
    applyJawOpen(open);
    return open;
  };

  const setMouthOpen = (v) => {
    mouthTarget = Math.max(
      0,
      Math.min(TALK_MOUTH_OPEN_MAX, Number(v) || 0),
    );
    if (mouthTarget > MOUTH_CLOSE_EPS && !talking && !eating) {
      setTalking(true);
    }
    if (mouthTarget > MOUTH_CLOSE_EPS && (talking || eating)) {
      mouthOpen = Math.max(mouthOpen, mouthTarget * 0.62);
      mouthOpen += (mouthTarget - mouthOpen) * 0.55;
    }
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
      talkLibraryAction = null;
      cameraDirector.resetDialogue();
      if (!eating) {
        mouthTarget = 0;
        mouthOpen = 0;
        mouthShape = null;
        applyMouth(0);
        applyMorphMouthOpen(model, "aa", 0);
        applyTalkEmotionMorphs(model, emotion, false, resolveMorphWeights(false));
        applyJawOpen(0);
      }
      applyEmotionExpressions(emotion);
      softenTalkMouthOverrides(expr, false);
      motionPlayer.forceStop?.(false);
      vrmaAction = null;
      vrmaPending = false;
      motionTransitionState = null;
      if (!eating) {
        restorePlantedIdle();
        bodyMotion.reapplyPlantedLimbs?.({ force: true, now: performance.now() });
      }
    } else {
      applyEmotionExpressions(emotion);
      if (mouthTarget < 0.15) mouthTarget = Math.max(mouthTarget, 0.22);
      syncTalkLibraryMotion(true);
    }
    return talking;
  };

  const setEating = (on) => {
    eating = Boolean(on);
    if (!eating) {
      treatProp.detach();
      if (!talking) {
        mouthTarget = 0;
        mouthOpen = 0;
        applyMouth(0);
        if (emotion === "happy") {
          setEmotion("happy");
        }
      }
    }
    return eating;
  };

  const setTalkEnergy = (v) => bodyMotion.setTalkEnergy(v);
  const setTalkStyle = (style) => {
    const prev = bodyMotion.talkStyle;
    bodyMotion.setTalkStyle(style);
    if (talking && style !== prev) syncTalkLibraryMotion(true);
    return bodyMotion.talkStyle;
  };
  const reactToSpeechChunk = (chunk, opts) => {
    cameraDirector.notifySpeech(chunk);
    const prevStyle = bodyMotion.talkStyle;
    const analysis = bodyMotion.reactToSpeechChunk(chunk, opts);
    if (analysis?.expressionBlend) {
      applyExpressionProfile({
        emotion: analysis.emotion || emotion,
        nuance: analysis.nuance || bodyMotion.nuance || "none",
        blend: analysis.expressionBlend,
      });
    }
    if (talking && analysis?.gesture) {
      const accent = resolveTalkGestureLibraryAction(analysis.gesture);
      if (accent && !hostedVrmaSkipsVrmBody(accent) && resolveOnlineMotionClipUrl(accent)) {
        void tryPlayVrmaAction(accent, { loop: false });
      } else if (analysis.gesture) {
        bodyMotion.playGesture?.(analysis.gesture);
      }
    }
    if (
      talking &&
      analysis?.talkStyle &&
      analysis.talkStyle !== prevStyle
    ) {
      syncTalkLibraryMotion(true);
    }
    return analysis;
  };

  const mergeExpressionBlendIntoTargets = (blend, opts = {}) => {
    const safe = clampRestFaceBlend(
      adaptBlendForFaceProfile(blend, faceProfile),
      {
        talking: Boolean(opts.talking ?? (talking || eating)),
        hazards: faceHazards,
        caps: faceProfile.caps,
      },
    );
    for (const [key, weight] of Object.entries(safe)) {
      const preset = VRM_BLEND_PRESET_MAP[key];
      if (preset && expr?.getExpression?.(preset)) {
        expressionTarget[preset] = Math.max(
          expressionTarget[preset] ?? 0,
          weight,
        );
      }
    }
  };

  const tickFace = (dt, now, activeMotion) => {
    const nuance =
      bodyMotion.nuance && bodyMotion.nuance !== "none"
        ? bodyMotion.nuance
        : "none";
    const baseBlend = buildVrmExpressionBlend(emotion, nuance);
    const idleFaceEligible =
      !talking &&
      !eating &&
      !bodyMotion.currentAction &&
      !bodyMotion.activeGesture &&
      (!activeMotion || CALM_IDLE_USES_PROCEDURAL_BODY);
    if (idleFaceEligible) {
      const idleEmotion = bodyMotion.thinking ? "neutral" : emotion;
      setExpressionTargetFromBlend(
        blendIdleExpressionLayer(
          baseBlend,
          sampleIdleExpressionBlend((now - t0) * 0.001, idleEmotion),
          idleEmotion,
        ),
      );
    } else {
      mergeExpressionBlendIntoTargets(baseBlend, {
        talking: talking || eating,
      });
    }

    mouthOpen += (mouthTarget - mouthOpen) * Math.min(1, dt * (talking || eating ? 52 : 22));
    if (!talking && !eating && mouthOpen < 0.04) mouthOpen = 0;
    if (talking && mouthOpen < 0.12) {
      const pulseScale = faceProfile.talkPulseScale ?? 1;
      mouthOpen = Math.max(
        mouthOpen,
        sampleTalkMouthPulse(now, true) * 0.26 * pulseScale,
      );
    }
    if (eating && !talking) {
      mouthOpen = Math.max(mouthOpen, sampleEatMouthPulse(now, true) * 0.86);
    }

    zeroAllExpressions(expr);
    tickExpressionBlend(dt);
    applyMouth(talkingMouthOpen(talking, mouthOpen, now, eating), now);

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
  let wasLibraryMotion = false;

  const ensureProceduralBodyOnly = () => {
    if (!CALM_IDLE_USES_PROCEDURAL_BODY) return;
    if (
      vrmaAction ||
      vrmaPending ||
      motionPlayer.isPlaying?.() ||
      motionPlayer.isCrossfading?.()
    ) {
      clearHostedBodyMotion();
    } else {
      motionPlayer.forceStop?.(false);
    }
    if (motionTransitionState) motionTransitionState = null;
  };

  const frame = () => {
    const dt = clock.getDelta();
    const now = performance.now();
    ensureProceduralBodyOnly();
    const vrmaPlaying = Boolean(motionPlayer.isPlaying?.());
    if (vrmaAction && !vrmaPlaying && !vrmaPending) {
      restoreAfterVrma();
    }
    const libraryMotion = CALM_IDLE_USES_PROCEDURAL_BODY
      ? false
      : libraryOwnsVrmBody(vrmaAction, motionPlayer, vrmaPending);
    if (libraryMotion && !wasLibraryMotion) {
      bodyMotion.holdForLibraryMotion?.(now);
    }
    wasLibraryMotion = libraryMotion;
    const activeMotion = vrmaPlaying
      ? vrmaAction
      : bodyMotion.currentAction;
    try {
      if (!libraryMotion) {
        bodyMotion.update(dt, { talking, now });
      }
      if (!CALM_IDLE_USES_PROCEDURAL_BODY) {
        motionPlayer.update(dt);
        if (motionTransitionState) {
          const tick = tickVrmMotionTransition(vrm, motionTransitionState, dt, {
            onSynced: syncHumanoidPose,
          });
          motionTransitionState = tick.state;
        }
      }
      if (!libraryMotion) {
        const root = bodyMotion.getRootMotion?.() || { y: 0, rotY: 0 };
        model.position.y = baseModelY + (root.y || 0);
        model.rotation.y = baseModelRotY + (root.rotY || 0);
      } else {
        model.position.y = baseModelY;
        model.rotation.y = baseModelRotY;
      }
      if (vrm.lookAt) {
        vrm.lookAt.autoUpdate = resolveVrmLookAtAutoUpdate({
          talking,
          listening: bodyMotion.listening,
          thinking: bodyMotion.thinking,
          activeMotion,
          currentAction: bodyMotion.currentAction,
        });
      }
      syncLookTarget();
      syncHumanoidPose();
      tickFace(dt, now, activeMotion);
      tickOutdoorSceneWind(vrm, clock.getElapsedTime());
      const springEligible = !libraryMotion && !activeMotion;
      if (springEligible && talking) {
        tickIdleSpringRecenter(
          vrm,
          springTalkState,
          dt,
          true,
          TALK_SPRING_RECENTER_SEC,
        );
      } else if (springEligible && bodyMotion.thinking) {
        tickIdleSpringRecenter(
          vrm,
          springTalkState,
          dt,
          true,
          THINK_SPRING_RECENTER_SEC,
        );
      } else if (springEligible) {
        tickIdleSpringRecenter(vrm, springIdleState, dt, true);
      } else {
        springIdleState.calmSec = 0;
        springTalkState.calmSec = 0;
      }
      const plantedIdleFrame =
        !libraryMotion &&
        !bodyMotion.currentAction &&
        bodyMotion.activeGesture !== "point" &&
        !talking &&
        !eating;
      const pokeWhileSpeaking =
        bodyMotion.pokeShakeActive && (talking || bodyMotion.thinking);
      if (!libraryMotion && !bodyMotion.currentAction) {
        bodyMotion.enforcePlantedLimbs?.({
          lockUpperArms: true,
          lockForearms: !bodyMotion.idleBeatArmsActive,
          hands: !talking && !eating && !bodyMotion.idleBeatArmsActive,
        });
      }
      if (plantedIdleFrame || pokeWhileSpeaking) {
        bodyMotion.reapplyPlantedLimbs?.({
          now,
          force: plantedIdleFrame,
        });
      }
      syncHumanoidPose();
      if (!libraryMotion) {
        syncHumanoidSkinnedRawFromNormalized(vrm?.humanoid);
      }
      stabilizeVrmSpringBones(vrm);
      vrm.update(dt);
      if (!libraryMotion && !bodyMotion.currentAction) {
        bodyMotion.finishPlantedLimbLockPostUpdate?.({
          hands:
            !talking &&
            !eating &&
            !bodyMotion.idleBeatArmsActive,
        });
        syncHumanoidSkinnedRawFromNormalized(vrm?.humanoid);
      }
      const crossfading =
        !CALM_IDLE_USES_PROCEDURAL_BODY &&
        Boolean(motionPlayer.isCrossfading?.());
      if (talking || eating || crossfading) {
        bodyMotion.applyHandRestOnly?.({
          talkBlend: crossfading ? 0.12 : talking ? 0.35 : eating ? 0.1 : 0,
          blendWeight: CALM_IDLE_USES_PROCEDURAL_BODY
            ? 1
            : crossfading
              ? 0.35
              : talking
                ? 0.42
                : 0.18,
          now,
        });
        syncHumanoidPose();
      }
      if (eating && treatProp.active) {
        treatProp.update(bodyMotion.getEatChewSample?.());
      }
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
      const userOwnsCamera =
        Boolean(avatarPointer?.isPointerActive?.()) ||
        camState.userOrbiting ||
        camState.userFramingHeld;
      const vrmaOwnsBody = Boolean(vrmaAction || vrmaPending);
      if (cameraResetAnim) {
        if (userOwnsCamera) {
          cameraResetAnim = null;
        } else {
          const finished = lerpCameraTowardShot(
            controls,
            camera,
            cameraResetAnim,
            dt,
            CAMERA_RESET_LERP_RATE,
          );
          syncLookTarget();
          if (finished) {
            defaultPortrait.position.copy(camera.position);
            defaultPortrait.target.copy(controls.target);
            defaultPortrait.fov = camera.fov;
            defaultPortrait.distance = camera.position.distanceTo(controls.target);
            portraitCamera.position.copy(camera.position);
            portraitCamera.target.copy(controls.target);
            portraitCamera.fov = camera.fov;
            portraitCamera.distance = defaultPortrait.distance;
            cameraResetAnim = null;
          }
        }
      } else if (!userOwnsCamera && camState.autoActive) {
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
        if (!userOwnsCamera && !vrmaOwnsBody) {
          applyOrbitFollowAnchor(controls, camera, smoothedFrameAnchor);
        }
        controls.update();
      }

      portraitFacingBootFrames += 1;
      const portraitFacingBootOnly = portraitFacingBootFrames < 90;
      const portraitFacingCooldownMs = portraitFacingBootOnly ? 0 : 900;
      if (
        headBone &&
        portraitFacingBootOnly &&
        !userOwnsCamera &&
        !camState.userFramingHeld &&
        !libraryMotion &&
        !vrmaOwnsBody &&
        now - lastPortraitFacingFixMs >= portraitFacingCooldownMs
      ) {
        if (
          !isHeadFacingCamera(headBone, camera, vrm.humanoid, model) &&
          correctPortraitModelYaw(model, headBone, camera, vrm.humanoid)
        ) {
          baseModelRotY = normalizeModelYaw(model);
          lastPortraitFacingFixMs = now;
          syncLookTarget();
          applyDefaultPortraitFrame?.();
        }
      }
    } catch (err) {
      console.warn("[vrm] frame update failed", err);
    }

    // Keep model scale fixed — uniform scale breathing disturbs spring-bone hair/skirt.
    model.scale.setScalar(scale);

    syncCameraRelativeStageLights({
      camera,
      anchor: smoothedFrameAnchor,
      key,
      fill,
      rim,
      faceLight,
      portraitCameraZSign,
    });
    faceLight.intensity = 0.55 + (talking ? 0.2 : 0) + Math.sin((now - t0) * 0.002) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  clearExpressionTargets();
  setEmotion("happy");
  zeroAllExpressions(expr);
  applyBlinkWeight(expr, 0);
  applyMouth(0);
  bodyMotion.update(1 / 60);
  syncLookTarget();
  syncHumanoidPose();
  stabilizeVrmSpringBones(vrm);
  vrm.update(1 / 60);
  bodyMotion.applyHandRestOnly?.({ talkBlend: 0, now: performance.now() });
  applyTalkMouthNow(performance.now());
  renderer.render(scene, camera);
  if (!CALM_IDLE_USES_PROCEDURAL_BODY) {
    for (const id of BOOT_FULL_LIBRARY_WARM_CLIP_IDS) {
      void motionPlayer.warmClip(id);
    }
  }
  restoreProceduralCalmStand();
  applyDefaultPortraitFrame?.();
  syncLookTarget();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  const reactToTap = (tap = {}) => {
    const speaking = Boolean(opts.isAssistantSpeaking?.());
    const anchorX = faceAnchor?.x ?? model.position.x;
    bodyMotion.reactToPoke?.({
      point: tap.point,
      multiClick: tap.multiClick,
      anchorX,
    });
    if (speaking) return emotion;
    setEmotion("happy");
    setTalkStyle("celebrate");
    clearHostedBodyMotion();
    return emotion;
  };

  const resetCameraView = () => {
    bodyMotion.cancelPokeShake?.();
    bodyMotion.resetSmoothedRoot?.();
    applyIdlePresentation(vrm, bodyMotion, {
      resetIdleLife: false,
      fullReset: false,
      warmFrames: 16,
      characterId: loadedCharacterId,
    });
    applyDefaultPortraitFrame?.();
    if (
      !isHeadFacingCamera(headBone, camera, vrm.humanoid, model) &&
      correctPortraitModelYaw(model, headBone, camera, vrm.humanoid, 0.08)
    ) {
      baseModelRotY = normalizeModelYaw(model);
      applyDefaultPortraitFrame?.();
    }
  };

  canvas.style.touchAction = "none";
  const orbitSurface = orbitElement || canvas;
  orbitSurface.style.touchAction = "none";
  orbitSurface.style.userSelect = "none";
  orbitSurface.style.webkitUserSelect = "none";
  orbitSurface.style.cursor = "grab";
  const unbindOrbitGuard = bindOrbitTouchGuard(orbitSurface);
  const unbindOrbitWheel = bindOrbitWheelZoom(orbitSurface, controls);
  const unbindOrbitSession = bindOrbitControlSession(
    controls,
    () => {
      cameraDirector.setUserOrbiting(true);
    },
    () => {
      cameraDirector.holdUserFraming(true);
    },
  );
  avatarPointer = bindCompanionAvatarPointer({
    surface: orbitSurface,
    rectElement: canvas,
    camera,
    controls,
    getPokeMeshes: () => {
      if (!pokeMeshes.length) pokeMeshes = refreshPokeMeshes();
      return pokeMeshes.length ? pokeMeshes : refreshPokeMeshes();
    },
    getPokeWaistY: () => computePokeWaistYFromObject(model),
    getScreenBand: () => {
      const r = canvas.getBoundingClientRect();
      return computeAvatarScreenBand(model, camera, r);
    },
    onPoke: ({ point, multiClick }) => {
      reactToTap({ point, multiClick: Boolean(multiClick) });
      opts.onCharacterTap?.({ point, multiClick: Boolean(multiClick) });
    },
  });

  const setOutfitPreset = (outfitId) => {
    applyVrmOutfitTint(model, outfitId);
  };

  return {
    schema: VRM_AVATAR_SCHEMA,
    kind: "vrm",
    vrm,
    getLoadedModelUrl: () => loadedModelUrl,
    getLoadedCharacterId: () => loadedCharacterId,
    setOutfitPreset,
    setEmotion,
    applyExpressionProfile,
    warmExpressionPresets,
    setListening,
    setMouthOpen,
    setMouthShape,
    setTalking,
    setEating,
    attachTreatProp,
    detachTreatProp,
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
    playCalmIdle() {
      return playCalmLibraryIdle();
    },
    setSceneEnvironment(mode, backgroundId = null) {
      sceneEnvironment = mode === "outdoor" ? "outdoor" : "indoor";
      if (backgroundId != null) {
        sceneBackgroundId = String(backgroundId || "").toLowerCase() || null;
      }
      setVrmSceneWindMode(sceneEnvironment);
      configureVrmSpringStability(vrm, sceneEnvironment);
      recenterVrmSpringBones(vrm, { retune: true, captureInit: false });
      if ("toneMappingExposure" in renderer) {
        renderer.toneMappingExposure = rendererExposureForScene(
          sceneEnvironment,
          sceneBackgroundId,
        );
      }
      hemi.intensity = hemisphereIntensityForScene(sceneEnvironment, sceneBackgroundId);
      return sceneEnvironment;
    },
    getSceneEnvironment() {
      return sceneEnvironment;
    },
    resetIdleLife(now) {
      clearHostedBodyMotion();
      return bodyMotion.resetIdleLife?.(now);
    },
    setIdleGender(gender) {
      bodyMotion.setIdleGender?.(gender);
      bodyMotion.resetIdleLife?.();
      return bodyMotion.idleGender;
    },
    getIdleGender() {
      return bodyMotion.idleGender;
    },
    pulseIdleBeat(beat, now = performance.now()) {
      const key = String(beat || "look");
      const calmIdleOnly =
        String(vrmaAction || "").toLowerCase() === ONLINE_CALM_IDLE_ACTION &&
        !vrmaPending;
      if (motionPlayer.isPlaying?.() && !calmIdleOnly) return null;
      if (calmIdleOnly && !CALM_IDLE_USES_PROCEDURAL_BODY) {
        motionTransitionState =
          planMotionTransition(vrm, motionPlayer, {
            durationSec: 0.28,
            forceCapture: true,
            label: `idle-beat-${key}`,
          }) ?? null;
        motionPlayer.releasePose?.(0.22);
        vrmaAction = null;
        vrmaPending = false;
      }
      const state = bodyMotion.pulseIdleBeat?.(key, now);
      scheduleCalmIdleAfterBeat(key, now);
      return state;
    },
    resetMotionClock(now) {
      clearHostedBodyMotion();
      return bodyMotion.resetMotionClock?.(now);
    },
    reapplyPlantedLimbs(opts) {
      return bodyMotion.reapplyPlantedLimbs?.(opts);
    },
    enforcePlantedLimbs(opts) {
      return bodyMotion.enforcePlantedLimbs?.(opts);
    },
    getMotionTransitionProgress() {
      if (!motionTransitionState) return 1;
      return Math.min(
        1,
        motionTransitionState.elapsedSec / motionTransitionState.durationSec,
      );
    },
    getSkeletonAudit() {
      return auditVrmSkeletonDegrees(vrm);
    },
    getMotionPlayerStatus() {
      const base = motionPlayer.getTransitionStatus?.() || {
        activeActionId: motionPlayer.activeActionId,
        crossfading: false,
        retiringActions: 0,
      };
      return {
        ...base,
        vrmaAction,
        vrmaPending,
        libraryOwnsBody: libraryOwnsVrmBody(vrmaAction, motionPlayer, vrmaPending),
        animating: motionPlayer.isAnimating?.() ?? false,
        holdingLastFrame: motionPlayer.isHoldingLastFrame?.() ?? false,
      };
    },
    get mouthOpen() {
      return mouthOpen;
    },
    getFaceProfile() {
      return { ...faceProfile };
    },
    getFaceReport() {
      return { ...faceReport };
    },
    getFaceDebug() {
      const now = performance.now();
      const activeViseme = talkingVisemeShape(
        now,
        talking || eating,
        mouthShape,
      );
      const activeVisemePreset = shapeToVisemePreset(activeViseme, mouthPresets);
      return {
        ...faceReport,
        talking,
        eating,
        emotion,
        nuance:
          bodyMotion.nuance && bodyMotion.nuance !== "none"
            ? bodyMotion.nuance
            : "none",
        faceProfile: {
          rigType: faceProfile.rigType,
          presetScale: { ...faceProfile.presetScale },
          morphScale: faceProfile.morphScale,
        },
        mouthOpen,
        mouthTarget,
        mouthShape,
        activeViseme,
        activeVisemePreset,
        expressionCurrent: { ...expressionCurrent },
        expressionTarget: { ...expressionTarget },
      };
    },
    auditSpringGravity(opts) {
      return auditVrmSpringGravity(vrm, opts);
    },
    auditPlantedLimbs(opts = {}) {
      return auditPlantedLimbDualWrite(
        vrm?.humanoid,
        Number(opts.maxDeltaRad) || 0.0025,
      );
    },
    resize,
    resetCameraView,
    warmPresentFrame() {
      try {
        syncLookTarget();
        syncHumanoidPose();
        stabilizeVrmSpringBones(vrm);
        applyIdlePresentation(vrm, bodyMotion, {
          resetIdleLife: false,
          fullReset: true,
          warmFrames: 24,
          characterId: loadedCharacterId,
        });
        applyDefaultPortraitFrame?.();
        syncLookTarget();
        renderer.render(scene, camera);
        renderer.render(scene, camera);
      } catch {
        /* ignore warm-up errors */
      }
    },
    applyIdlePresentation(opts = {}) {
      return applyIdlePresentation(vrm, bodyMotion, {
        characterId: loadedCharacterId,
        ...opts,
      });
    },
    getPortraitFacing() {
      const headScore = headBone
        ? facingAlignmentScore(headBone, camera.position, vrm.humanoid)
        : 0;
      const visibleScore = portraitVisibleFacingScore(
        headBone,
        camera.position,
        vrm.humanoid,
        model,
      );
      const frameScore = portraitFrameResolveScore(
        headBone,
        camera.position,
        vrm.humanoid,
        model,
      );
      return {
        bodyScore: modelBodyFacingScore(model, camera.position),
        headScore,
        facingCamera: isHeadFacingCamera(headBone, camera, vrm.humanoid, model),
        visibleScore,
        frameScore,
        modelRotY: model.rotation.y,
        cameraZSign: portraitCameraZSign,
      };
    },
    hitTest(clientX, clientY) {
      return Boolean(avatarPointer?.hitTest?.(clientX, clientY));
    },
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener?.("resize", resize);
      avatarPointer?.destroy?.();
      avatarPointer = null;
      unbindOrbitGuard();
      unbindOrbitWheel();
      unbindOrbitSession();
      controls.dispose();
      vrm.dispose?.();
      renderer.dispose();
    },
  };
}
