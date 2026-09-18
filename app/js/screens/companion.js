import { registerRoute } from "../router.js";
import { loadMobileSettings } from "/amoji-engine/engine/mobile/companionMobileSettings.js";

registerRoute("companion", (ctx) => {
  const en = ctx.isEnglish();
  const settings = loadMobileSettings();
  const lang = settings.lang === "en" ? "en" : "yue";

  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${en ? "Companion" : "同伴"}</h1>
      <span></span>
    </div>
    <iframe
      class="companion-frame"
      title="Amoji Companion"
      src="/companion-full?lang=${lang}&mobile=1&voice=openai-coral"
      allow="microphone; autoplay"
    ></iframe>
  `;

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("hub"));
  return screen;
});
