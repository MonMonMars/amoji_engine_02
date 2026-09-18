import { registerRoute } from "../router.js";
import { signInGuest } from "/amoji-engine/engine/mobile/companionMobileAuth.js";
import { syncFromCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import {
  COMPANION_ROLES,
  loadCompanionRole,
  roleEmoji,
  roleLabel,
  roleTagline,
  saveCompanionRole,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";

registerRoute("login", (ctx) => {
  const en = ctx.isEnglish();
  let selectedRole = loadCompanionRole();

  const screen = document.createElement("section");
  screen.className = "screen";

  function roleButtons() {
    return COMPANION_ROLES.map(
      (role) => `
      <button type="button" class="role-card ${selectedRole === role ? "role-card--active" : ""}" data-role="${role}">
        <span class="role-card__emoji">${roleEmoji(role)}</span>
        <span class="role-card__title">${roleLabel(role, en)}</span>
        <span class="role-card__desc">${roleTagline(role, en)}</span>
      </button>`,
    ).join("");
  }

  function render() {
    screen.innerHTML = `
      <div class="topbar">
        <button type="button" class="btn btn-secondary" data-action="back">←</button>
        <h1>${en ? "Choose your companion" : "選擇同伴類型"}</h1>
        <span></span>
      </div>
      <p style="margin:0 0 0.85rem;color:var(--muted);line-height:1.5;font-size:0.9rem">${
        en
          ? "Girlfriend, boyfriend, secretary, or pet — each picks a 3D character & tone (inspired by Replika, Nomi, iBoy)."
          : "女朋友、男朋友、秘書或寵物 — 各自配 3D 角色同語氣（參考 Replika、Nomi、iBoy）。"
      }</p>
      <div class="role-grid">${roleButtons()}</div>
      <div class="panel" style="margin-top:1rem">
        <p style="margin:0 0 1rem;color:var(--muted);line-height:1.5;font-size:0.88rem">${
          en ? "Sign in to sync saves & purchases." : "登入以同步存檔同購買。"
        }</p>
        <div class="stack">
          <button type="button" class="btn btn-apple" data-action="apple">${en ? " Sign in with Apple" : " 使用 Apple 登入"}</button>
          <button type="button" class="btn btn-secondary" data-action="guest">${en ? "Continue as Guest" : "訪客繼續"}</button>
        </div>
      </div>
    `;

    screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("title"));

    for (const btn of screen.querySelectorAll("[data-role]")) {
      btn.addEventListener("click", () => {
        selectedRole = saveCompanionRole(btn.getAttribute("data-role"));
        render();
      });
    }

    screen.querySelector('[data-action="guest"]')?.addEventListener("click", () => finishLogin("guest"));
    screen.querySelector('[data-action="apple"]')?.addEventListener("click", () => finishLogin("apple"));
  }

  async function finishLogin(kind) {
    try {
      saveCompanionRole(selectedRole);
      if (kind === "guest") {
        const session = await signInGuest({ baseUrl: ctx.baseUrl });
        ctx.setSession(session);
      } else {
        const cap = globalThis.Capacitor?.Plugins?.SignInWithApple;
        const { signInApple } = await import("/amoji-engine/engine/mobile/companionMobileAuth.js");
        if (cap?.authorize) {
          const result = await cap.authorize({
            clientId: "com.amoji.companion",
            redirectURI: "https://amoji.app/auth/apple/callback",
            scopes: "email name",
          });
          const session = await signInApple({
            baseUrl: ctx.baseUrl,
            identityToken: result?.response?.identityToken,
            email: result?.response?.email,
            displayName: result?.response?.givenName || "Apple Player",
          });
          ctx.setSession(session);
        } else {
          const devToken = btoa(JSON.stringify({ sub: `dev_apple_${Date.now()}`, email: "dev@amoji.app" }))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
          const session = await signInApple({
            baseUrl: ctx.baseUrl,
            identityToken: `dev.${devToken}.sig`,
            displayName: en ? "Dev Apple User" : "開發 Apple 用戶",
            email: "dev@amoji.app",
          });
          ctx.setSession(session);
        }
      }
      await syncFromCloud({ baseUrl: ctx.baseUrl });
      ctx.toast(
        en
          ? `${roleLabel(selectedRole, true)} mode · welcome!`
          : `${roleLabel(selectedRole, false)} 模式 · 歡迎！`,
      );
      ctx.navigate("hub");
    } catch (err) {
      ctx.toast(err?.message || String(err));
    }
  }

  render();
  return screen;
});
