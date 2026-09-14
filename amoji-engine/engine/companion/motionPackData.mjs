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

/**
 * @param {string | null | undefined} packId
 */
export function getMotionPack(packId) {
  const id = String(packId || "basic").toLowerCase();
  if (id === "basic" || id === "basic-v1") return BASIC_MOTION_PACK;
  if (id === "extensions" || id === "extensions-v1") {
    return EXTENSION_MOTION_PACK;
  }
  return null;
}

/**
 * @param {string | null | undefined} actionId
 */
export function getCloudMotionDef(actionId) {
  const id = String(actionId || "").toLowerCase();
  return CLOUD_EXTENSION_MOTIONS[id] || null;
}

export function listMotionPacks() {
  return [BASIC_MOTION_PACK, EXTENSION_MOTION_PACK];
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
  if (CLOUD_EXTENSION_MOTIONS[token]) return token;

  for (const [id, def] of Object.entries(CLOUD_EXTENSION_MOTIONS)) {
    for (const alias of def.aliases || []) {
      if (normalizeMotionToken(alias) === token) return id;
    }
    for (const re of def.keywords || []) {
      if (re.test(String(input || ""))) return id;
    }
  }

  for (const id of Object.keys(CLOUD_EXTENSION_MOTIONS)) {
    if (token.includes(id) || id.includes(token)) return id;
  }
  return null;
}
