/**
 * In-app shop for web companion — guest auth, native IAP verify, Stripe checkout, dev stub.
 */
import {
  fetchIapStoreMeta,
  iapLabel,
  mergeSessionEntitlements,
  purchaseDevStub,
  verifyPurchase,
} from "../mobile/companionIapCatalog.js";
import {
  ensureNativePurchasesConfigured,
  purchaseNativeStoreProduct,
} from "../mobile/companionNativePurchases.js";
import {
  apiFetch,
  authHeaders,
  loadAuthSession,
  restoreSession,
  signInGuest,
} from "../mobile/companionMobileAuth.js";

export const COMPANION_WEB_SHOP_SCHEMA = "amoji.companionWebShop.v1";

/**
 * @param {boolean} [isEnglish]
 */
export function buildShopChromeLabels(isEnglish = false) {
  const en = Boolean(isEnglish);
  return {
    sectionTitle: en ? "Shop & services" : "商店同服務",
    sectionHint: en
      ? "Premium chat, coin packs, and character unlocks. Purchases sync to your account."
      : "Premium 傾偈、金幣包同角色解鎖。購買會同步去你嘅帳戶。",
    signIn: en ? "Sign in to buy" : "登入先可以買",
    buy: en ? "Buy" : "購買",
    loading: en ? "Loading shop…" : "載入商店…",
    premiumActive: en ? "Premium active ✨" : "Premium 已啟用 ✨",
    complete: en ? "Purchase complete!" : "購買成功！",
    stripeNote: en ? "Pay with card (Stripe)" : "信用卡付款（Stripe）",
    nativeNote: en ? "App Store / Play Billing" : "App Store / Play 付款",
    devNote: en ? "Browser test mode" : "瀏覽器測試模式",
  };
}

/**
 * @param {{ priceUsd?: number }} product
 */
export function formatProductPrice(product) {
  const n = Number(product?.priceUsd);
  if (!Number.isFinite(n)) return "";
  return `$${n.toFixed(2)}`;
}

/**
 * @param {{ baseUrl?: string, storage?: Storage }} [opts]
 */
export async function ensureShopAuthSession(opts = {}) {
  const restored = await restoreSession(opts);
  if (restored?.token) return restored;
  return signInGuest(opts);
}

/**
 * Complete Stripe return URL (?iap=success&session_id=…).
 * @param {{ storage?: Storage, baseUrl?: string, searchParams?: URLSearchParams }} [opts]
 */
export async function maybeCompleteStripeReturn(opts = {}) {
  const params =
    opts.searchParams ||
    (typeof globalThis.location !== "undefined"
      ? new URLSearchParams(globalThis.location.search)
      : null);
  if (!params || params.get("iap") !== "success") return null;
  const sessionId = params.get("session_id");
  if (!sessionId) return null;

  const session = await ensureShopAuthSession(opts);
  const result = await apiFetch("/api/iap/stripe-confirm", {
    method: "POST",
    baseUrl: opts.baseUrl,
    headers: authHeaders(session.token),
    body: JSON.stringify({ sessionId }),
  });
  mergeSessionEntitlements(result?.entitlements, opts.storage);
  return result;
}

/**
 * @param {HTMLElement | null | undefined} container
 * @param {{
 *   isEnglish?: boolean,
 *   toast?: (msg: string) => void,
 *   onEntitlementsUpdated?: (entitlements: Record<string, unknown>) => void,
 *   baseUrl?: string,
 *   storage?: Storage,
 * }} [opts]
 */
export async function mountCompanionShop(container, opts = {}) {
  if (!container) return;
  const en = opts.isEnglish !== false;
  const labels = buildShopChromeLabels(en);
  const storage = opts.storage || globalThis.localStorage;
  container.innerHTML = `<p class="settings-hint shop-loading">${labels.loading}</p>`;

  let products = [];
  let stripeEnabled = false;
  let devVerify = false;
  try {
    const meta = await fetchIapStoreMeta({ baseUrl: opts.baseUrl });
    products = meta.products || [];
    stripeEnabled = Boolean(meta.payments?.stripe);
    devVerify = Boolean(meta.payments?.devVerify);
  } catch (err) {
    container.innerHTML = `<p class="settings-hint shop-error">${err?.message || String(err)}</p>`;
    return;
  }

  const session = await ensureShopAuthSession({ baseUrl: opts.baseUrl, storage });
  const premium = session?.entitlements?.premium;

  container.innerHTML = "";
  if (premium) {
    const badge = document.createElement("p");
    badge.className = "settings-hint shop-premium-badge";
    badge.textContent = labels.premiumActive;
    container.appendChild(badge);
  }

  const list = document.createElement("div");
  list.className = "companion-shop-list";
  container.appendChild(list);

  for (const product of products) {
    const row = document.createElement("div");
    row.className = "companion-shop-item";
    row.innerHTML = `
      <div class="companion-shop-item__copy">
        <strong class="companion-shop-item__title">${iapLabel(product.title, en)}</strong>
        <p class="settings-hint companion-shop-item__blurb">${iapLabel(product.blurb, en)}</p>
        <p class="companion-shop-item__price">${formatProductPrice(product)}</p>
      </div>
      <button type="button" class="btn-secondary companion-shop-buy" data-product-id="${product.id}">${labels.buy}</button>
    `;
    list.appendChild(row);
  }

  const foot = document.createElement("p");
  foot.className = "settings-hint companion-shop-foot";
  foot.textContent = stripeEnabled ? labels.stripeNote : devVerify ? labels.devNote : labels.nativeNote;
  container.appendChild(foot);

  list.addEventListener("click", async (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest("[data-product-id]") : null;
    if (!btn || btn.hasAttribute("disabled")) return;
    const productId = btn.getAttribute("data-product-id");
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    btn.setAttribute("disabled", "true");
    try {
      const auth = await ensureShopAuthSession({ baseUrl: opts.baseUrl, storage });
      if (!auth?.token) {
        opts.toast?.(labels.signIn);
        return;
      }

      const nativeReady = await ensureNativePurchasesConfigured({ baseUrl: opts.baseUrl, storage });
      if (nativeReady && product?.appleProductId) {
        const result = await purchaseNativeStoreProduct(product);
        const tx =
          result?.transactionIdentifier ||
          result?.customerInfo?.originalAppUserId ||
          result?.productIdentifier ||
          product.appleProductId;
        const verified = await verifyPurchase(productId, {
          baseUrl: opts.baseUrl,
          receipt: tx,
          transactionId: tx,
          platform: globalThis.Capacitor?.getPlatform?.() === "android" ? "android" : "ios",
          storage,
        });
        opts.onEntitlementsUpdated?.(verified?.entitlements || {});
      } else if (stripeEnabled) {
        const checkout = await apiFetch("/api/iap/checkout", {
          method: "POST",
          baseUrl: opts.baseUrl,
          headers: authHeaders(auth.token),
          body: JSON.stringify({
            productId,
            returnOrigin: globalThis.location?.origin,
            returnPath: globalThis.location?.pathname || "/play",
          }),
        });
        if (checkout?.checkoutUrl) {
          globalThis.location.href = checkout.checkoutUrl;
          return;
        }
      } else {
        const verified = await purchaseDevStub(productId, { baseUrl: opts.baseUrl, storage });
        opts.onEntitlementsUpdated?.(verified?.entitlements || {});
      }
      opts.toast?.(labels.complete);
      await mountCompanionShop(container, opts);
    } catch (err) {
      opts.toast?.(err?.message || String(err));
    } finally {
      btn.removeAttribute("disabled");
    }
  });
}
