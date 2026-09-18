/**
 * Simple 3D snack props parented to VRM hand + mouth during treat feeding.
 */
import * as THREE from "three";

export const COMPANION_TREAT_PROP_SCHEMA = "amoji.companionTreatProp.v1";

/** @type {Readonly<Record<string, { main: number, accent?: number, plate?: number }>>} */
const TREAT_COLORS = Object.freeze({
  cake: { main: 0xf4a6c6, accent: 0xffffff, plate: 0xe8e8e8 },
  bento: { main: 0x8b4513, accent: 0xfff8f0, plate: 0x2ecc71 },
  dumpling: { main: 0xf5e6c8, accent: 0xffffff },
  cookie: { main: 0xc9956a, accent: 0x5d3a1a },
  "milk-tea": { main: 0xf5deb3, accent: 0x6f4e37, plate: 0xffffff },
  soda: { main: 0xff5555, accent: 0xcc2222 },
  smoothie: { main: 0xff9ecd, accent: 0xff6699 },
});

/**
 * @param {THREE.Object3D} parent
 * @param {THREE.BufferGeometry} geo
 * @param {number} color
 * @param {Partial<THREE.MeshStandardMaterialParameters>} [matOpts]
 */
function addMesh(parent, geo, color, matOpts = {}) {
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.58,
      metalness: 0.04,
      ...matOpts,
    }),
  );
  parent.add(mesh);
  return mesh;
}

function buildCakeProp() {
  const group = new THREE.Group();
  const colors = TREAT_COLORS.cake;
  addMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 0.012, 20), colors.plate);
  const slice = addMesh(group, new THREE.BoxGeometry(0.09, 0.055, 0.07), colors.main);
  slice.position.y = 0.03;
  slice.rotation.y = 0.35;
  const icing = addMesh(group, new THREE.BoxGeometry(0.09, 0.018, 0.07), colors.accent);
  icing.position.y = 0.062;
  icing.rotation.y = 0.35;
  return group;
}

function buildBentoProp() {
  const group = new THREE.Group();
  const colors = TREAT_COLORS.bento;
  const box = addMesh(group, new THREE.BoxGeometry(0.12, 0.045, 0.09), colors.main);
  box.position.y = 0.022;
  const rice = addMesh(group, new THREE.BoxGeometry(0.1, 0.018, 0.075), colors.accent);
  rice.position.y = 0.05;
  const veg = addMesh(group, new THREE.BoxGeometry(0.035, 0.012, 0.035), colors.plate);
  veg.position.set(0.025, 0.058, 0.015);
  return group;
}

function buildDumplingProp() {
  const group = new THREE.Group();
  const colors = TREAT_COLORS.dumpling;
  const body = addMesh(group, new THREE.SphereGeometry(0.035, 14, 12), colors.main);
  body.scale.set(1.15, 0.82, 1);
  body.position.y = 0.028;
  const pleat = addMesh(group, new THREE.TorusGeometry(0.028, 0.004, 8, 16), colors.accent);
  pleat.rotation.x = Math.PI / 2;
  pleat.position.y = 0.048;
  return group;
}

function buildCookieProp() {
  const group = new THREE.Group();
  const colors = TREAT_COLORS.cookie;
  const cookie = addMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 0.014, 16), colors.main);
  cookie.position.y = 0.007;
  for (let i = 0; i < 4; i += 1) {
    const chip = addMesh(group, new THREE.SphereGeometry(0.008, 8, 8), colors.accent);
    chip.position.set(
      Math.cos(i * 1.4) * 0.024,
      0.014,
      Math.sin(i * 1.4) * 0.024,
    );
  }
  return group;
}

/**
 * @param {string} itemId
 */
function buildDrinkProp(itemId) {
  const colors = TREAT_COLORS[itemId] || TREAT_COLORS["milk-tea"];
  const group = new THREE.Group();
  const cup = addMesh(group, new THREE.CylinderGeometry(0.045, 0.038, 0.11, 16), colors.main);
  cup.position.y = 0.055;
  const liquid = addMesh(group, new THREE.CylinderGeometry(0.04, 0.035, 0.06, 16), colors.accent);
  liquid.position.y = 0.07;
  if (itemId === "milk-tea") {
    const straw = addMesh(group, new THREE.CylinderGeometry(0.004, 0.004, 0.13, 8), 0xffffff);
    straw.position.set(0.03, 0.1, 0);
    straw.rotation.z = 0.12;
  }
  return group;
}

/**
 * @param {string} itemId
 * @param {"eat"|"drink"} action
 */
export function buildTreatPropMesh(itemId, action = "eat") {
  const id = String(itemId || "cookie").toLowerCase();
  if (action === "drink" || id === "milk-tea" || id === "soda" || id === "smoothie") {
    return buildDrinkProp(id);
  }
  switch (id) {
    case "cake":
      return buildCakeProp();
    case "bento":
      return buildBentoProp();
    case "dumpling":
      return buildDumplingProp();
    case "cookie":
    default:
      return buildCookieProp();
  }
}

/**
 * @param {string} itemId
 */
export function buildTreatBiteMesh(itemId) {
  const colors = TREAT_COLORS[String(itemId || "cookie").toLowerCase()] || TREAT_COLORS.cookie;
  const group = new THREE.Group();
  addMesh(group, new THREE.SphereGeometry(0.028, 10, 10), colors.main);
  return group;
}

/**
 * @param {import('@pixiv/three-vrm').VRMHumanoid | null | undefined} humanoid
 */
export function createCompanionTreatProp(humanoid) {
  /** @type {THREE.Group | null} */
  let handProp = null;
  /** @type {THREE.Group | null} */
  let mouthProp = null;
  /** @type {string} */
  let activeItemId = "";
  /** @type {"eat"|"drink"} */
  let mode = "eat";

  const handNode = () => humanoid?.getNormalizedBoneNode?.("rightHand") || null;
  const headNode = () => humanoid?.getNormalizedBoneNode?.("head") || null;

  const detach = () => {
    handProp?.removeFromParent();
    mouthProp?.removeFromParent();
    handProp = null;
    mouthProp = null;
    activeItemId = "";
  };

  /**
   * @param {{ id?: string, action?: string } | null | undefined} item
   */
  const attach = (item) => {
    detach();
    if (!item || !humanoid) return false;
    activeItemId = String(item.id || "cookie").toLowerCase();
    mode = item.action === "drink" ? "drink" : "eat";
    const hand = handNode();
    if (!hand) return false;
    handProp = buildTreatPropMesh(activeItemId, mode);
    hand.add(handProp);
    handProp.position.set(0.01, 0.035, 0.05);
    handProp.rotation.set(-0.55, 0.15, -0.25);
    handProp.scale.setScalar(mode === "drink" ? 0.48 : 0.42);
    return true;
  };

  /**
   * @param {number} [chew] 0–1 chew/sip phase from body motion
   */
  const update = (chew = 0) => {
    if (!handProp) return;
    const phase = Math.max(0, Math.min(1, Number(chew) || 0));
    const reach = mode === "drink" ? 0.12 : 0.16;
    const lift = phase * reach;
    handProp.position.y = 0.035 + lift * 0.85;
    handProp.position.z = 0.05 - lift * 1.05;
    handProp.rotation.x = mode === "drink" ? -0.65 - phase * 0.28 : -0.55 - phase * 0.38;

    const head = headNode();
    if (phase > 0.66 && head) {
      if (!mouthProp) {
        mouthProp = buildTreatBiteMesh(activeItemId);
        head.add(mouthProp);
        mouthProp.position.set(0.01, -0.028, 0.075);
        mouthProp.rotation.set(0.12, 0, 0);
      }
      const biteScale = 0.16 + (1 - phase) * 0.08;
      mouthProp.scale.setScalar(biteScale);
      mouthProp.visible = true;
    } else if (mouthProp) {
      mouthProp.visible = false;
    }

    if (mode === "eat") {
      handProp.scale.setScalar(0.42 * (1 - phase * 0.1));
    }
  };

  return {
    schema: COMPANION_TREAT_PROP_SCHEMA,
    attach,
    update,
    detach,
    get active() {
      return Boolean(handProp);
    },
    get itemId() {
      return activeItemId;
    },
  };
}
