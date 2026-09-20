import { verifySession } from "../_lib/auth.mjs";
import { IAP_CATALOG_SCHEMA, IAP_PRODUCTS } from "../_lib/iapCatalog.mjs";
import { fulfillProductPurchase, resolveProduct } from "../_lib/iapFulfillment.mjs";
import {
  applyApiProtection,
  assertPurchaseReceiptAllowed,
  auditSecurityEvent,
  isReceiptAlreadyFulfilled,
  isReceiptReplay,
  receiptFingerprint,
  validateProductionSecrets,
} from "../_lib/security.mjs";
import { getUserRecord } from "../_lib/userStore.mjs";
import {
  createCheckoutSession,
  retrieveCheckoutSession,
  stripeEnabled,
} from "../_lib/stripeCheckout.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  readJsonBody,
  requireMethod,
} from "../_lib/http.mjs";

validateProductionSecrets().forEach((w) => auditSecurityEvent("config_warning", { missing: w }));

async function handleProducts(_req, res) {
  if (!requireMethod(_req, res, "GET")) return;
  json(res, 200, {
    ok: true,
    schema: IAP_CATALOG_SCHEMA,
    products: IAP_PRODUCTS,
    payments: {
      stripe: stripeEnabled(),
      devVerify: process.env.AMOJI_IAP_DEV === "1",
    },
    revenueCat: {
      enabled: Boolean(process.env.REVENUECAT_PUBLIC_API_KEY),
      publicApiKey: process.env.REVENUECAT_PUBLIC_API_KEY || null,
      note: "Use @revenuecat/purchases-capacitor in the mobile shell for StoreKit / Play Billing.",
    },
  });
}

async function handleVerify(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    requireOrigin: true,
    rateLimit: { key: "iap-verify", max: 20, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 403, { ok: false, error: guard.error, retryAfterMs: guard.retryAfterMs });
    return;
  }

  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  const body = readJsonBody(req);
  const productId = body?.productId || body?.sku || "";
  const product = resolveProduct(productId);
  if (!product) {
    json(res, 400, { ok: false, error: "Unknown product" });
    return;
  }

  const platform = body?.platform || "ios";
  const receipt = body?.receipt || body?.purchaseToken || body?.transactionId || "";
  const receiptCheck = assertPurchaseReceiptAllowed(receipt);
  if (!receiptCheck.ok) {
    auditSecurityEvent("purchase_rejected", { userId: payload.sub, reason: receiptCheck.error });
    json(res, 400, { ok: false, error: receiptCheck.error });
    return;
  }

  const fingerprint = receiptFingerprint(receipt, product.id, payload.sub);
  if (isReceiptReplay(fingerprint, payload.sub)) {
    auditSecurityEvent("receipt_replay", { userId: payload.sub, productId: product.id });
    json(res, 409, { ok: false, error: "Receipt already used by another account" });
    return;
  }
  if (isReceiptAlreadyFulfilled(fingerprint, payload.sub)) {
    const record = await getUserRecord(payload.sub);
    json(res, 200, {
      ok: true,
      verified: true,
      alreadyFulfilled: true,
      platform,
      productId: product.id,
      entitlements: record.entitlements,
      save: record.save,
    });
    return;
  }

  const next = await fulfillProductPurchase(payload.sub, product, {
    receipt,
    source: `verify:${platform}`,
  });

  auditSecurityEvent("purchase_fulfilled", {
    userId: payload.sub,
    productId: product.id,
    platform,
  });

  json(res, 200, {
    ok: true,
    verified: true,
    platform,
    productId: product.id,
    entitlements: next.entitlements,
    save: next.save,
    devMode: process.env.AMOJI_IAP_DEV === "1",
  });
}

async function handleCheckout(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    requireOrigin: true,
    rateLimit: { key: "iap-checkout", max: 15, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 403, { ok: false, error: guard.error });
    return;
  }
  if (!stripeEnabled()) {
    json(res, 503, { ok: false, error: "Web checkout not configured (set STRIPE_SECRET_KEY)" });
    return;
  }

  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  const body = readJsonBody(req);
  const productId = body?.productId || "";
  const product = resolveProduct(productId);
  if (!product) {
    json(res, 400, { ok: false, error: "Unknown product" });
    return;
  }

  const origin = body?.returnOrigin || body?.origin || "";
  const base = String(origin || process.env.AMOJI_PUBLIC_URL || "https://temporary-rushing-oxygen-ok5jzhd.vercel.app").replace(
    /\/$/,
    "",
  );
  const returnPath = body?.returnPath || "/play";
  const successUrl = `${base}${returnPath}?iap=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}${returnPath}?iap=cancel`;

  const session = await createCheckoutSession({
    productId: product.id,
    userId: payload.sub,
    priceUsd: product.priceUsd,
    titleEn: product.title?.en || product.id,
    successUrl,
    cancelUrl,
  });

  json(res, 200, {
    ok: true,
    checkoutUrl: session.url,
    sessionId: session.id,
    productId: product.id,
  });
}

async function handleStripeConfirm(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    requireOrigin: true,
    rateLimit: { key: "iap-stripe-confirm", max: 20, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 403, { ok: false, error: guard.error });
    return;
  }
  if (!stripeEnabled()) {
    json(res, 503, { ok: false, error: "Stripe not configured" });
    return;
  }

  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  const body = readJsonBody(req);
  const sessionId = body?.sessionId || body?.session_id || "";
  if (!sessionId) {
    json(res, 400, { ok: false, error: "Missing sessionId" });
    return;
  }

  const session = await retrieveCheckoutSession(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    json(res, 402, { ok: false, error: "Payment not completed" });
    return;
  }

  const metaUser = session.metadata?.userId || session.client_reference_id || "";
  if (metaUser && metaUser !== payload.sub) {
    auditSecurityEvent("stripe_user_mismatch", { expected: payload.sub, got: metaUser });
    json(res, 403, { ok: false, error: "Checkout session does not match signed-in user" });
    return;
  }

  const productId = session.metadata?.productId || "";
  const product = resolveProduct(productId);
  if (!product) {
    json(res, 400, { ok: false, error: "Unknown product in session" });
    return;
  }

  const receipt = `stripe_${sessionId}`;
  const fingerprint = receiptFingerprint(receipt, product.id, payload.sub);
  if (isReceiptAlreadyFulfilled(fingerprint, payload.sub)) {
    const record = await getUserRecord(payload.sub);
    json(res, 200, {
      ok: true,
      verified: true,
      alreadyFulfilled: true,
      productId: product.id,
      entitlements: record.entitlements,
      save: record.save,
    });
    return;
  }
  if (isReceiptReplay(fingerprint, payload.sub)) {
    json(res, 409, { ok: false, error: "Receipt already used by another account" });
    return;
  }

  const next = await fulfillProductPurchase(payload.sub, product, {
    receipt,
    source: "stripe",
  });

  json(res, 200, {
    ok: true,
    verified: true,
    productId: product.id,
    entitlements: next.entitlements,
    save: next.save,
    stripeSessionId: sessionId,
  });
}

async function handleWebhook(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const guard = applyApiProtection(req, res, {
    rateLimit: { key: "iap-webhook", max: 120, windowMs: 60_000 },
  });
  if (!guard.ok) {
    json(res, guard.status || 429, { ok: false, error: guard.error });
    return;
  }

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET || "";
  const headerSecret = req.headers?.["authorization"] || req.headers?.Authorization || "";
  if (secret) {
    if (headerSecret !== `Bearer ${secret}`) {
      auditSecurityEvent("webhook_auth_failed", {});
      json(res, 401, { ok: false, error: "Invalid webhook secret" });
      return;
    }
  } else if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    auditSecurityEvent("webhook_unprotected", {});
    json(res, 503, { ok: false, error: "REVENUECAT_WEBHOOK_SECRET required in production" });
    return;
  }

  const body = readJsonBody(req);
  const event = body?.event || body;
  const userId =
    event?.app_user_id ||
    event?.subscriber?.app_user_id ||
    body?.app_user_id ||
    "";
  const productId =
    event?.product_id ||
    event?.new_product_id ||
    body?.product_id ||
    "";

  if (!userId || !productId) {
    json(res, 200, { ok: true, ignored: true, reason: "missing user or product" });
    return;
  }

  const product = resolveProduct(productId);
  if (!product) {
    json(res, 200, { ok: true, ignored: true, reason: "unknown product" });
    return;
  }

  await fulfillProductPurchase(userId, product, {
    receipt: `rc_webhook_${event?.id || Date.now()}`,
    source: "revenuecat_webhook",
  });
  json(res, 200, { ok: true, userId, productId: product.id });
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  products: handleProducts,
  verify: handleVerify,
  checkout: handleCheckout,
  "stripe-confirm": handleStripeConfirm,
  webhook: handleWebhook,
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);

  const action = String(req.query?.action || "").toLowerCase();
  const route = ROUTES[action];
  if (!route) {
    json(res, 404, { ok: false, error: "Unknown IAP action" });
    return;
  }

  try {
    await route(req, res);
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
