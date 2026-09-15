/**
 * Cloud motion pack manifests — shared by /api/motions and the companion client.
 */
import { PLAYABLE_ACTIONS } from "./companionActionCatalog.js";

export const MOTION_PACK_SCHEMA = "amoji.motionPack.v1";

/** Always available offline — no cloud download required. */
export const BUNDLED_MOTION_IDS = Object.freeze([
  "wave",
  "nod",
  "thinking",
  "bow",
  "clap",
  "learning",
  "downloading",
  "stop",
]);

/** Standard catalog motions delivered by the basic cloud pack on first connect. */
export const BASIC_PACK_MOTION_IDS = Object.freeze(
  PLAYABLE_ACTIONS.filter((id) => !BUNDLED_MOTION_IDS.includes(id)),
);

/** Extra motions that require an on-demand cloud download before first use. */
export const CLOUD_EXTENSION_MOTIONS = Object.freeze({
  breakdance: {
    id: "breakdance",
    extends: "dance",
    duration: 4.2,
    loops: true,
    emotion: "happy",
    keywords: [/break\s*dance|霹靂舞|街舞|bboy/i],
    aliases: ["bboy", "streetdance"],
    label: { yue: "霹靂舞", en: "breakdance" },
  },
  taiji: {
    id: "taiji",
    extends: "yoga",
    duration: 4.5,
    loops: true,
    emotion: "neutral",
    keywords: [/太極|tai\s*chi|taiji/i],
    aliases: ["taichi"],
    label: { yue: "太極", en: "tai chi" },
  },
  highfive: {
    id: "highfive",
    extends: "wave",
    duration: 1.4,
    loops: false,
    emotion: "happy",
    keywords: [/high\s*five|擊掌|give me five/i],
    aliases: ["hifive"],
    label: { yue: "擊掌", en: "high five" },
  },
  curtsy: {
    id: "curtsy",
    extends: "bow",
    duration: 1.8,
    loops: false,
    emotion: "happy",
    keywords: [/curtsy|屈膝禮|淑女禮/i],
    aliases: ["curtsey"],
    label: { yue: "屈膝禮", en: "curtsy" },
  },
  tiktokdance: {
    id: "tiktokdance",
    extends: "dance",
    duration: 3.8,
    loops: true,
    emotion: "happy",
    keywords: [/tik\s*tok\s*dance|抖音舞|熱門舞/i],
    aliases: ["tiktok", "viraldance"],
    label: { yue: "抖音舞", en: "TikTok dance" },
  },
});

/** Larger online library — downloaded after extensions on preload. */
export const PREMIUM_EXTENSION_MOTIONS = Object.freeze({
  ballet: {
    id: "ballet",
    extends: "dance",
    duration: 4.0,
    loops: true,
    emotion: "happy",
    keywords: [/芭蕾|ballet|優雅舞/i],
    aliases: ["balletdance"],
    label: { yue: "芭蕾", en: "ballet" },
  },
  hiphop: {
    id: "hiphop",
    extends: "dance",
    duration: 3.6,
    loops: true,
    emotion: "happy",
    keywords: [/hip\s*hop|嘻哈|街舞風/i],
    aliases: ["hiphopdance"],
    label: { yue: "嘻哈舞", en: "hip-hop" },
  },
  macarena: {
    id: "macarena",
    extends: "dance",
    duration: 3.4,
    loops: true,
    emotion: "happy",
    keywords: [/macarena|麥克瑞納|經典舞/i],
    aliases: ["macarenadance"],
    label: { yue: "Macarena", en: "Macarena" },
  },
  floss: {
    id: "floss",
    extends: "dance",
    duration: 3.2,
    loops: true,
    emotion: "happy",
    keywords: [/floss|牙線舞|擺手舞/i],
    aliases: ["flossdance"],
    label: { yue: "牙線舞", en: "floss" },
  },
  wiggle: {
    id: "wiggle",
    extends: "dance",
    duration: 2.8,
    loops: true,
    emotion: "happy",
    keywords: [/扭腰|wiggle|搖擺/i],
    aliases: ["wiggledance"],
    label: { yue: "扭腰舞", en: "wiggle" },
  },
  superhero: {
    id: "superhero",
    extends: "cheer",
    duration: 2.4,
    loops: false,
    emotion: "happy",
    keywords: [/超人|super\s*hero|英雄 pose/i],
    aliases: ["hero", "supermanpose"],
    label: { yue: "超人 pose", en: "superhero" },
  },
  handshake: {
    id: "handshake",
    extends: "wave",
    duration: 1.6,
    loops: false,
    emotion: "happy",
    keywords: [/握手|handshake|shake hands/i],
    aliases: ["shakehands"],
    label: { yue: "握手", en: "handshake" },
  },
  fingerheart: {
    id: "fingerheart",
    extends: "peace",
    duration: 1.4,
    loops: false,
    emotion: "happy",
    keywords: [/手指心|finger\s*heart|比心/i],
    aliases: ["heartfinger", "fingerheart"],
    label: { yue: "手指心", en: "finger heart" },
  },
  photopose: {
    id: "photopose",
    extends: "dab",
    duration: 1.6,
    loops: false,
    emotion: "happy",
    keywords: [/拍照 pose|影相 pose|photo\s*pose|model\s*pose/i],
    aliases: ["pose", "modelpose"],
    label: { yue: "拍照 pose", en: "photo pose" },
  },
  pushup: {
    id: "pushup",
    extends: "squat",
    duration: 2.8,
    loops: true,
    emotion: "neutral",
    keywords: [/俯卧撑|伏地挺身|push\s*up|pushup/i],
    aliases: ["pushups"],
    label: { yue: "俯卧撑", en: "push-up" },
  },
  plank: {
    id: "plank",
    extends: "yoga",
    duration: 3.0,
    loops: true,
    emotion: "neutral",
    keywords: [/平板支撑|plank/i],
    aliases: ["planking"],
    label: { yue: "平板支撑", en: "plank" },
  },
  zombie: {
    id: "zombie",
    extends: "walk",
    duration: 3.2,
    loops: true,
    emotion: "neutral",
    keywords: [/喪尸|殭尸|zombie/i],
    aliases: ["zombiewalk"],
    label: { yue: "喪尸步", en: "zombie walk" },
  },
  sneak: {
    id: "sneak",
    extends: "walk",
    duration: 2.8,
    loops: true,
    emotion: "thinking",
    keywords: [/潛行|鬼鬼祟祟|sneak|stealth|creep/i],
    aliases: ["sneaking", "creep"],
    label: { yue: "潛行", en: "sneak" },
  },
  jumpjack: {
    id: "jumpjack",
    extends: "jump",
    duration: 2.6,
    loops: true,
    emotion: "happy",
    keywords: [/開合跳|jumping\s*jack|jump\s*jack/i],
    aliases: ["jumpingjack", "starjump"],
    label: { yue: "開合跳", en: "jumping jack" },
  },
});

/** @type {Record<string, object>} */
const ALL_CLOUD_MOTIONS = Object.freeze({
  ...CLOUD_EXTENSION_MOTIONS,
  ...PREMIUM_EXTENSION_MOTIONS,
});

export const BASIC_MOTION_PACK = Object.freeze({
  schema: MOTION_PACK_SCHEMA,
  id: "basic-v1",
  label: { yue: "基礎動作包", en: "Basic motion pack" },
  version: 1,
  motions: BASIC_PACK_MOTION_IDS.map((id) => ({ id, tier: "basic" })),
});

export const EXTENSION_MOTION_PACK = Object.freeze({
  schema: MOTION_PACK_SCHEMA,
  id: "extensions-v1",
  label: { yue: "進階動作包", en: "Extension motion pack" },
  version: 1,
  motions: Object.keys(CLOUD_EXTENSION_MOTIONS).map((id) => ({
    id,
    tier: "extension",
    ...CLOUD_EXTENSION_MOTIONS[id],
  })),
});

export const PREMIUM_MOTION_PACK = Object.freeze({
  schema: MOTION_PACK_SCHEMA,
  id: "premium-v1",
  label: { yue: "豪華動作包", en: "Premium motion pack" },
  version: 1,
  motions: Object.keys(PREMIUM_EXTENSION_MOTIONS).map((id) => ({
    id,
    tier: "premium",
    ...PREMIUM_EXTENSION_MOTIONS[id],
  })),
});

/**
 * @param {string | null | undefined} packId
 */
export function getMotionPack(packId) {
  const id = String(packId || "basic").toLowerCase();
  if (id === "basic" || id === "basic-v1") return BASIC_MOTION_PACK;
  if (id === "extensions" || id === "extensions-v1") {
    return EXTENSION_MOTION_PACK;
  }
  if (id === "premium" || id === "premium-v1") {
    return PREMIUM_MOTION_PACK;
  }
  return null;
}

/**
 * @param {string | null | undefined} actionId
 */
export function getCloudMotionDef(actionId) {
  const id = String(actionId || "").toLowerCase();
  return ALL_CLOUD_MOTIONS[id] || null;
}

export function listMotionPacks() {
  return [BASIC_MOTION_PACK, EXTENSION_MOTION_PACK, PREMIUM_MOTION_PACK];
}

/**
 * @param {string | null | undefined} raw
 */
export function normalizeMotionToken(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Resolve cloud-only extension action ids (breakdance, taiji, etc.).
 * @param {string | null | undefined} input
 * @returns {string | null}
 */
export function resolveCloudAction(input) {
  const token = normalizeMotionToken(input);
  if (!token) return null;
  if (ALL_CLOUD_MOTIONS[token]) return token;

  for (const [id, def] of Object.entries(ALL_CLOUD_MOTIONS)) {
    for (const alias of def.aliases || []) {
      if (normalizeMotionToken(alias) === token) return id;
    }
    for (const re of def.keywords || []) {
      if (re.test(String(input || ""))) return id;
    }
  }

  for (const id of Object.keys(ALL_CLOUD_MOTIONS)) {
    if (token.includes(id) || id.includes(token)) return id;
  }
  return null;
}
