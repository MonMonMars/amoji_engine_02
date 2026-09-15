/**
 * High-detail GLTF female companion + Unreal-style OrbitControls.
 * Model: three.js Michelle.glb (higher-poly skinned character).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { inferTalkGestureFromText } from "../face/talkGestures.js";
import {
  actionDurationSec,
  actionLoops,
  sampleActionRootMotion,
} from "./companionActionMotion.js";
import { sampleIdleBodyMotion } from "./companionIdleMotion.js";

export const GLTF_AVATAR_SCHEMA = "amoji.gltfAvatar.v1";

const EMOTION_TINT = {
  neutral: { color: 0xffffff, intensity: 0 },
  happy: { color: 0xffc6d9, intensity: 0.22 },
  thinking: { color: 0xb8d4ff, intensity: 0.12 },
  sad: { color: 0x8aa0c8, intensity: 0.18 },
  surprised: { color: 0xffe0a8, intensity: 0.2 },
  angry: { color: 0xff8a8a, intensity: 0.25 },
};

const EMOTION_BODY = {
  neutral: { leanX: 0, leanZ: 0, leanY: 0, bounce: 0 },
  happy: { leanX: -0.02, leanZ: 0.03, leanY: 0.04, bounce: 0.012 },
  thinking: { leanX: 0.05, leanZ: -0.04, leanY: -0.02, bounce: 0.004 },
  sad: { leanX: 0.06, leanZ: 0.04, leanY: 0.02, bounce: 0.002 },
  surprised: { leanX: -0.05, leanZ: 0, leanY: -0.05, bounce: 0.015 },
  angry: { leanX: 0.03, leanZ: -0.03, leanY: 0.01, bounce: 0.008 },
};

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   modelUrl?: string,
 *   onProgress?: (ratio: number, label?: string) => void,
 * }} opts
 */
export async function createGltfAvatar(opts) {
  const canvas = opts.canvas;
  const modelUrl = opts.modelUrl || "/prototypes/assets/companion-girl.glb";

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
    renderer.toneMappingExposure = 1.15;
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
  // Unreal-like: left drag orbit, wheel zoom
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY,
  };
  controls.enableRotate = true;
  controls.enableZoom = true;

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl, (event) => {
    if (event.lengthComputable && event.total > 0) {
      opts.onProgress?.(event.loaded / event.total, "model");
    }
  });
  opts.onProgress?.(1, "model");
  const model = gltf.scene;
  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          m.envMapIntensity = 0.9;
          m.needsUpdate = true;
        }
      }
    }
  });

  // Fit model to frame — Grok-like upper body / portrait framing
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 1.55 / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.x = -center.x * scale;
  model.position.z = -center.z * scale;
  model.position.y = -box.min.y * scale;
  const baseModelY = model.position.y;
  const baseModelRotY = model.rotation.y;
  scene.add(model);

  const fitted = new THREE.Box3().setFromObject(model);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  /** @type {THREE.Object3D | null} */
  let headBone = null;
  model.traverse((obj) => {
    if (headBone) return;
    if (/head|face|neck/i.test(obj.name) && obj.isBone) headBone = obj;
  });
  const face = new THREE.Vector3();
  if (headBone) {
    model.updateWorldMatrix(true, true);
    headBone.getWorldPosition(face);
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

  /** @type {THREE.AnimationMixer | null} */
  let mixer = null;
  /** @type {THREE.AnimationAction | null} */
  let idleAction = null;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(model);
    // Prefer idle / breath / standing clip names
    const clips = gltf.animations;
    const idleClip =
      clips.find((c) => /idle|stand|breath|wait|neutral/i.test(c.name)) ||
      clips[0];
    idleAction = mixer.clipAction(idleClip);
    idleAction.play();
    idleAction.setEffectiveWeight(1);
  }

  // Morph targets for mouth if present
  /** @type {THREE.Mesh[]} */
  const morphMeshes = [];
  model.traverse((obj) => {
    if (obj.isMesh && obj.morphTargetDictionary && obj.morphTargetInfluences) {
      morphMeshes.push(obj);
    }
  });

  const findMorphIndex = (nameRe) => {
    for (const mesh of morphMeshes) {
      for (const [name, idx] of Object.entries(mesh.morphTargetDictionary)) {
        if (nameRe.test(name)) return { mesh, idx };
      }
    }
    return null;
  };
  const mouthMorph =
    findMorphIndex(/mouth|jaw|viseme|aa|open/i) || null;

  let emotion = "neutral";
  let mouthOpen = 0;
  let talking = false;
  let talkEnergy = 0;
  /** @type {string | null} */
  let activeGesture = null;
  /** @type {string | null} */
  let activeAction = null;
  let actionElapsed = 0;
  let gesturePhase = 0;
  let t0 = performance.now();
  const clock = new THREE.Clock();
  const blushMats = [];
  model.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) {
      if (m.color && /skin|face|body|head/i.test(`${obj.name} ${m.name}`)) {
        blushMats.push(m);
      }
    }
  });
  if (!blushMats.length) {
    model.traverse((obj) => {
      if (obj.isMesh && obj.material?.color) blushMats.push(obj.material);
    });
  }

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };

  const setEmotion = (next) => {
    emotion = String(next || "neutral").toLowerCase();
    const tint = EMOTION_TINT[emotion] || EMOTION_TINT.neutral;
    for (const m of blushMats) {
      if (!m.userData.baseColor) {
        m.userData.baseColor = m.color.clone();
      }
      m.color.copy(m.userData.baseColor).lerp(new THREE.Color(tint.color), tint.intensity);
      if ("emissive" in m) {
        m.emissive.setHex(tint.color);
        m.emissiveIntensity = tint.intensity * 0.35;
      }
    }
    return emotion;
  };

  const playGesture = (style) => {
    activeGesture = String(style || "").toLowerCase();
    gesturePhase = 0;
    return Boolean(activeGesture);
  };

  const playGestureForText = (text) => {
    const style = inferTalkGestureFromText(text, { emotion });
    return playGesture(style);
  };

  const stopAction = () => {
    activeAction = null;
    actionElapsed = 0;
    model.position.y = baseModelY;
    model.rotation.y = baseModelRotY;
    return true;
  };

  const playAction = (action, opts = {}) => {
    const key = String(action || "").toLowerCase();
    if (!key || key === "none" || key === "stop") {
      stopAction();
      return false;
    }
    activeAction = key;
    actionElapsed = 0;
    if (opts.emotion) setEmotion(opts.emotion);
    else if (
      key === "kungfu" ||
      key === "jump" ||
      key === "laugh" ||
      key === "dance" ||
      key === "celebrate" ||
      key === "cheer"
    ) {
      setEmotion("happy");
    } else if (key === "cry" || key === "facepalm") {
      setEmotion("sad");
    } else if (key === "angry" || key === "punch" || key === "kick") {
      setEmotion("angry");
    }
    if (key === "wave" || key === "point") playGesture("wave");
    else if (
      key === "kungfu" ||
      key === "celebrate" ||
      key === "jump" ||
      key === "dance" ||
      key === "cheer" ||
      key === "run"
    ) {
      playGesture("celebrate");
    } else if (key === "laugh" || key === "clap") playGesture("emphasize");
    else if (key === "nod" || key === "thinking") playGesture("nod");
    return true;
  };

  const setMouthOpen = (v) => {
    mouthOpen = Math.max(0, Math.min(1, Number(v) || 0));
    if (mouthMorph) {
      mouthMorph.mesh.morphTargetInfluences[mouthMorph.idx] = mouthOpen;
    } else {
      // Soft jaw approximation via head bone / root nod
      model.rotation.x = (emotion === "sad" ? 0.04 : 0) + mouthOpen * 0.03;
    }
    return mouthOpen;
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    if (!talking) talkEnergy = 0;
    if (idleAction) {
      idleAction.setEffectiveTimeScale(talking ? 1.15 : 0.85);
    }
    return talking;
  };

  const setTalkEnergy = (v) => {
    talkEnergy = Math.max(0, Math.min(1, Number(v) || 0));
    return talkEnergy;
  };

  let raf = 0;
  const frame = () => {
    const dt = clock.getDelta();
    const now = performance.now();
    mixer?.update(dt);
    controls.update();

    const body = EMOTION_BODY[emotion] || EMOTION_BODY.neutral;
    let leanX = body.leanX;
    let leanZ = body.leanZ;
    let leanY = body.leanY;

    let actionRotY = 0;
    if (activeAction) {
      actionElapsed += dt;
      const duration = actionDurationSec(activeAction);
      const phase = (actionElapsed % duration) / duration;
      const root = sampleActionRootMotion(activeAction, phase, actionElapsed);
      model.position.y = baseModelY + (root.y || 0) * 2.2;
      actionRotY = (root.rotY || 0) * 2.2;
      if (!actionLoops(activeAction) && actionElapsed >= duration) {
        stopAction();
        actionRotY = 0;
      }
    } else {
      model.position.y = baseModelY;
    }

    if (gesturePhase < 1 && activeGesture) {
      gesturePhase += dt * 0.85;
      const p = gesturePhase;
      const wave = Math.sin(p * Math.PI * 3) * (1 - p);
      switch (activeGesture) {
        case "celebrate":
        case "emphasize":
          leanY -= wave * 0.06;
          leanZ += wave * 0.08;
          break;
        case "wave":
          leanZ += wave * 0.1;
          leanY += wave * 0.04;
          break;
        case "thinking":
          leanX += Math.min(1, p * 2) * 0.06;
          leanZ -= Math.min(1, p * 2) * 0.08;
          break;
        case "shrug":
          leanZ += Math.sin(p * Math.PI) * 0.05;
          break;
        case "point":
        case "question":
          leanZ -= Math.sin(p * Math.PI) * 0.06;
          break;
        default:
          leanY += Math.sin(p * Math.PI * 2) * 0.03;
          break;
      }
      if (gesturePhase >= 1) activeGesture = null;
    }

    const energy = talking ? Math.max(0.25, talkEnergy) : 0;
    const elapsed = (now - t0) * 0.001;
    let sway = talking
      ? Math.sin((now - t0) * 0.005) * 0.015 * energy
      : 0;
    if (!talking && !activeAction) {
      const idle = sampleIdleBodyMotion(elapsed, { emotion });
      leanX += idle.headX * 0.55;
      leanZ += idle.headZ * 0.85 + idle.hipZ * 0.65;
      leanY += idle.leanY * 0.75;
      sway += idle.leanY * 0.4;
    } else if (!talking) {
      sway = Math.sin((now - t0) * 0.0009) * 0.025;
    }
    model.rotation.x =
      leanX + (talking ? Math.sin((now - t0) * 0.006) * 0.02 * energy : 0);
    model.rotation.z = leanZ + sway;
    model.rotation.y =
      baseModelRotY + actionRotY + leanY + Math.sin((now - t0) * 0.0005) * 0.02;

    if (!mixer) {
      const breath = Math.sin((now - t0) * 0.0018) * body.bounce;
      const s = scale * (1 + breath);
      model.scale.set(s, s, s);
    }

    faceLight.intensity = 0.55 + (talking ? 0.2 : 0) + Math.sin((now - t0) * 0.002) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  setEmotion("neutral");
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  // Prevent page scroll while orbiting on canvas
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", () => {
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", () => {
    canvas.style.cursor = "grab";
  });

  return {
    schema: GLTF_AVATAR_SCHEMA,
    kind: "gltf",
    setEmotion,
    setMouthOpen,
    setTalking,
    setTalkEnergy,
    playGesture,
    playGestureForText,
    playAction,
    stopAction,
    get emotion() {
      return emotion;
    },
    get currentAction() {
      return activeAction;
    },
    get mouthOpen() {
      return mouthOpen;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener?.("resize", resize);
      controls.dispose();
      renderer.dispose();
    },
  };
}
