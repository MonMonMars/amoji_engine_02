/**
 * Pet-style treats the user can buy and feed to the companion.
 */

export const COMPANION_TREAT_CATALOG_SCHEMA = "amoji.companionTreatCatalog.v1";

/** @typedef {{
 *   id: string,
 *   kind: "food" | "drink",
 *   action: "eat" | "drink",
 *   emoji: string,
 *   price: number,
 *   name: { yue: string, en: string },
 *   blurb: { yue: string, en: string },
 *   thanks: { yue: string, en: string },
 * }} TreatItem */

/** @type {readonly TreatItem[]} */
export const TREAT_ITEMS = Object.freeze([
  {
    id: "cake",
    kind: "food",
    action: "eat",
    emoji: "🍰",
    price: 18,
    name: { yue: "蛋糕", en: "Cake" },
    blurb: { yue: "甜甜一塊，拖去佢嘴邊", en: "A sweet slice — drag to her mouth" },
    thanks: { yue: "蛋糕好甜呀，多謝你～", en: "This cake is so sweet, thank you!" },
  },
  {
    id: "bento",
    kind: "food",
    action: "eat",
    emoji: "🍱",
    price: 22,
    name: { yue: "便當", en: "Bento" },
    blurb: { yue: "熱騰騰飯盒", en: "A warm lunch box" },
    thanks: { yue: "呢個便當好味！我食晒喇。", en: "This bento is delicious — all gone!" },
  },
  {
    id: "dumpling",
    kind: "food",
    action: "eat",
    emoji: "🥟",
    price: 12,
    name: { yue: "餃子", en: "Dumplings" },
    blurb: { yue: "一口一個", en: "One bite each" },
    thanks: { yue: "餃子好好食，再嚟一碟得唔得？", en: "Yum, more dumplings please?" },
  },
  {
    id: "cookie",
    kind: "food",
    action: "eat",
    emoji: "🍪",
    price: 8,
    name: { yue: "曲奇", en: "Cookie" },
    blurb: { yue: "脆脆小食", en: "A crunchy snack" },
    thanks: { yue: "曲奇好脆呀，嘻嘻。", en: "That cookie was so crunchy!" },
  },
  {
    id: "milk-tea",
    kind: "drink",
    action: "drink",
    emoji: "🧋",
    price: 14,
    name: { yue: "奶茶", en: "Milk tea" },
    blurb: { yue: "港式凍奶茶", en: "Iced milk tea" },
    thanks: { yue: "奶茶好解渴，多謝！", en: "That milk tea hit the spot, thanks!" },
  },
  {
    id: "soda",
    kind: "drink",
    action: "drink",
    emoji: "🥤",
    price: 10,
    name: { yue: "汽水", en: "Soda" },
    blurb: { yue: "冰凍汽水", en: "A cold soda" },
    thanks: { yue: "嘶——好爽呀。", en: "Ahh, so fizzy and cold." },
  },
  {
    id: "smoothie",
    kind: "drink",
    action: "drink",
    emoji: "🍹",
    price: 16,
    name: { yue: "果昔", en: "Smoothie" },
    blurb: { yue: "水果冰沙", en: "A fruit smoothie" },
    thanks: { yue: "果昔好清新，我鍾意。", en: "This smoothie is so fresh — I love it." },
  },
]);

export const TREAT_ITEM_IDS = Object.freeze(TREAT_ITEMS.map((item) => item.id));

/**
 * @param {string | null | undefined} id
 * @returns {TreatItem | null}
 */
export function getTreatItem(id) {
  const key = String(id || "").toLowerCase();
  return TREAT_ITEMS.find((item) => item.id === key) || null;
}

/**
 * @param {TreatItem} item
 * @param {boolean} [isEnglish]
 */
export function treatDisplayName(item, isEnglish = false) {
  if (!item) return "";
  return isEnglish ? item.name.en : item.name.yue;
}

/**
 * @param {TreatItem} item
 * @param {boolean} [isEnglish]
 */
export function treatThanksLine(item, isEnglish = false) {
  if (!item) return "";
  return isEnglish ? item.thanks.en : item.thanks.yue;
}

/**
 * @param {TreatItem | null | undefined} item
 */
export function treatActionId(item) {
  if (!item) return "eat";
  return item.action === "drink" ? "drink" : "eat";
}
