import { applyProductGrants, findProduct } from "../_lib/iapCatalog.mjs";
import {
  getUserRecord,
  mergeEntitlements,
  mergeSave,
  patchUserRecord,
} from "../_lib/userStore.mjs";
import { applyCors, handleOptions, json, readJsonBody, requireMethod } from "../_lib/http.mjs";

/**
 * RevenueCat / App Store Server Notifications webhook stub.
 * Configure REVENUECAT_WEBHOOK_SECRET and map app_user_id → Amoji userId.
 */
export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "POST")) return;

  try {
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
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
