/**
 * Fast path — show character picker before the heavy companion module graph loads.
 */
import { createCompanionStartPicker } from "./companionCharacterPicker.js";
import { attachStartPickerModelPreload } from "./companionStartPickerPreload.js";
import {
  applySessionRoleBadgeOverrides,
  pickerCopyForRole,
  resolveAppRole,
  resolveRoleDefaultCharacter,
  rosterCharactersForPicker,
} from "./companionUnifiedApp.js";
import { wireLoadingBar } from "./companionLoadingUi.js";
import { playCompanionCardTapFx } from "./companionUiGacha.js";
import {
  CHARACTER_IDS,
  migrateLegacyCharacterStorage,
  migrateLegacyCharacterUrlParam,
  resolveCharacterId,
} from "./companionCharacterCatalog.js";
import { ROSTER_SCHEMA } from "./companionCharacterRoster.js";
import { AMOJI_BUILD } from "./buildVersion.mjs";
import { repairCompanionSessionBoot } from "./companionBootRepair.js";
import {
  titleScreenKicker,
  titleScreenLogo,
  titleScreenTagline,
} from "./companionTitleScreen.js";
import {
  dismissStartPickerDom,
  shouldShowStartPickerOnBoot,
} from "./companionStartPickerGate.mjs";

export const COMPANION_EARLY_START_PICKER_SCHEMA =
  "amoji.companionEarlyStartPicker.v2";

/**
 * @param {{ params?: URLSearchParams, root?: HTMLElement | null }} [opts]
 */
export async function bootEarlyStartPicker(opts = {}) {
  const params =
    opts.params ||
    new URLSearchParams(globalThis.location?.search || "");
  const show = shouldShowStartPickerOnBoot({
    autostart: params.get("autostart"),
    pick: params.get("pick"),
    start: globalThis.__amojiStart,
    sessionStartedLocal: false,
  });
  if (!show) return null;

  const isEnglish = params.get("lang") === "en";
  repairCompanionSessionBoot();
  migrateLegacyCharacterStorage(globalThis.localStorage);
  migrateLegacyCharacterUrlParam();
  const appRole = resolveAppRole(params);
  const resolvedId = resolveCharacterId({
    characterParam: params.get("character"),
    modelUrl: params.get("vrm") || params.get("model3d"),
    storage: globalThis.localStorage,
  });
  const selectedId = resolveRoleDefaultCharacter(resolvedId, appRole, params);
  const roleCopy = pickerCopyForRole(appRole, isEnglish);

  const splash = document.getElementById("amoji-boot-splash");
  splash?.setAttribute("aria-busy", "true");
  const kickerEl = splash?.querySelector?.(".title-screen-kicker");
  const logoEl = splash?.querySelector?.(".title-screen-logo");
  const taglineEl =
    splash?.querySelector?.(".title-screen-tagline") ||
    splash?.querySelector?.(".boot-load-status");
  if (kickerEl) kickerEl.textContent = titleScreenKicker(isEnglish);
  if (logoEl) logoEl.textContent = titleScreenLogo(isEnglish);
  if (taglineEl) taglineEl.textContent = titleScreenTagline(isEnglish);
  const splashLoad = wireLoadingBar(splash);
  splashLoad.set(8, isEnglish ? "Preparing companions" : "準備同伴名單");
  let splashPct = 8;
  const splashTimer = globalThis.setInterval?.(() => {
    if (!document.getElementById("amoji-boot-splash")) {
      globalThis.clearInterval?.(splashTimer);
      splashLoad.destroy();
      return;
    }
    splashPct = Math.min(92, splashPct + 4 + Math.random() * 6);
    splashLoad.set(
      splashPct,
      isEnglish ? `Loading roster… ${Math.round(splashPct)}%` : `載入名單… ${Math.round(splashPct)}%`,
    );
  }, 220);

  let preloadJob = null;
  const atmosphereEl = document.querySelector(".atmosphere");
  const picker = createCompanionStartPicker({
    root: opts.root || document.body,
    isEnglish,
    selectedId,
    atmosphereEl,
    pickerCopy: roleCopy,
    rosterProvider: (langCode) =>
      applySessionRoleBadgeOverrides(
        rosterCharactersForPicker(langCode),
        appRole,
        langCode === "en",
      ),
    onCardTapFx: playCompanionCardTapFx,
    onSelectionChange: () => {
      void preloadJob?.refreshSelectedModel?.();
    },
    onStart: (nextId) => {
      globalThis.__amojiUnlockAudio?.();
      if (globalThis.__amojiStart) {
        globalThis.__amojiStart.tapped = true;
        globalThis.__amojiStart.starting = true;
        globalThis.__amojiStart.pendingCharacterId = nextId || null;
      }
      dismissStartPickerDom(picker.element, globalThis.__amojiStart);
      globalThis.__amojiDismissStartPickerOverlay?.();
      globalThis.__amojiHideLoading?.();
      if (
        globalThis.__amojiStart?.ready &&
        typeof globalThis.__amojiStart.run === "function"
      ) {
        void globalThis.__amojiStart.run({ characterId: nextId });
        return;
      }
      globalThis.__amojiStartWithCharacter?.(nextId);
    },
  });

  globalThis.__amojiRosterMeta = {
    schema: ROSTER_SCHEMA,
    build: AMOJI_BUILD,
    count: CHARACTER_IDS.length,
    ids: [...CHARACTER_IDS],
    aaa: CHARACTER_IDS.filter((_, i) => i >= 4 && i <= 9),
  };

  picker.setSelected(selectedId);
  picker.enablePicking(true);
  const langCode = isEnglish ? "en" : "yue";
  preloadJob = attachStartPickerModelPreload(picker, {
    isEnglish,
    langCode,
    chatFirst: true,
    getSelectedId: () => picker.getSelectedId?.() || selectedId,
  });
  globalThis.__amojiStartPickerPreloadJob = preloadJob;
  picker.show();
  void preloadJob.previewPromise;
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  globalThis.clearInterval?.(splashTimer);
  splashLoad.flush();
  splash?.remove();
  splashLoad.destroy();

  return picker;
}

/** @deprecated use bootEarlyStartPicker without ami */
export async function bootEarlyStartPickerLegacy(ami, opts = {}) {
  void ami;
  return bootEarlyStartPicker(opts);
}
