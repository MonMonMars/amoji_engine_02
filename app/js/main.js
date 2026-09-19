import { initRouter, navigate, getCurrentScreen } from "./router.js";
import { initCapacitorBridge } from "./capacitor-bridge.js";
import {
  loadAuthSession,
  restoreSession,
  saveAuthSession,
} from "/amoji-engine/engine/mobile/companionMobileAuth.js";
import {
  loadMobileSettings,
  pullRemoteSettings,
  saveMobileSettings,
} from "/amoji-engine/engine/mobile/companionMobileSettings.js";
import { syncFromCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import { bootNativeShell } from "/amoji-engine/engine/mobile/companionNativePurchases.js";
import { hapticTap } from "/amoji-engine/engine/mobile/companionMobileHaptics.js";
import { mountConnectivityBanner } from "/amoji-engine/engine/mobile/companionMobileConnectivity.js";
import {
  normalizeCompanionRole,
  saveCompanionRole,
} from "/amoji-engine/engine/mobile/companionRolePresets.js";

import "./screens/title.js";
import "./screens/login.js";
import "./screens/hub.js";
import "./screens/companion.js";
import "./screens/pet.js";
import "./screens/chase.js";
import "./screens/shop.js";
import "./screens/settings.js";

/** @type {Record<string, unknown>} */
let session = loadAuthSession() || {};

/**
 * @returns {boolean}
 */
function isEnglish() {
  const settings = loadMobileSettings();
  const urlLang = new URLSearchParams(location.search).get("lang");
  if (urlLang === "en") return true;
  if (urlLang === "yue") return false;
  return settings.lang === "en";
}

/** @type {HTMLElement | null} */
let toastNode = null;
/** @type {number | null} */
let toastTimer = null;

/**
 * @param {string} message
 */
function toast(message) {
  if (!message) return;
  if (!toastNode) {
    toastNode = document.createElement("div");
    toastNode.className = "toast";
    document.body.appendChild(toastNode);
  }
  toastNode.textContent = message;
  toastNode.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastNode?.classList.add("hidden"), 2600);
}

const root = document.getElementById("app-root");
if (!root) throw new Error("#app-root missing");

const baseUrl = location.origin.replace(/\/$/, "");

const navigateWithHaptics = async (name, params) => {
  await hapticTap("light");
  return navigate(name, params);
};

initRouter({
  root,
  isEnglish,
  getSession: () => session,
  setSession: (patch) => {
    session = { ...session, ...patch };
    if (session?.token) saveAuthSession(/** @type {Record<string, unknown>} */ (session));
  },
  navigate: navigateWithHaptics,
  toast,
  baseUrl,
});

initCapacitorBridge({
  getScreen: getCurrentScreen,
  navigate: navigateWithHaptics,
});

async function boot() {
  mountConnectivityBanner();

  try {
    const restored = await restoreSession({ baseUrl });
    if (restored) session = restored;
  } catch {
    /* offline boot */
  }

  if (session?.token) {
    try {
      const remoteSettings = await pullRemoteSettings({ baseUrl });
      if (remoteSettings) saveMobileSettings(remoteSettings);
    } catch {
      /* offline */
    }
    try {
      await syncFromCloud({ baseUrl });
    } catch {
      /* offline */
    }
  }

  try {
    await bootNativeShell({ baseUrl });
  } catch {
    /* browser / missing native plugins */
  }

  const params = new URLSearchParams(location.search);
  const roleParam = params.get("role");
  const navigateParams = {};
  if (roleParam) {
    const role = normalizeCompanionRole(roleParam);
    saveCompanionRole(role);
    navigateParams.role = role;
  }
  if (params.get("pick") === "1") {
    navigateParams.pick = "1";
  }
  const screen = params.get("screen");
  const valid = ["title", "login", "hub", "companion", "pet", "chase", "shop", "settings"];
  if (screen && valid.includes(screen)) {
    await navigate(
      /** @type {import("./router.js").ScreenName} */ (screen),
      navigateParams,
    );
    return;
  }
  if (session?.token) {
    await navigate("hub");
  } else {
    await navigate("title");
  }
}

boot().catch((err) => {
  toast(err?.message || String(err));
  navigate("title");
});
