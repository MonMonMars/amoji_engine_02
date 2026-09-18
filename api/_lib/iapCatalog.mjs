export const IAP_CATALOG_SCHEMA = "amoji.iapCatalog.v1";

/** @typedef {{
 *   id: string,
 *   type: "consumable" | "non_consumable" | "subscription",
 *   appleProductId: string,
 *   googleProductId: string,
 *   priceUsd: number,
 *   coins?: number,
 *   title: { en: string, yue: string },
 *   blurb: { en: string, yue: string },
 *   grants: Record<string, unknown>,
 * }} IapProduct */

/** @type {readonly IapProduct[]} */
export const IAP_PRODUCTS = Object.freeze([
  {
    id: "coins_small",
    type: "consumable",
    appleProductId: "com.amoji.coins.small",
    googleProductId: "coins_small",
    priceUsd: 0.99,
    coins: 120,
    title: { en: "Coin Pouch", yue: "小袋金幣" },
    blurb: { en: "120 coins for treats & shop", yue: "120 金幣買小食同商店" },
    grants: { coins: 120 },
  },
  {
    id: "coins_medium",
    type: "consumable",
    appleProductId: "com.amoji.coins.medium",
    googleProductId: "coins_medium",
    priceUsd: 4.99,
    coins: 750,
    title: { en: "Coin Bag", yue: "金幣袋" },
    blurb: { en: "750 coins — best for daily play", yue: "750 金幣，日常玩最抵" },
    grants: { coins: 750 },
  },
  {
    id: "premium_monthly",
    type: "subscription",
    appleProductId: "com.amoji.premium.monthly",
    googleProductId: "premium_monthly",
    priceUsd: 6.99,
    title: { en: "Premium Heart", yue: "Premium 心動" },
    blurb: {
      en: "Unlimited chat, chase boosts, daily coins",
      yue: "無限傾偈、追逐加成、每日金幣",
    },
    grants: { premium: true, unlimitedChat: true, dailyBonusCoins: 40 },
  },
  {
    id: "character_pack_idol",
    type: "non_consumable",
    appleProductId: "com.amoji.characters.idol",
    googleProductId: "character_pack_idol",
    priceUsd: 9.99,
    title: { en: "Idol Character Pack", yue: "偶像角色包" },
    blurb: { en: "Unlock chase variants + stage outfits", yue: "解鎖追逐變體同舞台衫" },
    grants: { characterPackIds: ["idol_pack"] },
  },
  {
    id: "remove_ads",
    type: "non_consumable",
    appleProductId: "com.amoji.remove.ads",
    googleProductId: "remove_ads",
    priceUsd: 2.99,
    title: { en: "Cozy Pass", yue: "舒適通行證" },
    blurb: { en: "No rewarded ads in chase mode", yue: "追逐模式免睇廣告" },
    grants: { noAds: true },
  },
]);

/**
 * @param {string} productId
 */
export function findProduct(productId) {
  return IAP_PRODUCTS.find(
    (p) =>
      p.id === productId ||
      p.appleProductId === productId ||
      p.googleProductId === productId,
  );
}

/**
 * Apply product grants onto entitlements + optional coin credit.
 * @param {Record<string, unknown>} entitlements
 * @param {IapProduct} product
 */
export function applyProductGrants(entitlements, product) {
  const next = { ...entitlements };
  const grants = product.grants || {};
  if (grants.premium) next.premium = true;
  if (grants.unlimitedChat) next.unlimitedChat = true;
  if (grants.noAds) next.noAds = true;
  if (Array.isArray(grants.characterPackIds)) {
    next.characterPackIds = Array.from(
      new Set([...(next.characterPackIds || []), ...grants.characterPackIds]),
    );
  }
  if (product.type === "subscription") {
    const expires = new Date();
    expires.setDate(expires.getDate() + 32);
    next.subscriptionExpiresAt = expires.toISOString();
  }
  if (typeof grants.coins === "number") {
    next.coinPacksGranted = (Number(next.coinPacksGranted) || 0) + grants.coins;
  }
  return next;
}
