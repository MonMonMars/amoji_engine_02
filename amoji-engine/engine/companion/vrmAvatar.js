/**
 * VRM anime companion avatar — MToon shading, expressions, spring bones,
 * Unreal-style OrbitControls. Default model: companion-girl.vrm (VRM 1.0 sample).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMExpressionPresetName } from "@pixiv/three-vrm";

export const VRM_AVATAR_SCHEMA = "amoji.vrmAvatar.v1";

const EMOTION_EXPRESSIONS = {
  neutral: {},
  happy: { [VRMExpressionPresetName.Happy]: 0.85, [VRMExpressionPresetName.Relaxed]: 0.25 },
  thinking: { [VRMExpressionPresetName.Relaxed]: 0.45 },
  sad: { [VRMExpressionPresetName.Sad]: 0.75 },
  surprised: { [VRMExpressionPresetName.Surprised]: 0.9 },
  angry: { [VRMExpressionPresetName.Angry]: 0.8 },
};

/** Lower T-pose arms into a relaxed standing pose. */
function applyStandingPose(vrm) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return;
  humanoid.resetNormalizedPose?.();

  const pose = [
    ["leftUpperArm", { z: 1.35, x: 0.08 }],
    ["rightUpperArm", { z: -1.35, x: 0.08 }],
    ["leftLowerArm", { z: 0.12 }],
    ["rightLowerArm", { z: -0.12 }],
    ["leftHand", { x: 0.05 }],
    ["rightHand", { x: 0.05 }],
    ["spine", { x: 0.02 }],
    ["chest", { x: -0.02 }],
  ];

  for (const [bone, rot] of pose) {
    const node = humanoid.getNormalizedBoneNode?.(bone);
    if (!node) continue;
    if (rot.x) node.rotation.x += rot.x;
    if (rot.y) node.rotation.y += rot.y;
    if (rot.z) node.rotation.z += rot.z;
  }
}

/** Frame camera on the head — face centered, portrait distance. */
function frameFaceCamera({ vrm, model, camera, controls, fitted }) {
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const head =
    vrm.humanoid?.getNormalizedBoneNode?.("head") ||
    vrm.humanoid?.getNormalizedBoneNode?.("neck");
  const face = new THREE.Vector3();
  if (head) {
    model.updateWorldMatrix(true, true);
    head.getWorldPosition(face);
  } else {
    face.set(0, fitted.min.y + fittedSize.y * 0.88, 0);
  }

  const portraitDist = Math.max(0.42, fittedSize.y * 0.34);
  controls.target.copy(face);
  camera.position.set(face.x, face.y + 0.02, face.z + portraitDist);
  controls.minDistance = portraitDist * 0.72;
  controls.maxDistance = portraitDist * 2.8;
  controls.minPolarAngle = Math.PI * 0.44;
  controls.maxPolarAngle = Math.PI * 0.56;
  controls.update();
  return face;
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   modelUrl?: string,
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
      powerPreference: "high-performance",
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
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
  camera.position.set(0, 1.35, 2.35);

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
  const gltf = await loader.loadAsync(modelUrl);
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
  const scale = 1.55 / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.z = -center.z * scale;
  model.position.y = -box.min.y * scale;
  scene.add(model);
  applyStandingPose(vrm);

  const fitted = new THREE.Box3().setFromObject(model);
  const faceAnchor = frameFaceCamera({ vrm, model, camera, controls, fitted });

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

  const clearExpressions = () => {
    if (!expr) return;
    for (const preset of Object.values(VRMExpressionPresetName)) {
      if (expr.getExpression?.(preset)) expr.setValue(preset, 0);
    }
  };

  const applyEmotionExpressions = (next) => {
    if (!expr) return;
    clearExpressions();
    const blend = EMOTION_EXPRESSIONS[next] || EMOTION_EXPRESSIONS.neutral;
    for (const [preset, weight] of Object.entries(blend)) {
      if (expr.getExpression?.(preset)) expr.setValue(preset, weight);
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
    emotion = String(next || "neutral").toLowerCase();
    applyEmotionExpressions(emotion);
    // Subtle body pose via humanoid if available
    const head = vrm.humanoid?.getNormalizedBoneNode?.("head");
    if (head) {
      head.rotation.z =
        emotion === "thinking" ? -0.06 : emotion === "sad" ? 0.04 : 0;
      head.rotation.x =
        emotion === "surprised" ? -0.05 : emotion === "sad" ? 0.05 : 0;
    }
    return emotion;
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
    return talking;
  };

  let raf = 0;
  const frame = () => {
    const dt = clock.getDelta();
    const now = performance.now();
    vrm.update(dt);
    controls.update();

    mouthOpen += (mouthTarget - mouthOpen) * Math.min(1, dt * 14);
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

    // Standing breath — subtle scale when not driven by clips
    const breath = Math.sin((now - t0) * 0.0018) * 0.004;
    const s = scale * (1 + breath);
    model.scale.set(s, s, s);

    if (!talking) {
      model.rotation.y = Math.sin((now - t0) * 0.00035) * 0.02;
    }

    faceLight.intensity = 0.55 + (talking ? 0.2 : 0) + Math.sin((now - t0) * 0.002) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  setEmotion("neutral");
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", () => {
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", () => {
    canvas.style.cursor = "grab";
  });

  return {
    schema: VRM_AVATAR_SCHEMA,
    kind: "vrm",
    vrm,
    setEmotion,
    setMouthOpen,
    setMouthShape,
    setTalking,
    get emotion() {
      return emotion;
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
