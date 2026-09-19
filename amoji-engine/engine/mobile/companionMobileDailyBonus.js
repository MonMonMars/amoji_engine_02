/**
 * Premium daily coin bonus (client-side, synced via cloud save on hub visit).
 */
import { saveTreatState } from "../companion/companionTreatStore.js";
import { dailyYmd } from "./companionChaseGame.js";

export const PREMIUM_DAILY_CLAIM_KEY = "amoji.mobile.premiumDaily.v1";

/**
 * @param {Record<string, unknown> | null | undefined} entitlements
 * @param {Record<string, unknown>} treatState
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} [storage]
 */
export function tryClaimPremiumDailyCoins(entitlements, treatState, storage = globalThis.localStorage) {
  if (!entitlements?.premium) {
    return { state: treatState, claimed: false, amount: 0 };
  }
  const ymd = dailyYmd();
  let last = "";
  try {
    last = storage?.getItem?.(PREMIUM_DAILY_CLAIM_KEY) || "";
  } catch {
    /* ignore */
  }
  if (last === ymd) {
    return { state: treatState, claimed: false, amount: 0 };
  }
  const amount = Math.max(0, Math.round(Number(entitlements.dailyBonusCoins) || 40));
  const coins = Math.max(0, Math.round(Number(treatState.coins) || 0)) + amount;
  const next = { ...treatState, coins };
  saveTreatState(next, storage);
  try {
    storage?.setItem?.(PREMIUM_DAILY_CLAIM_KEY, ymd);
  } catch {
    /* ignore */
  }
  return { state: next, claimed: true, amount };
}
