import { registerRoute } from "../router.js";

registerRoute("title", (ctx) => {
  const en = ctx.isEnglish();
  const screen = document.createElement("section");
  screen.className = "screen screen--title";

  screen.innerHTML = `
    <div class="logo-mark" aria-hidden="true">🌸</div>
    <div>
      <h1 class="hero-title">Amoji</h1>
      <p class="hero-sub">${
        en
          ? "Pet, chat, and chase your anime companion — App Store ready."
          : "養寵、傾偈、追逐動漫同伴 — 準備上架 App Store。"
      }</p>
    </div>
    <div class="stack">
      <button type="button" class="btn btn-primary" data-action="start">${en ? "Tap to Start" : "開始遊戲"}</button>
      <button type="button" class="btn btn-secondary" data-action="settings">${en ? "Settings" : "設定"}</button>
    </div>
  `;

  screen.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    const session = ctx.getSession();
    if (session?.token) {
      ctx.navigate("hub");
    } else {
      ctx.navigate("login");
    }
  });

  screen.querySelector('[data-action="settings"]')?.addEventListener("click", () => {
    ctx.navigate("settings");
  });

  return screen;
});
