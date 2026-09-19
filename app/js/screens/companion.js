import { registerRoute } from "../router.js";
import { loadMobileSettings } from "/amoji-engine/engine/mobile/companionMobileSettings.js";
import { buildMobileCompanionPlayPath } from "/amoji-engine/engine/mobile/companionMobilePlayUrl.js";
import {
  loadCompanionRole,
  normalizeCompanionRole,
  roleLabel,
  rolePreset,
  saveCompanionRole,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";

registerRoute("companion", async (ctx) => {
  const en = ctx.isEnglish();
  const settings = loadMobileSettings();
  const lang = settings.lang === "en" ? "en" : "yue";
  const paramRole =
    typeof ctx.params?.role === "string" ? normalizeCompanionRole(ctx.params.role) : null;
  const role = paramRole || loadCompanionRole();
  if (paramRole) saveCompanionRole(paramRole);
  const charId =
    localStorage.getItem("amoji.mobile.lastCharacterId") ||
    rolePreset(role).defaultCharacterId;
  let deployedBuild = null;
  try {
    const res = await fetch(`${ctx.baseUrl}/api/health`, { cache: "no-store" });
    const data = await res.json();
    if (data?.build) deployedBuild = String(data.build);
  } catch {
    /* offline / local */
  }

  const pick =
    ctx.params?.pick === "1" || ctx.params?.pick === 1 ? "1" : "0";

  const playPath = buildMobileCompanionPlayPath({
    lang,
    characterId: charId,
    role,
    voiceEnabled: settings.voiceEnabled !== false,
    build: deployedBuild,
    pick,
  });

  const screen = document.createElement("section");
  screen.className = "screen screen--companion-embed";

  screen.innerHTML = `
    <div class="topbar topbar--embed">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${pick === "1" ? (en ? "Pick character" : "選角色") : roleLabel(role, en)}</h1>
      <span></span>
    </div>
    <div class="companion-embed-wrap">
      <div class="companion-embed-loading" id="companion-loading" aria-live="polite">
        <span class="companion-embed-spinner" aria-hidden="true"></span>
        <span>${en ? "Loading 3D companion…" : "載入 3D 同伴…"}</span>
      </div>
      <iframe
        class="companion-frame"
        title="Amoji ${roleLabel(role, en)}"
        src="${playPath}"
        allow="microphone; autoplay"
      ></iframe>
    </div>
  `;

  const iframe = screen.querySelector(".companion-frame");
  const loading = screen.querySelector("#companion-loading");
  const hideLoading = () => loading?.classList.add("hidden");
  iframe?.addEventListener("load", hideLoading, { once: true });
  setTimeout(hideLoading, 45000);

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("hub"));
  return screen;
});
