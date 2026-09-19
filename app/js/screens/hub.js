import { registerRoute } from "../router.js";
import { loadTreatState } from "/amoji-engine/engine/companion/companionTreatStore.js";
import { loadLocalChaseState } from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import { resolveBondRank } from "/amoji-engine/engine/companion/companionRaisingUi.js";
import { getCharacter } from "/amoji-engine/engine/companion/companionCharacterCatalog.js";
import { loadMobileSettings } from "/amoji-engine/engine/mobile/companionMobileSettings.js";
import { buildMobileCompanionPlayPath } from "/amoji-engine/engine/mobile/companionMobilePlayUrl.js";
import {
  mobileHubCardDefs,
  orderHubCardsForRole,
  renderMobileHubCard,
} from "/amoji-engine/engine/mobile/mobileHubLayout.js";
import {
  loadCompanionRole,
  roleEmoji,
  roleLabel,
  rolePreset,
  saveCompanionRole,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";
import { AMOJI_BUILD } from "/amoji-engine/engine/companion/buildVersion.mjs";

registerRoute("hub", (ctx) => {
  const en = ctx.isEnglish();
  const role = loadCompanionRole();
  const preset = rolePreset(role);
  const charId =
    localStorage.getItem("amoji.mobile.lastCharacterId") || preset.defaultCharacterId;
  const character = getCharacter(charId);
  const treats = loadTreatState();
  const chase = loadLocalChaseState() || { highScore: 0, streakDays: 0 };
  const bond = resolveBondRank(treats.hearts, en);
  const charName = en ? character?.name?.en : character?.name?.yue;
  const settings = loadMobileSettings();
  const fullscreenPlay = buildMobileCompanionPlayPath({
    lang: en ? "en" : "yue",
    characterId: charId,
    role,
    voiceEnabled: settings.voiceEnabled !== false,
    build: AMOJI_BUILD,
  });

  const hubCards = orderHubCardsForRole(
    mobileHubCardDefs(en, {
      role,
      chaseHighScore: chase.highScore,
      chaseStreakDays: chase.streakDays,
    }),
    role,
  );

  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <div>
        <h1>${en ? "Home" : "主頁"}</h1>
        <div data-hub-subtitle style="color:var(--muted);font-size:0.82rem">${roleEmoji(role)} ${roleLabel(role, en)} · ${charName || "—"} · ${bond.label}</div>
      </div>
      <button type="button" class="chip chip--button" data-go="shop" title="${en ? "Coins · Shop" : "金幣 · 商店"}">🪙 ${treats.coins}</button>
    </div>
    <div class="hub-grid">
      ${hubCards.map(renderMobileHubCard).join("\n")}
    </div>
    <div class="stack" style="margin-top:1rem;width:100%">
      <button type="button" class="btn btn-secondary" data-go="settings">${en ? "Settings" : "設定"}</button>
      <button type="button" class="btn btn-secondary" data-open="${fullscreenPlay}">
        ${en ? "Open full-screen 3D (browser)" : "全屏 3D 同伴（瀏覽器）"}
      </button>
    </div>
  `;

  for (const btn of screen.querySelectorAll("[data-go]")) {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      const setRole = btn.getAttribute("data-set-role");
      const pick = btn.getAttribute("data-pick");
      /** @type {Record<string, string>} */
      const navParams = {};
      if (setRole) {
        saveCompanionRole(setRole);
        navParams.role = setRole;
      }
      if (pick === "1") navParams.pick = "1";
      if (target) {
        ctx.navigate(
          /** @type {import("../router.js").ScreenName} */ (target),
          navParams,
        );
      }
    });
  }
  for (const btn of screen.querySelectorAll("[data-open]")) {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-open");
      if (url) globalThis.location.href = url;
    });
  }

  return screen;
});
