/**
 * Mobile hub card definitions + role-aware ordering.
 */
import { roleEmoji, roleLabel, rolePreset } from "./companionRolePresets.js";

/**
 * @typedef {{
 *   id: string,
 *   screen: string,
 *   icon: string,
 *   title: string,
 *   desc: string,
 *   setRole?: string,
 *   pick?: "0" | "1",
 * }} MobileHubCard
 */

/**
 * @param {MobileHubCard[]} cards
 * @param {import("./companionRolePresets.js").CompanionRole} role
 */
export function orderHubCardsForRole(cards, role) {
  const preset = rolePreset(role);
  const rank = (card) => {
    if (card.screen === preset.hubPrimary) return 0;
    if (card.screen === preset.hubSecondary) return 1;
    return 2;
  };
  return [...cards].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
}

/**
 * @param {boolean} en
 * @param {{
 *   role: import("./companionRolePresets.js").CompanionRole,
 *   chaseHighScore: number,
 *   chaseStreakDays: number,
 * }} ctx
 * @returns {MobileHubCard[]}
 */
export function mobileHubCardDefs(en, ctx) {
  const role = ctx.role;
  return [
    {
      id: "companion-main",
      screen: "companion",
      icon: roleEmoji(role),
      title: roleLabel(role, en),
      desc: en ? "Unified 3D app · chat & voice" : "統一 3D app · 傾偈同語音",
    },
    {
      id: "pick-character",
      screen: "companion",
      icon: "✨",
      title: en ? "Switch 3D character" : "換 3D 角色",
      desc: en ? "Picker · same session" : "選角 · 唔使離開 App",
      pick: "1",
    },
    {
      id: "pet-care",
      screen: "pet",
      icon: "🐾",
      title: en ? "Pet Care" : "寵物照顧",
      desc: en ? "Feed, pet, and mood meters" : "餵食、摸摸、心情條",
    },
    {
      id: "secretary",
      screen: "companion",
      icon: "📋",
      title: en ? "Secretary" : "秘書",
      desc: en ? "Tasks · Today · in-app 3D" : "任務 · Today · App 內 3D",
      setRole: "secretary",
    },
    {
      id: "boyfriend",
      screen: "companion",
      icon: "💙",
      title: en ? "Boyfriend" : "男朋友",
      desc: en ? "Romance · voice · in-app 3D" : "浪漫 · 語音 · App 內 3D",
      setRole: "boyfriend",
    },
    {
      id: "chase",
      screen: "chase",
      icon: "🏃‍♀️",
      title: en ? "Chase!" : "追逐！",
      desc: en
        ? `Best ${ctx.chaseHighScore} · streak ${ctx.chaseStreakDays}d`
        : `最高 ${ctx.chaseHighScore} · 連續 ${ctx.chaseStreakDays} 日`,
    },
    {
      id: "shop",
      screen: "shop",
      icon: "🛍️",
      title: en ? "Shop" : "商店",
      desc: en ? "Coins & Premium" : "金幣同 Premium",
    },
  ];
}

/**
 * @param {MobileHubCard} card
 */
export function renderMobileHubCard(card) {
  const setRole = card.setRole ? ` data-set-role="${card.setRole}"` : "";
  const pick = card.pick ? ` data-pick="${card.pick}"` : "";
  return `<button type="button" class="hub-card" data-go="${card.screen}"${setRole}${pick}>
        <div class="hub-card__icon">${card.icon}</div>
        <div>
          <h2 class="hub-card__title">${card.title}</h2>
          <p class="hub-card__desc">${card.desc}</p>
        </div>
      </button>`;
}
