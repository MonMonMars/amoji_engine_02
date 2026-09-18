import { registerRoute } from "../router.js";
import { signInGuest } from "/amoji-engine/engine/mobile/companionMobileAuth.js";
import { syncFromCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";

registerRoute("login", (ctx) => {
  const en = ctx.isEnglish();
  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${en ? "Sign In" : "登入"}</h1>
      <span></span>
    </div>
    <div class="panel">
      <p style="margin:0 0 1rem;color:var(--muted);line-height:1.5">${
        en
          ? "Save your pet, chase scores, and purchases across devices."
          : "同步寵物、追逐分數同購買記錄到雲端。"
      }</p>
      <div class="stack">
        <button type="button" class="btn btn-apple" data-action="apple">${en ? " Sign in with Apple" : " 使用 Apple 登入"}</button>
        <button type="button" class="btn btn-secondary" data-action="guest">${en ? "Continue as Guest" : "訪客繼續"}</button>
      </div>
    </div>
    <p style="color:var(--muted);font-size:0.78rem;line-height:1.45;margin-top:1rem">${
      en
        ? "Apple Sign In uses native StoreKit on iOS (Capacitor). Browser uses guest or dev Apple token."
        : "iOS 用 Capacitor 原生 Apple 登入；瀏覽器可用訪客或開發模式。"
    }</p>
  `;

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("title"));

  screen.querySelector('[data-action="guest"]')?.addEventListener("click", async () => {
    try {
      const session = await signInGuest({ baseUrl: ctx.baseUrl });
      ctx.setSession(session);
      await syncFromCloud({ baseUrl: ctx.baseUrl });
      ctx.toast(en ? "Welcome, Guest!" : "歡迎，訪客！");
      ctx.navigate("hub");
    } catch (err) {
      ctx.toast(err?.message || String(err));
    }
  });

  screen.querySelector('[data-action="apple"]')?.addEventListener("click", async () => {
    try {
      const cap = globalThis.Capacitor?.Plugins?.SignInWithApple;
      if (cap?.authorize) {
        const result = await cap.authorize({
          clientId: "com.amoji.companion",
          redirectURI: "https://amoji.app/auth/apple/callback",
          scopes: "email name",
        });
        const { signInApple } = await import("/amoji-engine/engine/mobile/companionMobileAuth.js");
        const session = await signInApple({
          baseUrl: ctx.baseUrl,
          identityToken: result?.response?.identityToken,
          email: result?.response?.email,
          displayName: result?.response?.givenName || "Apple Player",
        });
        ctx.setSession(session);
        await syncFromCloud({ baseUrl: ctx.baseUrl });
        ctx.navigate("hub");
        return;
      }

      const { signInApple } = await import("/amoji-engine/engine/mobile/companionMobileAuth.js");
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
      await syncFromCloud({ baseUrl: ctx.baseUrl });
      ctx.toast(en ? "Dev Apple sign-in OK" : "開發 Apple 登入成功");
      ctx.navigate("hub");
    } catch (err) {
      ctx.toast(err?.message || String(err));
    }
  });

  return screen;
});
