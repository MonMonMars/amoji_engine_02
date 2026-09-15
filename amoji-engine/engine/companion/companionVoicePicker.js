/**
 * Voice picker sheet — choose from full Cantonese / English voice list.
 */
import { voicesForLang, voiceShortLabel } from "./companionVoiceCatalog.js";

export const COMPANION_VOICE_PICKER_SCHEMA = "amoji.companionVoicePicker.v1";

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   langCode?: "yue" | "en",
 *   selectedId?: string,
 *   onSelect?: (voiceId: string) => void,
 *   onClose?: () => void,
 * }} opts
 */
export function createCompanionVoicePicker(opts = {}) {
  const langCode = opts.langCode === "en" ? "en" : "yue";
  const isEnglish = langCode === "en";
  let selectedId = opts.selectedId || voicesForLang(langCode)[0]?.id || "";
  let open = false;

  const shell = document.createElement("div");
  shell.className = "companion-picker companion-voice-picker";
  shell.hidden = true;
  shell.setAttribute("role", "dialog");
  shell.setAttribute("aria-modal", "true");
  shell.innerHTML = `
    <div class="companion-picker-backdrop" data-voice-close></div>
    <div class="companion-picker-sheet companion-voice-sheet">
      <header class="companion-picker-head">
        <div>
          <h2 class="companion-picker-title"></h2>
          <p class="companion-picker-sub"></p>
        </div>
        <button type="button" class="companion-picker-close" data-voice-close aria-label="Close">✕</button>
      </header>
      <div class="companion-voice-list" role="listbox"></div>
    </div>
  `;

  const mount = opts.root || document.body;
  mount.appendChild(shell);

  const title = shell.querySelector(".companion-picker-title");
  const sub = shell.querySelector(".companion-picker-sub");
  const list = shell.querySelector(".companion-voice-list");

  const copy = isEnglish
    ? {
        title: "Choose voice",
        sub: "More natural, emotional speech — pick a tone you like.",
      }
    : {
        title: "選擇語音",
        sub: "更自然、更有情緒嘅聲線 — 揀一個你喜歡嘅音色。",
      };

  if (title) title.textContent = copy.title;
  if (sub) sub.textContent = copy.sub;

  function render() {
    if (!list) return;
    list.innerHTML = "";
    const voices = voicesForLang(langCode);
    for (const voice of voices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `companion-voice-option${voice.id === selectedId ? " is-selected" : ""}`;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", voice.id === selectedId ? "true" : "false");
      const gender =
        voice.gender === "male"
          ? isEnglish
            ? "Male"
            : "男聲"
          : isEnglish
            ? "Female"
            : "女聲";
      btn.innerHTML = `
        <span class="companion-voice-option-name">${isEnglish ? voice.shortLabelEn : voice.shortLabel}</span>
        <span class="companion-voice-option-meta">${gender} · ${voice.source}</span>
      `;
      btn.addEventListener("click", () => {
        selectedId = voice.id;
        opts.onSelect?.(voice.id);
        close();
      });
      list.appendChild(btn);
    }
  }

  function openPicker() {
    render();
    shell.hidden = false;
    open = true;
  }

  function close() {
    shell.hidden = true;
    open = false;
    opts.onClose?.();
  }

  shell.querySelectorAll("[data-voice-close]").forEach((el) => {
    el.addEventListener("click", close);
  });

  return {
    open: openPicker,
    close,
    isOpen: () => open,
    setSelectedId: (id) => {
      selectedId = id;
      render();
    },
    getSelectedId: () => selectedId,
    labelFor: (id) => voiceShortLabel(id, langCode, isEnglish),
  };
}
