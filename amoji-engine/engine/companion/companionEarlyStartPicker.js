/**
 * Fast path — show character picker before the heavy companion module graph loads.
 */
import { createCompanionStartPicker } from "./companionCharacterPicker.js";
import { attachStartPickerModelPreload } from "./companionStartPickerPreload.js";
import { playCompanionCardTapFx } from "./companionUiGacha.js";
import { pickerCopy } from "./companionPickerChrome.js";

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
  const selectedId = String(params.get("character") || "nova").toLowerCase();

  const splash = document.getElementById("amoji-boot-splash");
  splash?.setAttribute("aria-busy", "true");

  let preloadJob = null;
  const picker = createCompanionStartPicker({
    root: opts.root || document.body,
    isEnglish,
    selectedId,
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
    getSelectedId: () => picker.getSelectedId?.() || selectedId,
  });
  picker.show();
  void preloadJob.previewPromise;
  document.body.classList.add("companion-start-pending", "companion-picker-open");
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  splash?.remove();

  return picker;
}

/** @deprecated use bootEarlyStartPicker without ami */
export async function bootEarlyStartPickerLegacy(ami, opts = {}) {
  void ami;
  return bootEarlyStartPicker(opts);
}
