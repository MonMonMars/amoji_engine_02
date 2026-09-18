import { verifySession } from "../_lib/auth.mjs";
import { applyProductGrants, findProduct } from "../_lib/iapCatalog.mjs";
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

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "POST")) return;

  const token = bearerToken(req);
  const payload = verifySession(token);
  if (!payload) {
    json(res, 401, { ok: false, error: "Unauthorized" });
    return;
  }

  try {
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
  } catch (err) {
    json(res, 500, { ok: false, error: err?.message || String(err) });
  }
}
