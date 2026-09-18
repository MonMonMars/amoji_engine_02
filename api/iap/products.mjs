import { IAP_CATALOG_SCHEMA, IAP_PRODUCTS } from "../_lib/iapCatalog.mjs";
import { applyCors, handleOptions, json, requireMethod } from "../_lib/http.mjs";

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(res);
  if (!requireMethod(req, res, "GET")) return;

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
