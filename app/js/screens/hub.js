import { registerRoute } from "../router.js";
import { loadTreatState } from "/amoji-engine/engine/companion/companionTreatStore.js";
import { loadLocalChaseState } from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import { resolveBondRank } from "/amoji-engine/engine/companion/companionRaisingUi.js";
import {
  getCharacter,
} from "/amoji-engine/engine/companion/companionCharacterCatalog.js";
import {
  loadCompanionRole,
  roleEmoji,
  roleLabel,
  rolePreset,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";

registerRoute("hub", (ctx) => {
  const en = ctx.isEnglish();
  const session = ctx.getSession();
  const role = loadCompanionRole();
  const preset = rolePreset(role);
  const charId =
    localStorage.getItem("amoji.mobile.lastCharacterId") || preset.defaultCharacterId;
  const character = getCharacter(charId);
  const treats = loadTreatState();
  const chase = loadLocalChaseState() || { highScore: 0, streakDays: 0 };
  const bond = resolveBondRank(treats.hearts, en);
  const charName = en ? character?.name?.en : character?.name?.yue;

  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <div>
        <h1>${en ? "Home" : "主頁"}</h1>
        <div style="color:var(--muted);font-size:0.82rem">${roleEmoji(role)} ${roleLabel(role, en)} · ${charName || "—"} · ${bond.label}</div>
      </div>
      <div class="chip" hidden aria-hidden="true">🪙 ${treats.coins}</div>
    </div>
    <div class="hub-grid">
      <button type="button" class="hub-card" data-go="companion">
        <div class="hub-card__icon">${roleEmoji(role)}</div>
        <div>
          <h2 class="hub-card__title">${roleLabel(role, en)}</h2>
          <p class="hub-card__desc">${en ? "Unified 3D app · chat & voice" : "統一 3D app · 傾偈同語音"}</p>
        </div>
      </button>
      <button type="button" class="hub-card" data-go="pet">
        <div class="hub-card__icon">🐾</div>
        <div>
          <h2 class="hub-card__title">${en ? "Pet Care" : "寵物照顧"}</h2>
          <p class="hub-card__desc">${en ? "Feed, pet, and mood meters" : "餵食、摸摸、心情條"}</p>
        </div>
      </button>
      <button type="button" class="hub-card" data-open="/play?role=secretary&pick=1&automic=0&lang=${en ? "en" : "yue"}">
        <div class="hub-card__icon">📋</div>
        <div>
          <h2 class="hub-card__title">${en ? "Secretary" : "秘書"}</h2>
          <p class="hub-card__desc">${en ? "Tasks · Today · 3D avatar" : "任務 · Today · 3D 同伴"}</p>
        </div>
      </button>
      <button type="button" class="hub-card" data-go="chase">
        <div class="hub-card__icon">🏃‍♀️</div>
        <div>
          <h2 class="hub-card__title">${en ? "Chase!" : "追逐！"}</h2>
          <p class="hub-card__desc">${en ? `Best ${chase.highScore} · streak ${chase.streakDays}d` : `最高 ${chase.highScore} · 連續 ${chase.streakDays} 日`}</p>
        </div>
      </button>
      <button type="button" class="hub-card" data-go="shop">
        <div class="hub-card__icon">🛍️</div>
        <div>
          <h2 class="hub-card__title">${en ? "Shop" : "商店"}</h2>
          <p class="hub-card__desc">${en ? "Coins & Premium" : "金幣同 Premium"}</p>
        </div>
      </button>
    </div>
    <div class="stack" style="margin-top:1rem;width:100%">
      <button type="button" class="btn btn-secondary" data-go="settings">${en ? "Settings" : "設定"}</button>
      <button type="button" class="btn btn-secondary" data-open="/play?pick=0&mobile=1&automic=0&lang=${en ? "en" : "yue"}&character=${charId}&role=${role}">
        ${en ? "Open full-screen 3D (browser)" : "全屏 3D 同伴（瀏覽器）"}
      </button>
    </div>
  `;

  for (const btn of screen.querySelectorAll("[data-go]")) {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      if (target) ctx.navigate(/** @type {import("../router.js").ScreenName} */ (target));
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
