/**
 * Coins + bag for companion treats. Persists in localStorage.
 */
import { TREAT_ITEM_IDS, getTreatItem } from "./companionTreatCatalog.js";

export const COMPANION_TREAT_STORE_SCHEMA = "amoji.companionTreatStore.v1";
export const TREAT_STORAGE_KEY = "amoji.treats.v1";
export const TREAT_START_COINS = 80;

/** @typedef {{ coins: number, bag: Record<string, number> }} TreatState */

/**
 * @returns {TreatState}
 */
export function defaultTreatState() {
  return {
    coins: TREAT_START_COINS,
    bag: { cake: 1 },
  };
}

/**
 * @param {unknown} raw
 * @returns {TreatState}
 */
export function normalizeTreatState(raw) {
  const base = defaultTreatState();
  if (!raw || typeof raw !== "object") return base;
  const coins = Math.max(0, Math.round(Number(raw.coins)));
  const bag = {};
  const src = raw.bag && typeof raw.bag === "object" ? raw.bag : {};
  for (const id of TREAT_ITEM_IDS) {
    const n = Math.max(0, Math.round(Number(src[id]) || 0));
    if (n > 0) bag[id] = n;
  }
  return {
    coins: Number.isFinite(coins) ? coins : base.coins,
    bag,
  };
}

/**
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 */
export function loadTreatState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TREAT_STORAGE_KEY);
    if (!raw) return defaultTreatState();
    return normalizeTreatState(JSON.parse(raw));
  } catch {
    return defaultTreatState();
  }
}

/**
 * @param {TreatState} state
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 */
export function saveTreatState(state, storage = globalThis.localStorage) {
  const next = normalizeTreatState(state);
  try {
    storage?.setItem?.(TREAT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

/**
 * @param {TreatState} state
 * @param {string} itemId
 */
export function bagCount(state, itemId) {
  return Math.max(0, Math.round(Number(state?.bag?.[itemId]) || 0));
}

/**
 * @param {TreatState} state
 */
export function bagTotal(state) {
  return TREAT_ITEM_IDS.reduce((sum, id) => sum + bagCount(state, id), 0);
}

/**
 * @param {TreatState} state
 * @param {string} itemId
 * @returns {{ ok: true, state: TreatState } | { ok: false, reason: "unknown" | "broke", state: TreatState }}
 */
export function buyTreat(state, itemId) {
  const item = getTreatItem(itemId);
  const current = normalizeTreatState(state);
  if (!item) return { ok: false, reason: "unknown", state: current };
  if (current.coins < item.price) {
    return { ok: false, reason: "broke", state: current };
  }
  const bag = { ...current.bag };
  bag[item.id] = bagCount(current, item.id) + 1;
  return {
    ok: true,
    state: { coins: current.coins - item.price, bag },
  };
}

/**
 * @param {TreatState} state
 * @param {string} itemId
 * @returns {{ ok: true, state: TreatState } | { ok: false, reason: "unknown" | "empty", state: TreatState }}
 */
export function consumeTreat(state, itemId) {
  const item = getTreatItem(itemId);
  const current = normalizeTreatState(state);
  if (!item) return { ok: false, reason: "unknown", state: current };
  const have = bagCount(current, item.id);
  if (have < 1) return { ok: false, reason: "empty", state: current };
  const bag = { ...current.bag };
  if (have === 1) delete bag[item.id];
  else bag[item.id] = have - 1;
  return { ok: true, state: { coins: current.coins, bag } };
}
