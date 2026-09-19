/**
 * Client-side IAP helpers — product fetch + purchase verify (RevenueCat / dev stub).
 */
import { apiFetch, authHeaders, loadAuthSession } from "./companionMobileAuth.js";

export const COMPANION_IAP_CATALOG_SCHEMA = "amoji.companionIapCatalog.v1";

/**
 * @param {{ baseUrl?: string }} [opts]
 */
export async function fetchIapStoreMeta(opts = {}) {
  const data = await apiFetch("/api/iap/products", {
    method: "GET",
    baseUrl: opts.baseUrl,
  });
  return {
    products: data?.products || [],
    revenueCat: data?.revenueCat || { enabled: false, publicApiKey: null },
  };
}

export async function fetchIapProducts(opts = {}) {
  const meta = await fetchIapStoreMeta(opts);
  return meta.products;
}

/**
 * @param {string} productId
 * @param {{
 *   platform?: "ios" | "android",
 *   receipt?: string,
 *   transactionId?: string,
 *   baseUrl?: string,
 *   storage?: Storage,
 *   token?: string,
 * }} [opts]
 */
export async function verifyPurchase(productId, opts = {}) {
  const session = loadAuthSession(opts.storage);
  const token = opts.token || session?.token;
  if (!token) throw new Error("Sign in required for purchases");
  return apiFetch("/api/iap/verify", {
    method: "POST",
    baseUrl: opts.baseUrl,
    headers: authHeaders(token),
    body: JSON.stringify({
      productId,
      platform: opts.platform || "ios",
      receipt: opts.receipt || opts.transactionId || "dev_receipt",
      transactionId: opts.transactionId,
    }),
  });
}

/**
 * Dev / sandbox purchase when native StoreKit is unavailable (browser QA).
 * @param {string} productId
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function purchaseDevStub(productId, opts = {}) {
  return verifyPurchase(productId, {
    ...opts,
    receipt: `dev_${productId}_${Date.now()}`,
    platform: "ios",
  });
}

/**
 * @param {{ en: string, yue: string }} field
 * @param {boolean} isEnglish
 */
export function iapLabel(field, isEnglish) {
  if (!field) return "";
  return isEnglish ? field.en : field.yue;
}
