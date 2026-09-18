/**
 * Action choreography — combos, showcase sequences, idle variety.
 */
import { resolveAction } from "./companionActionMotion.js";
import { actionLoopsFromCatalog, PLAYABLE_ACTIONS } from "./companionActionCatalog.js";
import { getExtendedActionDef } from "./companionMotionLibrary.js";
import { getCloudMotionDef } from "./motionPackData.mjs";

export const COMPANION_ACTION_CHOREOGRAPHY_SCHEMA =
  "amoji.companionActionChoreography.v1";

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

/**
 * Default idle life — planted breath plus one-shot social clips from the
 * hosted VRMA library (wave=Goodbye, thinking=Thinking, stretch=Relax).
 * Not the huge showcase pool (kungfu/zombie/dance) and not looping Relax.
 */
/**
 * Quiet between-turn idle — subtle standing clips only (no wave/dance/cheer).
 * Most idle time stays on procedural planted breath + look/comb beats.
 */
export const IDLE_LIFE_CLIP_POOL = Object.freeze([
  "stretch",
  "shy",
  "thinking",
  "sleep",
  "shrug",
  "nod",
]);

/** Large idle rotation pool — quiet companion moments between turns. */
export const IDLE_SHOWCASE_POOL = Object.freeze([
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
  "run",
  "rock",
  "drink",
  "eat",
  "sleep",
  "facepalm",
  "headshake",
  "jump",
  "kungfu",
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
export function pickIdleShowcase(lastMove = null, pool = IDLE_SHOWCASE_POOL) {
  const list = pool.filter(
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
