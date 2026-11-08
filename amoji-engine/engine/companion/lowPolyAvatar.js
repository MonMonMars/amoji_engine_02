/**
 * More detailed low-poly anime *female* companion (Three.js).
 * Feminine proportions, longer hair, dress, larger eyes, earrings.
 */
import * as THREE from "three";
import {
  blendProceduralFaceTargets,
  buildModelFaceProfile,
} from "./companionFaceEmotion.js";

export const LOW_POLY_AVATAR_SCHEMA = "amoji.lowPolyAvatar.v1";

const EMOTION_TARGETS = {
  // Iconic standing idle: grounded, slight hip weight, soft hand pose
  neutral: {
    brow: 0.05,
    eyeOpen: 0.92,
    smile: 0.2,
    blush: 0.1,
    leanX: 0.02,
    leanZ: 0,
    armL: 0.28,
    armR: 0.55,
    hip: 0.04,
  },
  happy: {
    brow: 0.18,
    eyeOpen: 0.7,
    smile: 0.92,
    blush: 0.65,
    leanX: 0.03,
    leanZ: 0,
    armL: 0.5,
    armR: 0.62,
    hip: 0.05,
  },
  thinking: {
    brow: 0.4,
    eyeOpen: 0.82,
    smile: 0.08,
    blush: 0.15,
    leanX: -0.06,
    leanZ: 0.02,
    armL: 0.9,
    armR: 0.18,
    hip: 0.03,
  },
  sad: {
    brow: -0.28,
    eyeOpen: 0.52,
    smile: -0.5,
    blush: 0.18,
    leanX: 0.02,
    leanZ: 0.04,
    armL: 0.12,
    armR: 0.12,
    hip: 0.02,
  },
  surprised: {
    brow: 0.62,
    eyeOpen: 1.12,
    smile: 0.12,
    blush: 0.28,
    leanX: 0,
    leanZ: -0.02,
    armL: 0.9,
    armR: 0.9,
    hip: 0,
  },
  angry: {
    brow: -0.58,
    eyeOpen: 0.72,
    smile: -0.4,
    blush: 0.4,
    leanX: 0.03,
    leanZ: 0,
    armL: 0.38,
    armR: 0.38,
    hip: 0.03,
  },
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: opts.roughness ?? 0.68,
    metalness: opts.metalness ?? 0.04,
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
 * @param {{ canvas: HTMLCanvasElement, color?: string }} opts
 */
export function createLowPolyAvatar(opts) {
  const canvas = opts.canvas;
  const skin = opts.color || "#f6c9b4";
  const hair = "#3b2348";
  const hairHi = "#6a3d7a";
  const dress = "#7fd4cf";
  const dressDark = "#4fa8a4";
  const accent = "#ff8fab";
  const iris = "#3d2a55";

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
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.25, 4.35);

  scene.add(new THREE.HemisphereLight(0xffe8dc, 0x1a2030, 1.2));
  const key = new THREE.DirectionalLight(0xfff5ee, 1.4);
  key.position.set(2.2, 4.5, 3.4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ad7ff, 0.65);
  rim.position.set(-3.2, 1.8, -2.2);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc6d9, 0.35);
  fill.position.set(0, 1, 4);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  // ---- Body (feminine hourglass-ish low poly) ----
  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 8, 6),
    mat(dress),
  );
  chest.scale.set(1.15, 0.85, 0.75);
  chest.position.y = 0.95;
  root.add(chest);

  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.36, 0.45, 8),
    mat(dress),
  );
  waist.position.y = 0.55;
  root.add(waist);

  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.78, 0.7, 8),
    mat(dressDark),
  );
  skirt.position.y = 0.05;
  root.add(skirt);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.035, 6, 12),
    mat("#f7f1e8"),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.18;
  root.add(collar);

  // Neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.22, 8),
    mat(skin),
  );
  neck.position.y = 1.28;
  root.add(neck);

  // ---- Head ----
  const head = new THREE.Group();
  head.position.y = 1.62;
  root.add(head);

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 10, 8),
    mat(skin),
  );
  skull.scale.set(0.92, 1.05, 0.88);
  head.add(skull);

  const chin = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    mat(skin),
  );
  chin.position.set(0, -0.32, 0.12);
  chin.scale.set(0.85, 0.7, 0.7);
  head.add(chin);

  // Long hair volume
  const hairDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 10, 8),
    mat(hair),
  );
  hairDome.position.set(0, 0.12, -0.05);
  hairDome.scale.set(1.05, 1.05, 1.0);
  head.add(hairDome);

  const bangs = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 8, 6),
    mat(hairHi),
  );
  bangs.position.set(0, 0.22, 0.28);
  bangs.scale.set(1.05, 0.45, 0.55);
  head.add(bangs);

  // Long twin / side hair
  for (const side of [-1, 1]) {
    const lock = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.95, 3, 6),
      mat(hair),
    );
    lock.position.set(side * 0.48, -0.35, 0.02);
    lock.rotation.z = side * 0.22;
    head.add(lock);

    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      mat(hairHi),
    );
    tip.position.set(side * 0.58, -0.95, 0.05);
    head.add(tip);

    const earring = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 6, 6),
      mat("#f0d48a", { metalness: 0.55, roughness: 0.35 }),
    );
    earring.position.set(side * 0.42, -0.18, 0.2);
    head.add(earring);
  }

  const ponytail = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.7, 3, 6),
    mat(hair),
  );
  ponytail.position.set(0, -0.15, -0.45);
  ponytail.rotation.x = 0.35;
  head.add(ponytail);

  // Eyes — larger anime style
  const makeEye = (x) => {
    const g = new THREE.Group();
    g.position.set(x, 0.05, 0.4);
    const white = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 6),
      mat("#fff8f2"),
    );
    white.scale.set(1.05, 1.2, 0.55);
    g.add(white);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      mat(iris),
    );
    pupil.position.z = 0.06;
    g.add(pupil);
    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 4),
      mat("#ffffff", { roughness: 0.15 }),
    );
    shine.position.set(0.025, 0.03, 0.11);
    g.add(shine);
    const shine2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 5, 4),
      mat("#ffffff"),
    );
    shine2.position.set(-0.03, -0.02, 0.1);
    g.add(shine2);
    head.add(g);
    return { group: g, white, pupil };
  };
  const eyeL = makeEye(-0.17);
  const eyeR = makeEye(0.17);

  // Brows
  const browGeo = new THREE.CapsuleGeometry(0.02, 0.12, 2, 4);
  const browL = new THREE.Mesh(browGeo, mat(hair));
  browL.position.set(-0.17, 0.22, 0.42);
  browL.rotation.z = 0.1;
  head.add(browL);
  const browR = browL.clone();
  browR.position.x = 0.17;
  browR.rotation.z = -0.1;
  head.add(browR);

  // Nose hint
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.06, 5),
    mat(skin),
  );
  nose.position.set(0, -0.02, 0.45);
  nose.rotation.x = Math.PI;
  head.add(nose);

  // Blush
  const blushL = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 10),
    mat(accent, { opacity: 0.4 }),
  );
  blushL.position.set(-0.3, -0.06, 0.38);
  head.add(blushL);
  const blushR = blushL.clone();
  blushR.position.x = 0.3;
  head.add(blushR);

  // Mouth
  const mouth = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.015, 2, 6),
    mat("#d46378"),
  );
  mouth.position.set(0, -0.18, 0.44);
  head.add(mouth);

  // Arms
  const armL = new THREE.Group();
  armL.position.set(-0.55, 1.05, 0);
  root.add(armL);
  const armLMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.08, 0.55, 3, 6),
    mat(skin),
  );
  armLMesh.position.y = -0.3;
  armL.add(armLMesh);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), mat(skin));
  handL.position.y = -0.62;
  armL.add(handL);

  const armR = new THREE.Group();
  armR.position.set(0.55, 1.05, 0);
  root.add(armR);
  const armRMesh = armLMesh.clone();
  armR.add(armRMesh);
  const handR = handL.clone();
  armR.add(handR);

  // Soft ground glow
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7fd4cf,
      transparent: true,
      opacity: 0.14,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.45;
  scene.add(ground);

  /** @type {keyof typeof EMOTION_TARGETS} */
  let emotion = "neutral";
  let nuance = "none";
  const faceProfile = buildModelFaceProfile({ avatarKind: "procedural" });
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

  const applyExpressionProfile = ({
    emotion: em = "neutral",
    nuance: n = "none",
  } = {}) => {
    setEmotion(em);
    nuance = String(n || "none").toLowerCase();
    return { emotion, nuance };
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
    const target = blendProceduralFaceTargets(EMOTION_TARGETS, emotion, nuance);
    const k = 1 - Math.exp(-dt * 6);
    for (const key of Object.keys(target)) {
      current[key] = lerp(current[key] ?? 0, target[key], k);
    }

    const now = performance.now();
    // Standing idle: grounded feet, chest breathing only — no floating / air-drift
    const breath = Math.sin((now - t0) * 0.0018);
    const blinkCycle = (now - t0) % 4200;
    const blink =
      blinkCycle > 3900 && blinkCycle < 4050
        ? 0.15
        : blinkCycle >= 4050 && blinkCycle < 4120
          ? 0.45
          : 1;

    root.position.y = 0;
    root.rotation.y = 0.04; // slight iconic 3/4 facing, locked
    root.rotation.x = current.leanZ * 0.35;
    root.rotation.z = current.leanX * 0.45 + current.hip * 0.35;

    // Breath lives in torso / skirt scale, not whole-body float
    chest.scale.set(1.15 + breath * 0.018, 0.85 + breath * 0.03, 0.75 + breath * 0.012);
    waist.scale.set(1 + breath * 0.012, 1, 1 + breath * 0.01);
    skirt.rotation.z = current.hip * 0.4;
    skirt.rotation.y = 0;

    head.rotation.z = current.leanX * 0.55;
    head.rotation.x = current.leanZ * 0.35 + breath * 0.008;
    head.rotation.y = -0.03;

    browL.rotation.z = 0.1 + current.brow * 0.7;
    browR.rotation.z = -0.1 - current.brow * 0.7;
    browL.position.y = 0.22 + current.brow * 0.045;
    browR.position.y = 0.22 + current.brow * 0.045;

    const eyeScaleY = clamp(current.eyeOpen * blink, 0.15, 1.2);
    eyeL.group.scale.set(1, eyeScaleY, 1);
    eyeR.group.scale.set(1, eyeScaleY, 1);

    blushL.material.opacity = 0.18 + current.blush * 0.55;
    blushR.material.opacity = blushL.material.opacity;

    const talkPulse = talking
      ? 0.25 + Math.abs(Math.sin((now - t0) * 0.03)) * 0.75
      : 0;
    const open = clamp(Math.max(mouthOpen, talkPulse), 0, 1);
    const smileLift = current.smile;
    mouth.scale.set(
      1.1 + Math.max(0, smileLift) * 0.65,
      0.32 + open * 2.0 + Math.max(0, -smileLift) * 0.25,
      1,
    );
    mouth.position.y = -0.18 - open * 0.035 + smileLift * 0.02;
    mouth.rotation.z = smileLift * -0.12;

    // Iconic arms: left relaxed, right hand-on-hip / gentle raise when talking
    armL.rotation.z = 0.55 + current.armL * 0.55;
    armR.rotation.z = -0.35 - current.armR * 0.75;
    armL.rotation.x = talking ? Math.sin((now - t0) * 0.009) * 0.08 : 0.12;
    armR.rotation.x = talking ? Math.cos((now - t0) * 0.01) * 0.1 : 0.22;
    armR.rotation.y = 0.15;
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
    applyExpressionProfile,
    getFaceProfile() {
      return { ...faceProfile };
    },
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
