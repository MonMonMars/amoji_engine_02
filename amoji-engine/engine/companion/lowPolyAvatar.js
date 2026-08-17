/**
 * Low-poly anime-style companion avatar (Three.js).
 * Drives facial emotion + mouth open from chat / TTS energy.
 */
import * as THREE from "three";

export const LOW_POLY_AVATAR_SCHEMA = "amoji.lowPolyAvatar.v1";

const EMOTION_TARGETS = {
  neutral: {
    brow: 0,
    eyeOpen: 0.88,
    smile: 0.12,
    blush: 0.05,
    leanX: 0,
    leanZ: 0,
    armL: 0.15,
    armR: 0.15,
  },
  happy: {
    brow: 0.15,
    eyeOpen: 0.72,
    smile: 0.85,
    blush: 0.55,
    leanX: 0.04,
    leanZ: -0.02,
    armL: 0.45,
    armR: 0.55,
  },
  thinking: {
    brow: 0.35,
    eyeOpen: 0.8,
    smile: 0.05,
    blush: 0.08,
    leanX: -0.08,
    leanZ: 0.06,
    armL: 0.7,
    armR: 0.1,
  },
  sad: {
    brow: -0.25,
    eyeOpen: 0.55,
    smile: -0.45,
    blush: 0.12,
    leanX: 0.02,
    leanZ: 0.1,
    armL: -0.1,
    armR: -0.1,
  },
  surprised: {
    brow: 0.55,
    eyeOpen: 1.05,
    smile: 0.1,
    blush: 0.2,
    leanX: 0,
    leanZ: -0.08,
    armL: 0.85,
    armR: 0.85,
  },
  angry: {
    brow: -0.55,
    eyeOpen: 0.7,
    smile: -0.35,
    blush: 0.35,
    leanX: 0.03,
    leanZ: -0.04,
    armL: 0.35,
    armR: 0.35,
  },
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.05,
    transparent: Boolean(opts.opacity != null && opts.opacity < 1),
    opacity: opts.opacity ?? 1,
  });
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   color?: string,
 * }} opts
 */
export function createLowPolyAvatar(opts) {
  const canvas = opts.canvas;
  const skin = opts.color || "#f2c4a8";
  const hair = "#2a1f3d";
  const outfit = "#6ec8c4";
  const accent = "#ff8fab";

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    const gl = renderer.getContext?.();
    if (!gl) throw new Error("WebGL context missing");
  } catch (err) {
    throw new Error(`WebGL unavailable: ${err?.message || err}`);
  }
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 1.15, 4.2);

  const hemi = new THREE.HemisphereLight(0xffe6d6, 0x1a2030, 1.15);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(2.4, 4.2, 3.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88d5ff, 0.55);
  rim.position.set(-3, 1.5, -2);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  // Body
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.55, 1.05, 6),
    mat(outfit),
  );
  torso.position.y = 0.55;
  root.add(torso);

  const hips = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.38, 0.35, 6),
    mat("#3d4a5c"),
  );
  hips.position.y = -0.05;
  root.add(hips);

  // Head
  const head = new THREE.Group();
  head.position.y = 1.45;
  root.add(head);

  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 0), mat(skin));
  head.add(skull);

  const bangs = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 0.45, 6),
    mat(hair),
  );
  bangs.position.set(0, 0.38, 0.05);
  bangs.rotation.x = 0.15;
  head.add(bangs);

  const hairBack = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.55, 2, 6),
    mat(hair),
  );
  hairBack.position.set(0, 0.05, -0.28);
  head.add(hairBack);

  // Side locks
  for (const side of [-1, 1]) {
    const lock = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.55, 2, 5),
      mat(hair),
    );
    lock.position.set(side * 0.42, -0.15, 0.05);
    lock.rotation.z = side * 0.25;
    head.add(lock);
  }

  // Eyes
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    mat("#1a1420"),
  );
  eyeL.position.set(-0.16, 0.06, 0.42);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.16;
  head.add(eyeR);

  const shineL = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 6, 4),
    mat("#ffffff", { roughness: 0.2 }),
  );
  shineL.position.set(-0.14, 0.09, 0.49);
  head.add(shineL);
  const shineR = shineL.clone();
  shineR.position.x = 0.18;
  head.add(shineR);

  // Brows
  const browGeo = new THREE.BoxGeometry(0.16, 0.03, 0.04);
  const browL = new THREE.Mesh(browGeo, mat(hair));
  browL.position.set(-0.16, 0.2, 0.45);
  head.add(browL);
  const browR = browL.clone();
  browR.position.x = 0.16;
  head.add(browR);

  // Blush
  const blushL = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 8),
    mat(accent, { opacity: 0.35 }),
  );
  blushL.position.set(-0.28, -0.02, 0.4);
  head.add(blushL);
  const blushR = blushL.clone();
  blushR.position.x = 0.28;
  head.add(blushR);

  // Mouth (scales with lip sync)
  const mouth = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.06, 0.02, 2, 6),
    mat("#c45c6a"),
  );
  mouth.position.set(0, -0.14, 0.46);
  head.add(mouth);

  // Arms
  const armL = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.55, 2, 5),
    mat(skin),
  );
  armL.position.set(-0.62, 0.7, 0);
  root.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.62;
  root.add(armR);

  // Soft ground glow disc
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 24),
    new THREE.MeshBasicMaterial({
      color: 0x6ec8c4,
      transparent: true,
      opacity: 0.12,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.55;
  scene.add(ground);

  /** @type {keyof typeof EMOTION_TARGETS} */
  let emotion = "neutral";
  let mouthOpen = 0;
  let talking = false;
  let t0 = performance.now();
  const current = { ...EMOTION_TARGETS.neutral };

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  };

  const setEmotion = (next) => {
    const key = String(next || "neutral").toLowerCase();
    emotion = EMOTION_TARGETS[key] ? key : "neutral";
    return emotion;
  };

  const setMouthOpen = (v) => {
    mouthOpen = clamp(Number(v) || 0, 0, 1);
    return mouthOpen;
  };

  const setTalking = (on) => {
    talking = Boolean(on);
    return talking;
  };

  const applyPose = (dt) => {
    const target = EMOTION_TARGETS[emotion] || EMOTION_TARGETS.neutral;
    const k = 1 - Math.exp(-dt * 6);
    for (const key of Object.keys(target)) {
      current[key] = lerp(current[key], target[key], k);
    }

    const breath = Math.sin((performance.now() - t0) * 0.0022) * 0.02;
    root.rotation.y = Math.sin((performance.now() - t0) * 0.0007) * 0.08;
    root.position.y = breath;
    root.rotation.x = current.leanZ;
    root.rotation.z = current.leanX;

    head.rotation.z = current.leanX * 1.4;
    head.rotation.x = current.leanZ * 0.8;

    browL.rotation.z = current.brow * 0.6;
    browR.rotation.z = -current.brow * 0.6;
    browL.position.y = 0.2 + current.brow * 0.04;
    browR.position.y = 0.2 + current.brow * 0.04;

    const eyeScaleY = clamp(current.eyeOpen, 0.25, 1.15);
    eyeL.scale.set(1, eyeScaleY, 1);
    eyeR.scale.set(1, eyeScaleY, 1);

    blushL.material.opacity = 0.15 + current.blush * 0.55;
    blushR.material.opacity = blushL.material.opacity;

    const talkPulse = talking
      ? 0.25 + Math.abs(Math.sin((performance.now() - t0) * 0.028)) * 0.75
      : 0;
    const open = clamp(Math.max(mouthOpen, talkPulse * (talking ? 1 : 0)), 0, 1);
    const smileLift = current.smile;
    mouth.scale.set(
      1.05 + Math.max(0, smileLift) * 0.55,
      0.35 + open * 1.8 + Math.max(0, -smileLift) * 0.2,
      1,
    );
    mouth.position.y = -0.14 - open * 0.04 + smileLift * 0.02;
    mouth.rotation.z = smileLift * -0.15;

    armL.rotation.z = 0.35 + current.armL;
    armR.rotation.z = -0.35 - current.armR;
    armL.rotation.x = talking ? Math.sin((performance.now() - t0) * 0.01) * 0.15 : 0.05;
    armR.rotation.x = talking ? Math.cos((performance.now() - t0) * 0.011) * 0.18 : 0.05;
  };

  let last = performance.now();
  let raf = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    applyPose(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  resize();
  raf = requestAnimationFrame(frame);
  globalThis.addEventListener?.("resize", resize);

  return {
    schema: LOW_POLY_AVATAR_SCHEMA,
    setEmotion,
    setMouthOpen,
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
      renderer.dispose();
    },
  };
}
