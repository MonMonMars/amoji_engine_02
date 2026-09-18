import { verifySession } from "../_lib/auth.mjs";
import { IAP_CATALOG_SCHEMA, IAP_PRODUCTS, applyProductGrants, findProduct } from "../_lib/iapCatalog.mjs";
import {
  getUserRecord,
  mergeEntitlements,
  mergeSave,
  patchUserRecord,
} from "../_lib/userStore.mjs";
import {
  applyCors,
  bearerToken,
  handleOptions,
  json,
  readJsonBody,
  requireMethod,
} from "../_lib/http.mjs";

async function handleProducts(_req, res) {
  if (!requireMethod(_req, res, "GET")) return;
  json(res, 200, {
    ok: true,
    schema: IAP_CATALOG_SCHEMA,
    products: IAP_PRODUCTS,
    revenueCat: {
      enabled: Boolean(process.env.REVENUECAT_PUBLIC_API_KEY),
      publicApiKey: process.env.REVENUECAT_PUBLIC_API_KEY || null,
      note: "Use @revenuecat/purchases-capacitor in the mobile shell for StoreKit / Play Billing.",
    },
  });
}

async function handleVerify(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  const body = readJsonBody(req);
  const productId = body?.productId || body?.sku || "";
  const product = findProduct(productId);
  if (!product) {
    json(res, 400, { ok: false, error: "Unknown product" });
    return;
  }

  const platform = body?.platform || "ios";
  const receipt = body?.receipt || body?.purchaseToken || body?.transactionId || "";
  if (!receipt && process.env.AMOJI_IAP_DEV !== "1") {
    json(res, 400, { ok: false, error: "Missing purchase receipt" });
    return;
  }

  const record = await getUserRecord(payload.sub);
  let entitlements = applyProductGrants(record.entitlements || {}, product);
  entitlements = mergeEntitlements(record.entitlements, entitlements);

  let save = record.save;
  if (typeof product.grants?.coins === "number") {
    const treats = save?.treats && typeof save.treats === "object" ? save.treats : { coins: 80, bag: {} };
    save = mergeSave(save, {
      treats: {
        ...treats,
        coins: (Number(treats.coins) || 0) + product.grants.coins,
      },
    });
  }

  const next = await patchUserRecord(payload.sub, { entitlements, save });
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

async function handleWebhook(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET || "";
  const headerSecret = req.headers?.["authorization"] || req.headers?.Authorization || "";
  if (secret && headerSecret !== `Bearer ${secret}`) {
    json(res, 401, { ok: false, error: "Invalid webhook secret" });
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

  const product = findProduct(productId);
  if (!product) {
    json(res, 200, { ok: true, ignored: true, reason: "unknown product" });
    return;
  }

  const record = await getUserRecord(userId);
  let entitlements = applyProductGrants(record.entitlements || {}, product);
  entitlements = mergeEntitlements(record.entitlements, entitlements);

  let save = record.save;
  if (typeof product.grants?.coins === "number") {
    const treats =
      save?.treats && typeof save.treats === "object" ? save.treats : { coins: 80, bag: {} };
    save = mergeSave(save, {
      treats: {
        ...treats,
        coins: (Number(treats.coins) || 0) + product.grants.coins,
      },
    });
  }

  await patchUserRecord(userId, { entitlements, save });
  json(res, 200, { ok: true, userId, productId: product.id });
}

/** @type {Record<string, (req: import("http").IncomingMessage, res: import("http").ServerResponse) => Promise<void>>} */
const ROUTES = {
  products: handleProducts,
  verify: handleVerify,
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
