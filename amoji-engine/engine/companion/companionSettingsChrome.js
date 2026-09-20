/**
 * Settings menu copy — synced labels for minimal companion chrome.
 */
import { formatTalkSpeedLabel } from "./companionTalkSpeed.js";
import {
  CHARACTER_IDS,
  listCompanionCharacters,
} from "./companionCharacterCatalog.js";

export const COMPANION_SETTINGS_CHROME_SCHEMA = "amoji.companionSettingsChrome.v1";

/**
 * @param {boolean} [isEnglish]
 * @param {{ chatVisible?: boolean, speed?: number, companionName?: string, backgroundLabel?: string, speakerOn?: boolean }} [state]
 */
export function buildSettingsChromeLabels(isEnglish = false, state = {}) {
  const en = Boolean(isEnglish);
  const name = state.companionName || (en ? "Companion" : "同伴");
  const bg = state.backgroundLabel || (en ? "Default" : "預設");
  const speed = Number(state.speed);
  const speedLabel = Number.isFinite(speed)
    ? formatTalkSpeedLabel(speed, en)
    : en
      ? "1× Normal"
      : "1× 正常";
  const chatVisible = state.chatVisible !== false;
  const speakerOn = state.speakerOn !== false;

  return {
    menuTitle: en ? "Menu" : "選單",
    closeAria: en ? "Close menu" : "關閉選單",
    session: en ? "Session" : "連線",
    experienceMode: en ? "Experience mode" : "體驗模式",
    experienceHint: en
      ? "Girlfriend, boyfriend, secretary, and pet — one app."
      : "女朋友、男朋友、秘書、寵物 — 同一個 App。",
    language: en ? "Language: English" : "語言：粵語",
    languageSwitchTitle: en ? "Switch to Cantonese (粵語)" : "Switch to English",
    chat: en
      ? chatVisible
        ? "Chat: visible"
        : "Chat: hidden"
      : chatVisible
        ? "對話：顯示"
        : "對話：收起",
    talkSpeed: en ? `Talking speed: ${speedLabel}` : `講嘢速度：${speedLabel}`,
    lookScene: en ? "Look & scene" : "造型同場景",
    background: en ? `Background: ${bg}` : `背景：${bg}`,
    outfitHint: en
      ? "Outfits: default, casual, formal — saved per companion."
      : "造型：原本、休閒、正式 — 每個同伴獨立保存。",
    companionSection: en ? "Companion" : "同伴",
    companion: en ? `Companion: ${name}` : `同伴：${name}`,
    voice: en ? "Voice" : "語音",
    speaker: en
      ? speakerOn
        ? "Speaker: on"
        : "Speaker: muted"
      : speakerOn
        ? "喇叭：開"
        : "喇叭：關",
    soundEffects: en ? "Sound effects" : "介面音效",
    haptics: en ? "Haptic feedback" : "觸感回饋",
    advanced: en ? "Advanced" : "進階",
    camera: en ? "Reset camera view" : "重置鏡頭視角",
    brain: en ? "Brain" : "大腦",
    liteLink: en ? "Secretary mode" : "秘書模式",
    roleSection: en ? "Function" : "功能",
    roleHint: en
      ? "3D character models (not the LLM below) — tap Switch companion for the full roster."
      : "3D 角色模型（唔係下面 LLM）— 按「切換同伴」睇完整名單。",
    rosterModelsHint: buildRosterModelsHint(en),
    rosterDetailsSummary: en ? "View full 3D roster" : "睇完整 3D 名單",
    roleReadout: state.roleReadout || (en ? "Girlfriend" : "女朋友"),
    secretaryToday: en ? "Today briefing" : "今日簡報",
    secretaryTasks: en ? "Task list" : "任務清單",
    labLink: en ? "Voice lab" : "語音實驗室",
    listOllama: en ? "List Ollama LLM models" : "列出 Ollama LLM 模型",
    switchCompanion: en ? "Switch 3D companion" : "切換 3D 同伴",
    saveLlm: en ? "Save LLM" : "儲存 LLM",
    saveCloudKey: en ? "Save key & connect" : "儲存 key 並連線",
    llmUrlLabel: en ? "LLM base URL (OpenAI-compatible)" : "LLM 網址（OpenAI 相容）",
    modelLabel: en ? "LLM model (text brain)" : "LLM 模型（文字大腦）",
    apiKeyLabel: en ? "API key (optional — Ollama needs none)" : "API key（可選 — Ollama 唔需要）",
    cloudKeyLabel: en ? "Free API key" : "免費 API key",
  };
}

/**
 * Short readout for settings — 23-model roster + AAA names (#5–10).
 * @param {boolean} [isEnglish]
 */
export function buildRosterModelsHint(isEnglish = false) {
  const en = Boolean(isEnglish);
  const lang = en ? "en" : "yue";
  const total = CHARACTER_IDS.length;
  const aaaNames = listCompanionCharacters(lang)
    .filter((item) => (item.number || 0) >= 5 && (item.number || 0) <= 10)
    .map((item) => item.name)
    .join(en ? ", " : "、");
  if (en) {
    return `${total} VRM models including VTuber & AAA picks (${aaaNames}). Use Switch companion or the start picker.`;
  }
  return `共 ${total} 個 VRM，包括 VTuber／AAA（${aaaNames}）。按「切換同伴」或開始畫面揀。`;
}
