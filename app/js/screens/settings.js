import { registerRoute } from "../router.js";
import {
  loadMobileSettings,
  pushRemoteSettings,
  saveMobileSettings,
} from "/amoji-engine/engine/mobile/companionMobileSettings.js";
import {
  COMPANION_ROLES,
  loadCompanionRole,
  roleEmoji,
  roleLabel,
  rolePreset,
  saveCompanionRole,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";
import {
  clearAuthSession,
  loadAuthSession,
} from "/amoji-engine/engine/mobile/companionMobileAuth.js";
import { syncToCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import { fetchAppBuild } from "../appBuild.js";

registerRoute("settings", async (ctx) => {
  const en = ctx.isEnglish();
  let settings = loadMobileSettings();
  let companionRole = loadCompanionRole();
  const session = loadAuthSession();

  const screen = document.createElement("section");
  screen.className = "screen";

  const appBuild = (await fetchAppBuild(ctx.baseUrl)) || "—";

  function render() {
    screen.innerHTML = `
      <div class="topbar">
        <button type="button" class="btn btn-secondary" data-action="back">←</button>
        <h1>${en ? "Settings" : "設定"}</h1>
        <span></span>
      </div>
      <div class="panel">
        <div class="setting-row">
          <span>${en ? "Companion role" : "同伴類型"}</span>
          <select data-setting="companionRole">
            ${COMPANION_ROLES.map(
              (r) =>
                `<option value="${r}" ${companionRole === r ? "selected" : ""}>${roleEmoji(r)} ${roleLabel(r, en)}</option>`,
            ).join("")}
          </select>
        </div>
        <div class="setting-row">
          <span>${en ? "Language" : "語言"}</span>
          <select data-setting="lang">
            <option value="yue" ${settings.lang === "yue" ? "selected" : ""}>粵語</option>
            <option value="en" ${settings.lang === "en" ? "selected" : ""}>English</option>
          </select>
        </div>
        <div class="setting-row">
          <span>${en ? "Voice" : "語音"}</span>
          <input type="checkbox" data-setting="voiceEnabled" ${settings.voiceEnabled ? "checked" : ""} />
        </div>
        <div class="setting-row">
          <span>${en ? "Notifications" : "通知"}</span>
          <input type="checkbox" data-setting="notifications" ${settings.notifications ? "checked" : ""} />
        </div>
        <div class="setting-row">
          <span>${en ? "Haptics" : "觸感"}</span>
          <input type="checkbox" data-setting="haptics" ${settings.haptics ? "checked" : ""} />
        </div>
        <div class="setting-row">
          <span>${en ? "Chase difficulty" : "追逐難度"}</span>
          <select data-setting="chaseDifficulty">
            <option value="easy" ${settings.chaseDifficulty === "easy" ? "selected" : ""}>${en ? "Easy" : "簡單"}</option>
            <option value="normal" ${settings.chaseDifficulty === "normal" ? "selected" : ""}>${en ? "Normal" : "普通"}</option>
            <option value="hard" ${settings.chaseDifficulty === "hard" ? "selected" : ""}>${en ? "Hard" : "困難"}</option>
          </select>
        </div>
        <div class="setting-row">
          <span>${en ? "Analytics opt-in" : "分析數據"}</span>
          <input type="checkbox" data-setting="analyticsOptIn" ${settings.analyticsOptIn ? "checked" : ""} />
        </div>
      </div>
      <div class="panel">
        <p style="margin:0 0 0.5rem;color:var(--muted);font-size:0.85rem">${en ? "Account" : "帳戶"}</p>
        <p style="margin:0 0 0.75rem">${session?.displayName || (en ? "Not signed in" : "未登入")} · ${session?.provider || "—"}</p>
        <div class="stack">
          <button type="button" class="btn btn-primary" data-action="pick-character">${en ? "Change 3D character" : "換 3D 角色"}</button>
          <button type="button" class="btn btn-secondary" data-action="sync">${en ? "Sync save to cloud" : "同步雲端存檔"}</button>
          <button type="button" class="btn btn-secondary" data-action="login">${session?.token ? (en ? "Switch account" : "切換帳戶") : (en ? "Sign in" : "登入")}</button>
          <button type="button" class="btn btn-danger" data-action="logout" ${session?.token ? "" : "disabled"}>${en ? "Sign out" : "登出"}</button>
        </div>
      </div>
      <p style="margin-top:1rem;color:var(--muted);font-size:0.75rem;line-height:1.45">
        <a href="/privacy" style="color:var(--accent)">${en ? "Privacy Policy" : "私隱政策"}</a>
        · build ${appBuild}
      </p>
    `;

    screen.querySelector('[data-action="back"]')?.addEventListener("click", () => {
      const hasSession = Boolean(loadAuthSession()?.token);
      ctx.navigate(hasSession ? "hub" : "title");
    });

    for (const input of screen.querySelectorAll("[data-setting]")) {
      input.addEventListener("change", async () => {
        const key = input.getAttribute("data-setting");
        if (!key) return;
        if (key === "companionRole") {
          companionRole = saveCompanionRole(input.value);
          ctx.toast(
            en
              ? `${roleLabel(companionRole, true)} · ${rolePreset(companionRole).defaultCharacterId}`
              : `${roleLabel(companionRole, false)} · ${rolePreset(companionRole).defaultCharacterId}`,
          );
          return;
        }
        if (input instanceof HTMLInputElement && input.type === "checkbox") {
          settings = saveMobileSettings({ ...settings, [key]: input.checked });
        } else {
          settings = saveMobileSettings({ ...settings, [key]: input.value });
        }
        if (session?.token) {
          try {
            await pushRemoteSettings(settings, { baseUrl: ctx.baseUrl });
          } catch {
            /* offline */
          }
        }
        ctx.toast(en ? "Saved" : "已儲存");
      });
    }

    screen.querySelector('[data-action="pick-character"]')?.addEventListener("click", () => {
      ctx.navigate("companion", { pick: "1" });
    });

    screen.querySelector('[data-action="sync"]')?.addEventListener("click", async () => {
      try {
        await syncToCloud({ baseUrl: ctx.baseUrl });
        ctx.toast(en ? "Cloud sync OK" : "雲端同步完成");
      } catch (err) {
        ctx.toast(err?.message || String(err));
      }
    });

    screen.querySelector('[data-action="login"]')?.addEventListener("click", () => ctx.navigate("login"));

    screen.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
      clearAuthSession();
      ctx.setSession({});
      ctx.toast(en ? "Signed out" : "已登出");
      ctx.navigate("title");
    });
  }

  render();
  return screen;
});
