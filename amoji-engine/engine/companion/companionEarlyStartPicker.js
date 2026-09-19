/**
 * Fast path — show character picker before the heavy companion module graph loads.
 */
import { createCompanionStartPicker } from "./companionCharacterPicker.js";
import { attachStartPickerModelPreload } from "./companionStartPickerPreload.js";
import {
  pickerCopyForRole,
  resolveAppRole,
  resolveRoleDefaultCharacter,
  rosterCharactersForPicker,
} from "./companionUnifiedApp.js";
import { wireLoadingBar } from "./companionLoadingUi.js";
import { playCompanionCardTapFx } from "./companionUiGacha.js";

export const COMPANION_EARLY_START_PICKER_SCHEMA =
  "amoji.companionEarlyStartPicker.v1";

/**
 * @param {{ params?: URLSearchParams, root?: HTMLElement | null }} [opts]
 */
export async function bootEarlyStartPicker(opts = {}) {
  const params =
    opts.params ||
    new URLSearchParams(globalThis.location?.search || "");
  const show =
    params.get("autostart") !== "1" && params.get("pick") !== "0";
  if (!show) return null;

  const isEnglish = params.get("lang") === "en";
  const appRole = resolveAppRole(params);
  const selectedId = resolveRoleDefaultCharacter(
    String(params.get("character") || "nova").toLowerCase(),
    appRole,
    params,
  );
  const roleCopy = pickerCopyForRole(appRole, isEnglish);

  const splash = document.getElementById("amoji-boot-splash");
  splash?.setAttribute("aria-busy", "true");
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
  const picker = createCompanionStartPicker({
    root: opts.root || document.body,
    isEnglish,
    selectedId,
    pickerCopy: roleCopy,
    rosterProvider: (langCode) => rosterCharactersForPicker(langCode),
    onCardTapFx: playCompanionCardTapFx,
    onSelectionChange: () => {
      void preloadJob?.refreshSelectedModel?.();
    },
    onStart: (nextId) => {
      globalThis.__amojiUnlockAudio?.();
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
  document.body.classList.add("companion-start-pending", "companion-picker-open");
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
