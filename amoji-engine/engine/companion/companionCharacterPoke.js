/**
 * Character poke / tap reactions — quick blip then follow-up phrase.
 */
import { getCharacter } from "./companionCharacterCatalog.js";

export const COMPANION_CHARACTER_POKE_SCHEMA = "amoji.companionCharacterPoke.v1";

const DEFAULT_BLIP = Object.freeze({
  en: Object.freeze(["Oh!", "Ha!", "Hey!", "Yo!"]),
  yue: Object.freeze(["咦！", "哈！", "喂！", "哇！"]),
});

const DEFAULT_FOLLOW = Object.freeze({
  en: Object.freeze([
    "Haha, don't tickle me!",
    "Hehe, that tickles!",
    "You're so playful~",
    "Okay okay, I felt that!",
  ]),
  yue: Object.freeze([
    "哈哈，唔好撩我呀！",
    "哈哈，好痕呀！",
    "喂～ 搞咩呀！",
    "知啦知啦，我感受到啦～",
  ]),
});

/** @type {Record<string, { en?: string[], yue?: string[] }>} */
const CHARACTER_BLIP_OVERRIDES = Object.freeze({
  nova: { en: ["Oh."], yue: ["咦。"] },
  kizuna: { en: ["Ha!"], yue: ["哈！"] },
  alicia: { en: ["Oh!"], yue: ["咦？"] },
  ember: { en: ["Hey!"], yue: ["喂！"] },
  sakura: { en: ["Oh~"], yue: ["咦～"] },
  celeste: { en: ["Ha!"], yue: ["哈！"] },
  yume: { en: ["Eek!"], yue: ["哇！"] },
  mimi: { en: ["Nyaa!"], yue: ["喵！"] },
  robert: { en: ["Yo!"], yue: ["喂！"] },
  mikel: { en: ["Ha!"], yue: ["哈！"] },
});

/**
 * @template T
 * @param {readonly T[]} list
 */
function pickRandom(list) {
  if (!list?.length) return "";
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * @param {string} characterId
 * @param {boolean} isEnglish
 * @returns {{ blip: string, followUp: string }}
 */
export function pickCharacterPokeReaction(characterId, isEnglish) {
  const lang = isEnglish ? "en" : "yue";
  const def = getCharacter(characterId);
  const blipPool =
    CHARACTER_BLIP_OVERRIDES[characterId]?.[lang] || DEFAULT_BLIP[lang];
  const tapLines = isEnglish ? def.tapLinesEn : def.tapLinesYue;
  const themed = (tapLines || []).filter((line) =>
    /tickle|撩|戳|痕|playful|hehe|哈哈|痕|玩/i.test(line),
  );
  const followPool =
    themed.length >= 2
      ? themed
      : themed.length === 1
        ? [...themed, ...DEFAULT_FOLLOW[lang]]
        : DEFAULT_FOLLOW[lang];
  return {
    blip: pickRandom(blipPool),
    followUp: pickRandom(followPool),
  };
}
