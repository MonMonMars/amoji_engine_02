/**
 * Virtual-pet care loop (Pou / TamaPets / cozy Tamagotchi).
 *
 * Always-on needs → time decay → check-in ask → earn coins (chat / pet / daily)
 * → shop → drag-feed → refuse when full or just-ate-the-same → hearts from play.
 * Cozy: meters can hit 0; nobody dies.
 */
import { getTreatItem } from "./companionTreatCatalog.js";

export const COMPANION_PET_CARE_SCHEMA = "amoji.companionPetCare.v1";

export const PET_HUNGRY_BELOW = 31;
export const PET_FULL_AT = 90;
export const PET_LONELY_BELOW = 28;
export const PET_SAME_FOOD_HUNGER = 55;
export const PET_HUNGER_PER_HOUR = 16;
export const PET_HEARTS_PER_HOUR = 7;
export const PET_START_HUNGER = 40;
export const PET_START_HEARTS = 62;
export const PET_DAILY_COINS = 24;
export const PET_CHAT_COINS = 3;
export const PET_CHAT_HUNGER = 1.5;
export const PET_CHAT_HEARTS = 6;
export const PET_TAP_COINS = 1;
export const PET_TAP_HEARTS = 8;
export const PET_SAME_FOOD_MS = 90_000;
export const PET_HUNGRY_ASK_COOLDOWN_MS = 50_000;
export const PET_PIP_COUNT = 5;
export const MS_PER_HOUR = 3_600_000;

const CARE_KEYS = [
  "hunger",
  "hearts",
  "lastTickMs",
  "lastDailyYmd",
  "lastFedItemId",
  "lastFedAt",
  "lastHungryAskAt",
];

/**
 * @param {number} n
 */
export function clampNeed(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * @param {number} [now]
 */
export function dailyYmd(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * @param {number} [now]
 */
export function defaultCareFields(now = Date.now()) {
  return {
    hunger: PET_START_HUNGER,
    hearts: PET_START_HEARTS,
    lastTickMs: now,
    lastDailyYmd: "",
    lastFedItemId: "",
    lastFedAt: 0,
    lastHungryAskAt: 0,
  };
}

/**
 * @param {unknown} raw
 * @param {number} [now]
 */
export function normalizeCareFields(raw, now = Date.now()) {
  const base = defaultCareFields(now);
  if (!raw || typeof raw !== "object") return base;
  const src = /** @type {Record<string, unknown>} */ (raw);
  const lastTick = Math.max(0, Math.round(Number(src.lastTickMs) || 0));
  return {
    hunger: clampNeed(src.hunger ?? base.hunger),
    hearts: clampNeed(src.hearts ?? base.hearts),
    lastTickMs: lastTick > 0 ? lastTick : now,
    lastDailyYmd: typeof src.lastDailyYmd === "string" ? src.lastDailyYmd.slice(0, 10) : "",
    lastFedItemId: typeof src.lastFedItemId === "string" ? src.lastFedItemId : "",
    lastFedAt: Math.max(0, Math.round(Number(src.lastFedAt) || 0)),
    lastHungryAskAt: Math.max(0, Math.round(Number(src.lastHungryAskAt) || 0)),
  };
}

/**
 * @param {Record<string, unknown>} state
 */
export function pickCareFields(state) {
  const care = {};
  for (const key of CARE_KEYS) care[key] = state?.[key];
  return care;
}

/**
 * Real-time decay while the tab is closed (Pou: ~5–6h to empty hunger).
 * @param {object} care
 * @param {number} [now]
 */
export function tickCare(care, now = Date.now()) {
  const current = normalizeCareFields(care, now);
  const elapsed = Math.max(0, now - current.lastTickMs);
  if (elapsed < 250) {
    return { ...current, lastTickMs: now };
  }
  const hours = elapsed / MS_PER_HOUR;
  return {
    ...current,
    hunger: clampNeed(current.hunger - hours * PET_HUNGER_PER_HOUR),
    hearts: clampNeed(current.hearts - hours * PET_HEARTS_PER_HOUR),
    lastTickMs: now,
  };
}

/**
 * @param {object} care
 */
export function isHungry(care) {
  return clampNeed(care?.hunger) < PET_HUNGRY_BELOW;
}

/**
 * @param {object} care
 */
export function isFull(care) {
  return clampNeed(care?.hunger) >= PET_FULL_AT;
}

/**
 * @param {object} care
 */
export function isLonely(care) {
  return clampNeed(care?.hearts) < PET_LONELY_BELOW;
}

/**
 * Tamagotchi-style 5 pips for a 0–100 need.
 * @param {number} value
 * @param {number} [count]
 */
export function needPips(value, count = PET_PIP_COUNT) {
  const n = Math.max(1, Math.round(Number(count) || PET_PIP_COUNT));
  return Math.max(0, Math.min(n, Math.round((clampNeed(value) / 100) * n)));
}

/**
 * Pou meter color band: low &lt;31%, mid &lt;55%, else ok.
 * @param {number} value
 */
export function needTone(value, kind = "hunger") {
  const n = clampNeed(value);
  const low = kind === "hearts" ? PET_LONELY_BELOW : PET_HUNGRY_BELOW;
  if (n < low) return "low";
  if (n < 55) return "mid";
  return "ok";
}

/**
 * Pou: refuse when stuffed, or when the same snack is offered again while not hungry.
 * @param {object} care
 * @param {string} itemId
 * @param {number} [now]
 */
export function canFeedCare(care, itemId, now = Date.now()) {
  const current = normalizeCareFields(care, now);
  if (isFull(current)) return { ok: false, reason: "full" };
  const same =
    itemId &&
    itemId === current.lastFedItemId &&
    now - current.lastFedAt < PET_SAME_FOOD_MS &&
    current.hunger >= PET_SAME_FOOD_HUNGER;
  if (same) return { ok: false, reason: "same" };
  return { ok: true, reason: "" };
}

/**
 * @param {object} care
 * @param {{ id: string, hunger?: number, hearts?: number } | null | undefined} item
 * @param {number} [now]
 */
export function applyFeedCare(care, item, now = Date.now()) {
  const current = tickCare(care, now);
  if (!item?.id) return { ok: false, reason: "unknown", care: current };
  const allowed = canFeedCare(current, item.id, now);
  if (!allowed.ok) return { ok: false, reason: allowed.reason, care: current };
  return {
    ok: true,
    reason: "",
    care: {
      ...current,
      hunger: clampNeed(current.hunger + Number(item.hunger || 0)),
      hearts: clampNeed(current.hearts + Number(item.hearts || 0)),
      lastFedItemId: item.id,
      lastFedAt: now,
    },
  };
}

/**
 * Chat / hang-out restores hearts, spends a little hunger, pays coins (Pou minigame analog).
 * @param {object} care
 * @param {number} coins
 * @param {number} [now]
 */
export function applyChatCare(care, coins, now = Date.now()) {
  const current = tickCare(care, now);
  return {
    care: {
      ...current,
      hunger: clampNeed(current.hunger - PET_CHAT_HUNGER),
      hearts: clampNeed(current.hearts + PET_CHAT_HEARTS),
    },
    coins: Math.max(0, Math.round(Number(coins) || 0) + PET_CHAT_COINS),
    earned: PET_CHAT_COINS,
  };
}

/**
 * Tap / pet — TamaPets heart meter.
 * @param {object} care
 * @param {number} coins
 * @param {number} [now]
 */
export function applyPetCare(care, coins, now = Date.now()) {
  const current = tickCare(care, now);
  return {
    care: {
      ...current,
      hearts: clampNeed(current.hearts + PET_TAP_HEARTS),
    },
    coins: Math.max(0, Math.round(Number(coins) || 0) + PET_TAP_COINS),
    earned: PET_TAP_COINS,
  };
}

/**
 * Daily allowance (Pou login coins).
 * @param {object} care
 * @param {number} coins
 * @param {number} [now]
 */
export function claimDailyCoins(care, coins, now = Date.now()) {
  const current = tickCare(care, now);
  const today = dailyYmd(now);
  if (current.lastDailyYmd === today) {
    return { claimed: false, coins: Math.max(0, Math.round(Number(coins) || 0)), care: current, earned: 0 };
  }
  return {
    claimed: true,
    earned: PET_DAILY_COINS,
    coins: Math.max(0, Math.round(Number(coins) || 0) + PET_DAILY_COINS),
    care: { ...current, lastDailyYmd: today },
  };
}

/**
 * @param {object} care
 * @param {boolean} [isEnglish]
 */
export function thoughtForCare(care, isEnglish = false) {
  if (isHungry(care)) {
    return isEnglish ? "I'm hungry…" : "肚餓呀…";
  }
  if (isLonely(care)) {
    return isEnglish ? "Play with me?" : "陪吓我吖～";
  }
  return "";
}

/**
 * @param {string} reason
 * @param {boolean} [isEnglish]
 */
export function refuseLine(reason, isEnglish = false) {
  if (reason === "same") {
    return isEnglish ? "I just had that — something else?" : "啱啱先食過呢樣，換第二樣啦？";
  }
  return isEnglish ? "I'm full! Later, okay?" : "飽喇！一陣再食啦。";
}

/**
 * @param {object} care
 * @param {boolean} [isEnglish]
 */
export function hungryAskLine(care, isEnglish = false) {
  if (!isHungry(care)) return "";
  return isEnglish ? "I'm hungry… got a snack for me?" : "我肚餓呀…有冇嘢食？";
}

/**
 * @param {object} care
 * @param {boolean} [isEnglish]
 */
export function lonelyAskLine(care, isEnglish = false) {
  if (!isLonely(care)) return "";
  return isEnglish ? "Come play with me for a bit?" : "陪吓我吖，好唔好？";
}

/**
 * Boot check-in: daily coins, then hungry/lonely voice instead of a generic hello.
 * @param {object} care
 * @param {number} coins
 * @param {{ isEnglish?: boolean, now?: number }} [opts]
 */
export function checkInCare(care, coins, opts = {}) {
  const now = opts.now ?? Date.now();
  const english = Boolean(opts.isEnglish);
  const daily = claimDailyCoins(care, coins, now);
  let next = daily.care;
  let askAt = next.lastHungryAskAt;
  let mood = "ok";
  let line = "";
  if (isHungry(next)) {
    mood = "hungry";
    line = hungryAskLine(next, english);
    askAt = now;
  } else if (isLonely(next)) {
    mood = "lonely";
    line = lonelyAskLine(next, english);
  }
  return {
    mood,
    line,
    thought: thoughtForCare(next, english),
    dailyCoins: daily.earned,
    claimedDaily: daily.claimed,
    coins: daily.coins,
    care: { ...next, lastHungryAskAt: askAt },
  };
}

/**
 * @param {object} care
 * @param {boolean} [isEnglish]
 * @param {number} [now]
 */
export function maybeHungryAsk(care, isEnglish = false, now = Date.now()) {
  const current = tickCare(care, now);
  if (!isHungry(current)) return { asked: false, care: current, line: "", thought: thoughtForCare(current, isEnglish) };
  if (now - current.lastHungryAskAt < PET_HUNGRY_ASK_COOLDOWN_MS) {
    return { asked: false, care: current, line: "", thought: thoughtForCare(current, isEnglish) };
  }
  return {
    asked: true,
    care: { ...current, lastHungryAskAt: now },
    line: hungryAskLine(current, isEnglish),
    thought: thoughtForCare(current, isEnglish),
  };
}

/**
 * Consume from bag only after the pet accepts the food.
 * @param {object} state
 * @param {string} itemId
 * @param {(s: object, id: string) => { ok: boolean, reason?: string, state: object }} consumeFn
 * @param {number} [now]
 */
export function tryFeedTreat(state, itemId, consumeFn, now = Date.now()) {
  const item = getTreatItem(itemId);
  const ticked = tickCare(state, now);
  const merged = { ...state, ...ticked };
  if (!item) return { ok: false, reason: "unknown", state: merged, item: null };
  const allowed = canFeedCare(merged, item.id, now);
  if (!allowed.ok) {
    return { ok: false, reason: allowed.reason, state: merged, item };
  }
  const consumed = consumeFn(merged, item.id);
  if (!consumed.ok) {
    return { ok: false, reason: consumed.reason || "empty", state: consumed.state, item };
  }
  const fed = applyFeedCare(consumed.state, item, now);
  return {
    ok: true,
    reason: "",
    item,
    state: { ...consumed.state, ...fed.care },
  };
}
