/**
 * Settings menu copy — synced labels for minimal companion chrome.
 */
import { formatTalkSpeedLabel } from "./companionTalkSpeed.js";

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
      ? "0.45× Slow"
      : "0.45× 慢";
  const chatVisible = state.chatVisible !== false;
  const speakerOn = state.speakerOn !== false;

  return {
    menuTitle: en ? "Menu" : "選單",
    closeAria: en ? "Close menu" : "關閉選單",
    session: en ? "Session" : "連線",
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
    roleSection: en ? "Mode" : "模式",
    roleHint: en
      ? "One 3D app — girlfriend, boyfriend, secretary, or pet."
      : "同一個 3D app — 女朋友、男朋友、秘書或寵物。",
    secretaryToday: en ? "Today briefing" : "今日簡報",
    secretaryTasks: en ? "Task list" : "任務清單",
    labLink: en ? "Voice lab" : "語音實驗室",
    listOllama: en ? "List Ollama models" : "列出 Ollama 模型",
    saveLlm: en ? "Save LLM" : "儲存 LLM",
    saveCloudKey: en ? "Save key & connect" : "儲存 key 並連線",
    llmUrlLabel: en ? "LLM base URL (OpenAI-compatible)" : "LLM 網址（OpenAI 相容）",
    modelLabel: en ? "Model" : "模型",
    apiKeyLabel: en ? "API key (optional — Ollama needs none)" : "API key（可選 — Ollama 唔需要）",
    cloudKeyLabel: en ? "Free API key" : "免費 API key",
  };
}
