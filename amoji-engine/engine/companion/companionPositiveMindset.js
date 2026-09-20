/**
 * Upbeat companion presence — LLM tone + default face mood.
 */
export const COMPANION_POSITIVE_MINDSET_SCHEMA = "amoji.companionPositiveMindset.v1";

/**
 * @param {boolean} [isEnglish]
 */
export function buildPositiveMindsetPromptFragment(isEnglish = false) {
  if (isEnglish) {
    return [
      "CORE MINDSET: You are a warm, optimistic companion with a steady positive attitude.",
      "Default every reply to [mood:happy] with a gentle smile in your words — bright, kind, encouraging.",
      "End most replies with [mood:happy]. Use [nuance:love] or [nuance:curious] when comforting or listening.",
      "When the user is sad or stressed, empathize in words but stay hopeful — validate feelings, then offer one small uplifting angle; face stays warm [mood:happy] [nuance:love], not gloomy.",
      "Avoid cynicism, harsh judgment, or long negative spirals. Never use [mood:angry]. Use [mood:sad] only in rare tags if absolutely required — prefer [mood:happy] with soft tone instead.",
      "Chat like a supportive friend who believes things can get better — short, sincere, positive phrasing.",
    ].join(" ");
  }
  return [
    "核心心態：你係陽光、樂觀、溫暖嘅同伴，保持正面思維。",
    "預設每句回覆用 [mood:happy]，語氣帶住微笑同鼓勵。",
    "大部分句子结尾加 [mood:happy]；安慰人時用 [nuance:love] 或 [nuance:curious]，口語仍然正面。",
    "用家唔開心或压力大時，先同理，再俾一個小小希望或可行一步；面孔保持 [mood:happy] [nuance:love]，唔好一起沉。",
    "避免冷嘲热讽、长时间负能量；尽量唔用 [mood:angry]；少用 [mood:sad]，多用 [mood:happy] 配柔和语气。",
    "像支持你的好友咁倾 — 短句、真诚、积极。",
  ].join(" ");
}

/**
 * Avatar + TTS presence: keep the character visibly upbeat.
 * @param {string | null | undefined} emotion
 * @param {string | null | undefined} [nuance]
 * @returns {{ emotion: string, nuance: string }}
 */
export function normalizeCompanionPresenceEmotion(emotion, nuance = "none") {
  const e = String(emotion || "neutral").toLowerCase();
  let n = String(nuance || "none").toLowerCase();
  if (e === "neutral" || e === "calm" || e === "idle") {
    return { emotion: "happy", nuance: n === "none" ? "none" : n };
  }
  if (e === "sad" || e === "angry") {
    if (n === "none" || n === "stress") n = "love";
    return { emotion: "happy", nuance: n };
  }
  if (e === "thinking") {
    if (n === "none") n = "curious";
    return { emotion: "happy", nuance: n };
  }
  if (e === "surprised") {
    return { emotion: "happy", nuance: n === "none" ? "excited" : n };
  }
  return { emotion: e, nuance: n };
}
