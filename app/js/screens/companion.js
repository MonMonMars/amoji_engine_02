import { registerRoute } from "../router.js";
import { loadMobileSettings } from "/amoji-engine/engine/mobile/companionMobileSettings.js";
import {
  loadCompanionRole,
  roleLabel,
  rolePreset,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";

registerRoute("companion", async (ctx) => {
  const en = ctx.isEnglish();
  const settings = loadMobileSettings();
  const lang = settings.lang === "en" ? "en" : "yue";
  const role = loadCompanionRole();
  const charId =
    localStorage.getItem("amoji.mobile.lastCharacterId") ||
    rolePreset(role).defaultCharacterId;
  const secretaryTab = role === "secretary" ? "&tab=today" : "";

  let buildQs = "";
  try {
    const res = await fetch(`${ctx.baseUrl}/api/health`, { cache: "no-store" });
    const data = await res.json();
    if (data?.build) {
      buildQs = `&build=${encodeURIComponent(String(data.build))}`;
    }
  } catch {
    /* offline / local */
  }

  const screen = document.createElement("section");
  screen.className = "screen screen--companion-embed";

  screen.innerHTML = `
    <div class="topbar topbar--embed">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${roleLabel(role, en)}</h1>
      <span></span>
    </div>
    <iframe
      class="companion-frame"
      title="Amoji ${roleLabel(role, en)}"
      src="/play?lang=${lang}&mobile=1&character=${charId}&role=${role}&pick=0&automic=0&voice=openai-coral${secretaryTab}${buildQs}"
      allow="microphone; autoplay"
    ></iframe>
  `;

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("hub"));
  return screen;
});
