/**
 * Fast path — show character picker before the heavy companion module graph loads.
 */
import { pickerCopy } from "./companionPickerChrome.js";

export const COMPANION_EARLY_START_PICKER_SCHEMA =
  "amoji.companionEarlyStartPicker.v1";

/**
 * @param {(path: string) => Promise<unknown>} ami
 * @param {{ params?: URLSearchParams, root?: HTMLElement | null }} [opts]
 */
export async function bootEarlyStartPicker(ami, opts = {}) {
  const params =
    opts.params ||
    new URLSearchParams(globalThis.location?.search || "");
  const show =
    params.get("autostart") !== "1" && params.get("pick") !== "0";
  if (!show) return null;

  const isEnglish = params.get("lang") === "en";
  const selectedId = String(params.get("character") || "nova").toLowerCase();
  const copy = pickerCopy(isEnglish);

  const [pickerMod, gachaMod] = await Promise.all([
    ami("../amoji-engine/engine/companion/companionCharacterPicker.js"),
    ami("../amoji-engine/engine/companion/companionUiGacha.js"),
  ]);

  const createCompanionStartPicker = pickerMod.createCompanionStartPicker;
  const playCompanionCardSelectFx = gachaMod.playCompanionCardSelectFx;

  const picker = createCompanionStartPicker({
    root: opts.root || document.body,
    isEnglish,
    selectedId,
    onCardTapFx: playCompanionCardSelectFx,
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
  picker.setPreloadProgress?.(
    100,
    isEnglish
      ? "Ready — 3D loads after you begin"
      : "可以揀啦 — 3D 開始後先載入",
  );
  picker.show();
  document.body.classList.add("companion-start-pending", "companion-picker-open");

  return picker;
}
