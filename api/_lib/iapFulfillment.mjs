import { applyProductGrants, findProduct } from "./iapCatalog.mjs";
import {
  getUserRecord,
  mergeEntitlements,
  mergeSave,
  patchUserRecord,
} from "./userStore.mjs";
import { markReceiptUsed, receiptFingerprint } from "./security.mjs";

/**
 * Grant a catalog product to a user (coins, premium, packs).
 * @param {string} userId
 * @param {import("./iapCatalog.mjs").IapProduct} product
 * @param {{ receipt?: string, source?: string }} [meta]
 */
export async function fulfillProductPurchase(userId, product, meta = {}) {
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

  const ledger = Array.isArray(record.purchaseLedger) ? [...record.purchaseLedger] : [];
  ledger.push({
    productId: product.id,
    at: new Date().toISOString(),
    source: meta.source || "verify",
    receiptHash: meta.receipt
      ? receiptFingerprint(meta.receipt, product.id, userId).slice(0, 16)
      : null,
  });

  const next = await patchUserRecord(userId, { entitlements, save, purchaseLedger: ledger.slice(-200) });
  if (meta.receipt) {
    markReceiptUsed(receiptFingerprint(meta.receipt, product.id, userId), userId);
  }
  return next;
}

/**
 * @param {string} productId
 */
export function resolveProduct(productId) {
  return findProduct(productId);
}
