/**
 * VRM anime companion avatar — MToon shading, expressions, spring bones,
 * Unreal-style OrbitControls. Default model: companion-girl.vrm (VRM 1.0 sample).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";
import { createCompanionBodyMotion } from "./companionBodyMotion.js";
import { sampleIdleExpressionBlend } from "./companionIdleMotion.js";

export const VRM_AVATAR_SCHEMA = "amoji.vrmAvatar.v1";

const EMOTION_EXPRESSIONS = {
  neutral: {},
  happy: { [VRMExpressionPresetName.Happy]: 0.85, [VRMExpressionPresetName.Relaxed]: 0.25 },
  thinking: { [VRMExpressionPresetName.Relaxed]: 0.45 },
  sad: { [VRMExpressionPresetName.Sad]: 0.75 },
  surprised: { [VRMExpressionPresetName.Surprised]: 0.9 },
  angry: { [VRMExpressionPresetName.Angry]: 0.8 },
};

const VRM_BLEND_PRESET_MAP = {
  Happy: VRMExpressionPresetName.Happy,
  Relaxed: VRMExpressionPresetName.Relaxed,
  Sad: VRMExpressionPresetName.Sad,
  Surprised: VRMExpressionPresetName.Surprised,
  Angry: VRMExpressionPresetName.Angry,
};

/** Grok Ani–style framing: upper body visible, not extreme face close-up. */
function frameFaceCamera({ vrm, model, camera, controls, fitted }) {
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const head =
    vrm.humanoid?.getNormalizedBoneNode?.("head") ||
    vrm.humanoid?.getNormalizedBoneNode?.("neck");
  const anchor = new THREE.Vector3();
  const upperBodyY = fitted.min.y + fittedSize.y * 0.58;
  if (head) {
    model.updateWorldMatrix(true, true);
    head.getWorldPosition(anchor);
    anchor.y = anchor.y * 0.25 + upperBodyY * 0.75;
  } else {
    anchor.set(0, upperBodyY, 0);
  }

  const portraitDist = Math.max(1.48, fittedSize.y * 1.14);
  controls.target.copy(anchor);
  camera.position.set(anchor.x, anchor.y + 0.04, anchor.z + portraitDist);
  controls.minDistance = portraitDist * 0.72;
  controls.maxDistance = portraitDist * 3.4;
  controls.minPolarAngle = Math.PI * 0.32;
  controls.maxPolarAngle = Math.PI * 0.68;
  controls.update();
  return { face: anchor, portraitDist };
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   modelUrl?: string,
 *   onCharacterTap?: (info: { point: import('three').Vector3 }) => void,
 *   onProgress?: (ratio: number, label?: string) => void,
 * }} opts
 */
export async function createVrmAvatar(opts) {
  const canvas = opts.canvas;
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
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
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

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.1;
  controls.maxDistance = 4.2;
  controls.minPolarAngle = 0.65;
  controls.maxPolarAngle = 1.55;
  controls.target.set(0, 1.15, 0);
  controls.update();
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(modelUrl, (event) => {
    if (event.lengthComputable && event.total > 0) {
      opts.onProgress?.(event.loaded / event.total, "model");
    }
  });
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
  const baseModelRotY = model.rotation.y;
  scene.add(model);
  vrm.humanoid?.resetNormalizedPose?.();
  const bodyMotion = createCompanionBodyMotion(vrm.humanoid);

  const syncHumanoidPose = () => {
    try {
      vrm.humanoid?.update?.();
    } catch (err) {
      console.warn("[vrm] humanoid.update failed", err);
    }
  };

  for (let i = 0; i < 4; i += 1) {
    bodyMotion.update(1 / 60);
    syncHumanoidPose();
    vrm.update(1 / 60);
  }

  const fitted = new THREE.Box3().setFromObject(model);
  const { face: faceAnchor, portraitDist } = frameFaceCamera({
    vrm,
    model,
    camera,
    controls,
    fitted,
  });
  const portraitCamera = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
    distance: portraitDist,
  };
  let actionCamBlend = 0;
  const actionCamDir = new THREE.Vector3();
  const actionCamTarget = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  /** @type {{ x: number, y: number } | null} */
  let pointerDown = null;

  // Subtle look-at toward camera
  if (vrm.lookAt) {
    vrm.lookAt.target = new THREE.Object3D();
    scene.add(vrm.lookAt.target);
    const syncLookTarget = () => {
      vrm.lookAt.target.position.copy(camera.position);
    };
    syncLookTarget();
    controls.addEventListener?.("change", syncLookTarget);
  }

  const expr = vrm.expressionManager;
  const mouthPresets = [
    VRMExpressionPresetName.Aa,
    VRMExpressionPresetName.Ih,
    VRMExpressionPresetName.Ou,
    VRMExpressionPresetName.Ee,
    VRMExpressionPresetName.Oh,
  ].filter((name) => expr?.getExpression?.(name));

  let emotion = "neutral";
  let mouthOpen = 0;
  let mouthTarget = 0;
  /** @type {string | null} */
  let mouthShape = null;
  let talking = false;
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
    for (const [key, weight] of Object.entries(blend || {})) {
      const preset = VRM_BLEND_PRESET_MAP[key];
      if (preset && expr?.getExpression?.(preset)) {
        expressionTarget[preset] = Math.max(0, Math.min(1, Number(weight) || 0));
      }
    }
  };

  const applyEmotionExpressions = (next) => {
    const blend = EMOTION_EXPRESSIONS[next] || EMOTION_EXPRESSIONS.neutral;
    clearExpressionTargets();
    for (const [preset, weight] of Object.entries(blend)) {
      if (expr?.getExpression?.(preset)) {
        expressionTarget[preset] = weight;
      }
    }
  };

  const tickExpressionBlend = (dt) => {
    if (!expr) return;
    const rate = Math.min(1, dt * 9);
    for (const preset of emotionPresetKeys()) {
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
  const playAction = (action, opts = {}) => {
    const ok = bodyMotion.playAction(action, { emotion: opts.emotion || emotion });
    emotion = bodyMotion.emotion;
    applyEmotionExpressions(emotion);
    return ok;
  };
  const stopAction = () => {
    const ok = bodyMotion.stopAction();
    applyEmotionExpressions(emotion);
    return ok;
  };
  const playGestureForText = (text, opts = {}) =>
    bodyMotion.playGestureForText(text, { emotion: opts.emotion || emotion });

  const applyContentFromReply = (text, moodHint = null) => {
    const analysis = bodyMotion.applyContentFromReply(text, moodHint);
    emotion = analysis.emotion;
    applyEmotionExpressions(emotion);
    setExpressionTargetFromBlend(analysis.expressionBlend);
    return analysis;
  };

  const setThinking = (on) => {
    bodyMotion.setThinking(on);
    if (on) {
      emotion = "thinking";
      applyEmotionExpressions("thinking");
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
    } else if (analysis.action) {
      playAction(analysis.action, { emotion: analysis.emotion });
    }
    return analysis;
  };

  const prepareThinkingFromUser = (userText, isEnglish = false) => {
    const analysis = bodyMotion.prepareThinkingFromUser(userText, isEnglish);
    emotion = analysis.emotion;
    setExpressionTargetFromBlend(analysis.expressionBlend);
    return analysis;
  };

  const shapeToPreset = (shape) => {
    const key = String(shape || "aa").toLowerCase();
    const map = {
      aa: VRMExpressionPresetName.Aa,
      ih: VRMExpressionPresetName.Ih,
      ou: VRMExpressionPresetName.Ou,
      ee: VRMExpressionPresetName.Ee,
      oh: VRMExpressionPresetName.Oh,
    };
    const preset = map[key];
    if (preset && expr?.getExpression?.(preset)) return preset;
    return mouthPresets[0] || null;
  };

  const applyMouth = (v) => {
    if (!expr || !mouthPresets.length) return;
    for (const preset of mouthPresets) expr.setValue(preset, 0);
    const preset = mouthShape ? shapeToPreset(mouthShape) : null;
    if (preset) {
      expr.setValue(preset, v);
      return;
    }
    const idx = Math.min(
      mouthPresets.length - 1,
      Math.floor(v * mouthPresets.length),
    );
    expr.setValue(mouthPresets[idx], v);
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
    return talking;
  };

  const setTalkEnergy = (v) => bodyMotion.setTalkEnergy(v);
  const setTalkStyle = (style) => bodyMotion.setTalkStyle(style);
  const reactToSpeechChunk = (chunk, opts) => {
    const analysis = bodyMotion.reactToSpeechChunk(chunk, opts);
    if (analysis?.expressionBlend) {
      emotion = analysis.emotion || emotion;
      setExpressionTargetFromBlend(analysis.expressionBlend);
    }
    return analysis;
  };

  let raf = 0;

  const frame = () => {
    const dt = clock.getDelta();
    const now = performance.now();
    try {
      bodyMotion.update(dt, { talking, now });
      const root = bodyMotion.getRootMotion?.() || { y: 0, rotY: 0 };
      model.position.y = baseModelY + (root.y || 0);
      model.rotation.y = baseModelRotY + (root.rotY || 0);

      const wantsActionCam = Boolean(bodyMotion.currentAction);
      const targetBlend = wantsActionCam ? 1 : 0;
      actionCamBlend += (targetBlend - actionCamBlend) * Math.min(1, dt * 4.5);
      if (actionCamBlend > 0.01) {
        actionCamTarget.copy(portraitCamera.target);
        actionCamTarget.y -= actionCamBlend * 0.34;
        actionCamDir
          .subVectors(portraitCamera.position, portraitCamera.target)
          .normalize();
        const pullDist =
          portraitCamera.distance * (1 + actionCamBlend * 0.62);
        camera.position.copy(actionCamTarget).addScaledVector(actionCamDir, pullDist);
        controls.target.copy(actionCamTarget);
        camera.fov = portraitCamera.fov + actionCamBlend * 14;
        camera.updateProjectionMatrix();
      } else if (actionCamBlend < 0.02 && !wantsActionCam) {
        camera.position.copy(portraitCamera.position);
        controls.target.copy(portraitCamera.target);
        camera.fov = portraitCamera.fov;
        camera.updateProjectionMatrix();
        actionCamBlend = 0;
      }

      if (vrm.lookAt) {
        vrm.lookAt.autoUpdate = !bodyMotion.currentAction;
      }
      vrm.update(dt);
      syncHumanoidPose();
      controls.update();
    } catch (err) {
      console.warn("[vrm] frame update failed", err);
    }

    if (!talking && !bodyMotion.currentAction && !bodyMotion.thinking) {
      const idleBlend = sampleIdleExpressionBlend(
        (now - t0) * 0.001,
        emotion,
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

    mouthOpen += (mouthTarget - mouthOpen) * Math.min(1, dt * 14);
    tickExpressionBlend(dt);
    applyMouth(mouthOpen);

    // Auto blink
    if (expr?.getExpression?.(VRMExpressionPresetName.Blink)) {
      blinkTimer += dt;
      if (blinkTimer >= nextBlink) {
        const phase = blinkTimer - nextBlink;
        if (phase < 0.08) {
          expr.setValue(VRMExpressionPresetName.Blink, 1);
        } else if (phase < 0.16) {
          expr.setValue(VRMExpressionPresetName.Blink, 0);
          blinkTimer = 0;
          nextBlink = 2.4 + Math.random() * 2.8;
        }
      }
    }

    const idleLife = !talking && !bodyMotion.currentAction;
    const breathAmp = idleLife ? 0.007 : 0.004;
    const breath = Math.sin((now - t0) * 0.0018) * breathAmp;
    const s = scale * (1 + breath);
    model.scale.set(s, s, s);

    faceLight.intensity = 0.55 + (talking ? 0.2 : 0) + Math.sin((now - t0) * 0.002) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  clearExpressionTargets();
  setEmotion("neutral");
  bodyMotion.update(1 / 60);
  vrm.humanoid?.update?.(0);
  vrm.update(1 / 60);
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  const reactToTap = () => {
    setEmotion("happy");
    playGesture("nod");
    return emotion;
  };

  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (e) => {
    pointerDown = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", (e) => {
    canvas.style.cursor = "grab";
    if (!pointerDown) return;
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    pointerDown = null;
    if (dx * dx + dy * dy > 144) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(model, true);
    if (!hits.length) return;

    canvas.style.cursor = "pointer";
    reactToTap();
    opts.onCharacterTap?.({ point: hits[0].point });
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointerDown) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(model, true);
    canvas.style.cursor = hits.length ? "pointer" : "grab";
  });

  return {
    schema: VRM_AVATAR_SCHEMA,
    kind: "vrm",
    vrm,
    setEmotion,
    setListening,
    setMouthOpen,
    setMouthShape,
    setTalking,
    setTalkEnergy,
    setTalkStyle,
    reactToSpeechChunk,
    playGesture,
    playAction,
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
    get currentAction() {
      return bodyMotion.currentAction;
    },
    get mouthOpen() {
      return mouthOpen;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener?.("resize", resize);
      controls.dispose();
      vrm.dispose?.();
      renderer.dispose();
    },
  };
}
