/**
 * RevenueCat / StoreKit via Capacitor (native shell only).
 */
import { fetchIapStoreMeta } from "./companionIapCatalog.js";
import { loadAuthSession } from "./companionMobileAuth.js";
import { loadMobileSettings } from "./companionMobileSettings.js";

let purchasesConfigured = false;

/**
 * @returns {Record<string, unknown> | null}
 */
function nativePurchasesPlugin() {
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  const plugin = cap.Plugins?.Purchases;
  return plugin && typeof plugin === "object" ? plugin : null;
}

/**
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function ensureNativePurchasesConfigured(opts = {}) {
  const Purchases = nativePurchasesPlugin();
  if (!Purchases?.configure) return false;
  if (purchasesConfigured) return true;

  const meta = await fetchIapStoreMeta(opts);
  const apiKey = meta?.revenueCat?.publicApiKey;
  if (!apiKey) return false;

  const session = loadAuthSession(opts.storage);
  const appUserID =
    String(session?.userId || session?.sub || session?.token || "guest").trim() ||
    "guest";

  await Purchases.configure({
    apiKey: String(apiKey),
    appUserID,
  });
  purchasesConfigured = true;
  return true;
}

/**
 * @param {{ appleProductId: string, googleProductId?: string }} product
 */
export async function purchaseNativeStoreProduct(product) {
  const Purchases = nativePurchasesPlugin();
  if (!Purchases) throw new Error("Native billing unavailable");

  const storeId =
    globalThis.Capacitor?.getPlatform?.() === "android"
      ? product.googleProductId || product.appleProductId
      : product.appleProductId;

  if (Purchases.purchaseStoreProduct) {
    return Purchases.purchaseStoreProduct({
      product: { identifier: storeId },
    });
  }
  if (Purchases.purchaseProduct) {
    return Purchases.purchaseProduct({ productIdentifier: storeId });
  }
  throw new Error("Purchases plugin missing purchase method");
}

/**
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function registerPushNotificationsIfEnabled(opts = {}) {
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.()) return false;
  const settings = loadMobileSettings(opts.storage);
  if (!settings.notifications) return false;

  const push = cap.Plugins?.PushNotifications;
  if (!push?.requestPermissions || !push?.register) return false;

  const perm = await push.requestPermissions();
  if (perm?.receive !== "granted" && perm?.receive !== "prompt") return false;
  await push.register();
  return true;
}

/**
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function bootNativeShell(opts = {}) {
  try {
    await ensureNativePurchasesConfigured(opts);
  } catch {
    /* RC optional until keys are set */
  }
  try {
    await registerPushNotificationsIfEnabled(opts);
  } catch {
    /* push optional */
  }
}
