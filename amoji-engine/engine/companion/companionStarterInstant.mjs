/**
 * Instant replies for tutorial starter chips — no LLM wait; pair with TTS preload.
 */
import {
  buildDemoBootReplyEn,
  pickTutorialStarterPrompts,
} from "./companionDemoDialogue.mjs";
import { localCompanionReply } from "./companionLocalReply.mjs";
import { normalizeSpeechForCompare } from "./companionVoiceGate.js";

export const COMPANION_STARTER_INSTANT_SCHEMA = "amoji.companionStarterInstant.v1";

/** @type {Readonly<Record<string, { en: string, yue: string }>>} */
export const TUTORIAL_CAT_INSTANT_REPLIES = Object.freeze({
  intro: {
    en: "I'm your 3D companion — chat by voice or text, open Menu for scenes, Today & tasks, and Brain. Tap me or use the mic anytime! [action:wave] [mood:happy] [nuance:excited]",
    yue: "我係你 3D 伙伴 — 語音定打字都得，Menu 有 scene、今日 task 同 Brain。試 mic 或者戳我啦！ [action:wave] [mood:happy]",
  },
  voice: {
    en: "Turn the mic on, speak, pause — I'll reply out loud. You can barge in while I'm talking. Type works too if you prefer text. [mood:happy] [nuance:curious]",
    yue: "開 mic 講嘢，停一停我就會用把聲答你；我講嘢時你都可以插嘴。唔想講就打字都得。 [mood:happy]",
  },
  chat: {
    en: "Type in the box or use voice — I'll answer in short bubbles and remember this chat for the session. [mood:neutral] [nuance:curious]",
    yue: "喺框度打字或者語音都得 — 我會用短句答，呢個 session 會記住我哋傾過嘅嘢。 [mood:neutral]",
  },
  poke: {
    en: "Tap my body for a quick reaction — while I'm speaking it's body-only so we don't interrupt the reply. [action:wave] [mood:happy] [nuance:shy]",
    yue: "戳我身體會有 quick reaction — 我講緊嘢時只會郁身，唔會截斷把聲。 [action:wave] [mood:happy]",
  },
  camera: {
    en: "Drag empty space to orbit, pinch or scroll to zoom. Double-click the stage to reset the front view. [mood:neutral]",
    yue: "拖空白位 orbit 鏡頭， pinch/scroll 放大縮細；雙擊 stage 重置正面視角。 [mood:neutral]",
  },
  scene: {
    en: "Open Menu → pick a scene chip for a new backdrop. Your choice saves for next time. [mood:happy]",
    yue: "開 Menu → 揀 scene chip 換背景，下次會記住。 [mood:happy]",
  },
  motion: {
    en: "Ask for a wave, dance, or mood — I'll move and match my face. Try “wave at me”! [action:wave] [mood:happy]",
    yue: "同我講「揮手」「跳舞」或者 mood — 我會郁同改表情。試下「同我揮手」！ [action:wave] [mood:happy]",
  },
  menu: {
    en: "Gold Menu (top-right): Brain for the LLM, Today & tasks, Session language, speaker, and Switch 3D companion. [mood:neutral]",
    yue: "右上角金色 Menu：Brain 换 LLM、今日 task、Session 语言、喇叭同换角色。 [mood:neutral]",
  },
  character: {
    en: "Use Menu → Switch 3D companion or the top-left chip to pick someone else — voice and personality follow the character. [mood:happy]",
    yue: "Menu → Switch 3D companion 或者左上角 chip 可以换角色 — 把声同性格跟角色走。 [mood:happy]",
  },
  secretary: {
    en: "Menu → Today & tasks opens your planner — ask me to prioritize, check in, or organize your day. [mood:thinking] [nuance:curious]",
    yue: "Menu → Today & tasks 开 planner — 可以叫我帮你排优先、check-in 或者整理今日。 [mood:thinking]",
  },
  personality: {
    en: "I'm listening — tell me more and I'll follow your lead. [mood:happy] [nuance:curious]",
    yue: "我喺度聽 — 你繼續講，我會跟住你。 [mood:happy]",
  },
});

/**
 * @param {string} question
 */
export function starterPromptLookupKey(question) {
  return normalizeSpeechForCompare(question);
}

/**
 * @param {string} question
 * @param {{ characterId?: string, isEnglish?: boolean, cat?: string }} [opts]
 */
export function buildTutorialStarterReply(
  question,
  { characterId = "nova", isEnglish = false, cat = "" } = {},
) {
  const lang = isEnglish ? "en" : "yue";
  const bucket = TUTORIAL_CAT_INSTANT_REPLIES[cat];
  if (bucket?.[lang]) return bucket[lang];

  if (isEnglish) {
    const demo = buildDemoBootReplyEn(question);
    if (demo) return demo;
    return buildDemoBootReplyEn("");
  }

  void characterId;
  return localCompanionReply(question);
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ max?: number, seed?: string, detailed?: boolean }} [opts]
 * @returns {{ question: string, reply: string, cat: string, tutorial: boolean, key: string }[]}
 */
export function buildStarterInstantPack(characterId, isEnglish = false, opts = {}) {
  const detailed = pickTutorialStarterPrompts(characterId, isEnglish, {
    max: opts.max,
    seed: opts.seed,
  });
  return detailed.map((entry) => {
    const reply = buildTutorialStarterReply(entry.text, {
      characterId,
      isEnglish,
      cat: entry.cat,
    });
    return {
      question: entry.text,
      reply,
      cat: entry.cat,
      tutorial: entry.tutorial,
      key: starterPromptLookupKey(entry.text),
    };
  });
}
