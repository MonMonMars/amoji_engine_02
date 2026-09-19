/**
 * Action choreography — combos, showcase sequences, idle variety.
 */
import { resolveAction } from "./companionActionMotion.js";
import { actionLoopsFromCatalog, PLAYABLE_ACTIONS } from "./companionActionCatalog.js";
import { getExtendedActionDef } from "./companionMotionLibrary.js";
import { getCloudMotionDef } from "./motionPackData.mjs";
import { normalizeIdleGender } from "./companionIdleGender.js";

export const COMPANION_ACTION_CHOREOGRAPHY_SCHEMA =
  "amoji.companionActionChoreography.v2";

/** @type {Record<string, readonly string[]>} */
export const ACTION_COMBOS = Object.freeze({
  dance: ["dance", "spin", "clap", "celebrate"],
  kungfu: ["kungfu", "punch", "kick", "kungfu"],
  wave: ["wave", "nod", "celebrate"],
  laugh: ["laugh", "clap", "celebrate"],
  celebrate: ["celebrate", "cheer", "clap", "dab"],
  run: ["run", "jump", "run", "cheer"],
  walk: ["walk", "wave", "nod"],
  yoga: ["yoga", "stretch", "bow"],
  taiji: ["taiji", "yoga", "bow"],
  breakdance: ["breakdance", "spin", "dab", "dance"],
  tiktokdance: ["tiktokdance", "dab", "spin", "dance"],
  clap: ["clap", "cheer", "thumbsup"],
  angry: ["angry", "punch", "kick"],
  punch: ["punch", "kick", "kungfu"],
  kick: ["kick", "punch", "kungfu"],
  spin: ["spin", "dab", "celebrate"],
  moonwalk: ["moonwalk", "dab", "spin"],
  hug: ["hug", "wave", "shy"],
  kiss: ["kiss", "wave", "shy"],
  bow: ["bow", "wave", "nod"],
  salute: ["salute", "nod", "thumbsup"],
  cheer: ["cheer", "clap", "jump"],
  jump: ["jump", "celebrate", "cheer"],
  thinking: ["thinking", "nod", "shrug"],
  learning: ["learning", "thinking", "nod"],
  downloading: ["downloading", "learning", "wave"],
  highfive: ["highfive", "clap", "cheer"],
  curtsy: ["curtsy", "bow", "wave"],
  ballet: ["ballet", "spin", "bow"],
  hiphop: ["hiphop", "dab", "dance"],
  macarena: ["macarena", "clap", "dance"],
  floss: ["floss", "wiggle", "dance"],
  wiggle: ["wiggle", "dance", "dab"],
  superhero: ["superhero", "cheer", "jump"],
  handshake: ["handshake", "wave", "nod"],
  fingerheart: ["fingerheart", "peace", "shy"],
  photopose: ["photopose", "dab", "peace"],
  pushup: ["pushup", "squat", "stretch"],
  plank: ["plank", "yoga", "stretch"],
  zombie: ["zombie", "walk", "shrug"],
  sneak: ["sneak", "walk", "thinking"],
  jumpjack: ["jumpjack", "jump", "cheer"],
});

/** Shared quiet idle clips — safe for any companion. */
export const IDLE_LIFE_CLIP_POOL_CORE = Object.freeze([
  "nod",
  "bow",
  "peace",
  "stretch",
  "sit",
  "yoga",
  "headshake",
  "surprised",
  "facepalm",
  "sad",
  "wave",
  "thinking",
  "shrug",
  "point",
  "relax",
  "learning",
  "clap",
  "shy",
  "sleep",
  "blush",
]);

/** Feminine idle rotation — softer, expressive social beats. */
export const IDLE_LIFE_CLIP_POOL_FEMALE = Object.freeze([
  ...IDLE_LIFE_CLIP_POOL_CORE,
  "shy",
  "sleep",
  "thumbsup",
  "blush",
  "salute",
  "curtsy",
  "fingerheart",
  "photopose",
  "wiggle",
  "hug",
  "dab",
  "ballet",
  "dance",
  "rock",
  "drink",
  "moonwalk",
  "kiss",
  "celebrate",
  "spin",
]);

/** Masculine idle rotation — grounded, confident micro-moves. */
export const IDLE_LIFE_CLIP_POOL_MALE = Object.freeze([
  ...IDLE_LIFE_CLIP_POOL_CORE,
  "thumbsup",
  "salute",
  "handshake",
  "superhero",
  "sneak",
  "moonwalk",
  "pushup",
  "kungfu",
  "punch",
  "highfive",
  "run",
  "jump",
  "cheer",
  "dab",
  "celebrate",
  "sleep",
]);

/**
 * Quiet between-turn idle — Thinking.vrma calm loop plus one-shot social clips.
 * Union of gender pools (legacy import sites).
 */
export const IDLE_LIFE_CLIP_POOL = Object.freeze([
  ...new Set([
    ...IDLE_LIFE_CLIP_POOL_FEMALE,
    ...IDLE_LIFE_CLIP_POOL_MALE,
  ]),
]);

/**
 * @param {string | null | undefined} gender
 * @returns {readonly string[]}
 */
export function idleLifeClipPoolForGender(gender) {
  return normalizeIdleGender(gender) === "male"
    ? IDLE_LIFE_CLIP_POOL_MALE
    : IDLE_LIFE_CLIP_POOL_FEMALE;
}

/** Feminine showcase idle — longer performance pool. */
export const IDLE_SHOWCASE_POOL_FEMALE = Object.freeze([
  "wave",
  "nod",
  "thinking",
  "bow",
  "clap",
  "stretch",
  "peace",
  "thumbsup",
  "shy",
  "dab",
  "shrug",
  "point",
  "salute",
  "cheer",
  "spin",
  "moonwalk",
  "dance",
  "celebrate",
  "laugh",
  "hug",
  "kiss",
  "yoga",
  "sit",
  "squat",
  "walk",
  "rock",
  "drink",
  "eat",
  "sleep",
  "facepalm",
  "headshake",
  "jump",
  "highfive",
  "curtsy",
  "taiji",
  "breakdance",
  "tiktokdance",
  "learning",
  "ballet",
  "hiphop",
  "macarena",
  "floss",
  "wiggle",
  "superhero",
  "handshake",
  "fingerheart",
  "photopose",
  "pushup",
  "plank",
  "zombie",
  "sneak",
  "jumpjack",
]);

/** Masculine showcase idle — grounded + athletic beats. */
export const IDLE_SHOWCASE_POOL_MALE = Object.freeze([
  "wave",
  "nod",
  "thinking",
  "bow",
  "clap",
  "stretch",
  "peace",
  "thumbsup",
  "shrug",
  "point",
  "salute",
  "cheer",
  "spin",
  "moonwalk",
  "dance",
  "celebrate",
  "laugh",
  "yoga",
  "sit",
  "squat",
  "walk",
  "run",
  "rock",
  "drink",
  "sleep",
  "facepalm",
  "headshake",
  "jump",
  "kungfu",
  "punch",
  "kick",
  "highfive",
  "taiji",
  "breakdance",
  "tiktokdance",
  "learning",
  "hiphop",
  "macarena",
  "floss",
  "superhero",
  "handshake",
  "photopose",
  "pushup",
  "plank",
  "zombie",
  "sneak",
  "jumpjack",
  "dab",
]);

/**
 * @param {string | null | undefined} gender
 * @returns {readonly string[]}
 */
export function idleShowcasePoolForGender(gender) {
  return normalizeIdleGender(gender) === "male"
    ? IDLE_SHOWCASE_POOL_MALE
    : IDLE_SHOWCASE_POOL_FEMALE;
}

/** Large idle rotation pool — union of gender showcase sets. */
export const IDLE_SHOWCASE_POOL = Object.freeze([
  ...new Set([
    ...IDLE_SHOWCASE_POOL_FEMALE,
    ...IDLE_SHOWCASE_POOL_MALE,
  ]),
]);

/** Longer performance when user asks for multiple moves. */
export const SHOWCASE_SEQUENCE_POOL = Object.freeze([
  "wave",
  "nod",
  "dance",
  "spin",
  "clap",
  "celebrate",
  "kungfu",
  "punch",
  "kick",
  "jump",
  "cheer",
  "dab",
  "bow",
  "stretch",
  "peace",
  "thumbsup",
]);

const SHOWCASE_REQUEST_RE =
  /(?:show\s+me|表演|做幾個|幾個動作|多啲動作|more\s+moves|some\s+moves|combo|連續|routine|動作串|move\s+combo|dance\s+routine)/i;

/**
 * @param {string | null | undefined} text
 */
export function isShowcaseRequest(text) {
  return SHOWCASE_REQUEST_RE.test(String(text || ""));
}

/**
 * @param {string | null | undefined} primary
 * @param {{ emotion?: string, maxMoves?: number }} [opts]
 * @returns {string[]}
 */
export function buildActionSequence(primary, opts = {}) {
  const key = resolveAction(primary);
  if (!key || key === "none" || key === "stop") return [];

  const maxMoves = opts.maxMoves ?? 4;
  const combo = ACTION_COMBOS[key];
  if (combo?.length) {
    return combo.slice(0, maxMoves).map((id) => resolveAction(id) || id);
  }

  const cloud = getCloudMotionDef(key);
  if (cloud?.extends) {
    const baseCombo = ACTION_COMBOS[cloud.extends];
    if (baseCombo?.length) {
      return [key, ...baseCombo.filter((id) => id !== key)].slice(0, maxMoves);
    }
    return [key, cloud.extends].filter(Boolean);
  }

  return [key];
}

/**
 * Should a single LLM action tag expand into a multi-move combo?
 * @param {string | null | undefined} actionId
 */
export function shouldChainAction(actionId) {
  const key = resolveAction(actionId);
  if (!key || key === "none" || key === "stop") return false;
  if (ACTION_COMBOS[key]?.length) return true;
  if (getCloudMotionDef(key)) return true;
  if (actionLoopsFromCatalog(key)) return true;
  return false;
}

/**
 * Pick a random idle showcase move, avoiding immediate repeat.
 * @param {string | null | undefined} lastMove
 * @param {string[]} [pool]
 */
export function pickIdleShowcase(
  lastMove = null,
  pool = IDLE_SHOWCASE_POOL,
  gender,
) {
  const resolvedPool =
    pool === IDLE_SHOWCASE_POOL && gender
      ? idleShowcasePoolForGender(gender)
      : pool === IDLE_LIFE_CLIP_POOL && gender
        ? idleLifeClipPoolForGender(gender)
        : pool;
  const list = resolvedPool.filter(
    (id) => PLAYABLE_ACTIONS.includes(id) || Boolean(getExtendedActionDef(id)),
  );
  if (!list.length) return "wave";
  const choices = lastMove ? list.filter((id) => id !== lastMove) : list;
  const bucket = choices.length ? choices : list;
  return bucket[Math.floor(Math.random() * bucket.length)];
}

/**
 * Build a longer random showcase (4–6 moves).
 * @param {{ count?: number, seedAction?: string | null }} [opts]
 */
export function buildShowcaseSequence(opts = {}) {
  const count = Math.max(3, Math.min(7, opts.count ?? 5));
  const seed = resolveAction(opts.seedAction);
  /** @type {string[]} */
  const out = [];
  if (seed && seed !== "none" && seed !== "stop") {
    out.push(...buildActionSequence(seed, { maxMoves: 3 }));
  }
  const pool = [...SHOWCASE_SEQUENCE_POOL];
  while (out.length < count) {
    const pick = pickIdleShowcase(out[out.length - 1], pool);
    if (out[out.length - 1] !== pick) out.push(pick);
    else out.push(pool[(out.length + 1) % pool.length]);
  }
  return out.slice(0, count);
}
