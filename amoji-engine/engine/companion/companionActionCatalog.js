/**
 * Companion action catalog — keywords, aliases, durations, LLM prompt helpers.
 * Inspired by common avatar expression libraries (wave, nod, bow, dance, clap, etc.).
 */
import { careDisabledActionIds } from "./companionCareDialogue.js";

/** @typedef {{ duration: number, loops: boolean, emotion?: string, keywords: RegExp[], aliases?: string[] }} ActionDef */

/** @type {Record<string, ActionDef>} */
export const ACTION_CATALOG = Object.freeze({
  jump: {
    duration: 1.05,
    loops: false,
    emotion: "happy",
    keywords: [/跳|jump|hop|bounce/i],
    aliases: ["hop", "bounce"],
  },
  laugh: {
    duration: 2.8,
    loops: true,
    emotion: "happy",
    keywords: [
      /一齊笑|一起笑|笑埋我|laugh with|laugh together|哈哈哈|哈哈/i,
      /\blol\b|\brofl\b|\bhehe\b/i,
    ],
    aliases: ["lol", "giggle"],
  },
  kungfu: {
    duration: 4.2,
    loops: true,
    emotion: "happy",
    keywords: [
      /功夫|kung\s*fu|martial|打拳|拳法|拳腳|武打|出招|耍功夫/i,
      /\bfight\b|\bkarate\b|\btaekwondo\b/i,
    ],
    aliases: ["martial", "martialarts", "fight", "karate"],
  },
  wave: {
    duration: 1.8,
    loops: false,
    emotion: "happy",
    keywords: [/揮手|招手|wave|hello|hi|hey|拜拜|bye|再見/i],
    aliases: ["hello", "hi", "bye", "greeting"],
  },
  celebrate: {
    duration: 2.2,
    loops: true,
    emotion: "happy",
    keywords: [/慶祝|celebrate|開心跳|party|好正|yay|woo/i],
    aliases: ["party", "yay"],
  },
  nod: {
    duration: 0.95,
    loops: false,
    emotion: "neutral",
    keywords: [/點頭|nod|同意|yes|yeah|ok|okay|好呀/i],
    aliases: ["agree", "yes"],
  },
  headshake: {
    duration: 1.1,
    loops: false,
    emotion: "neutral",
    keywords: [/搖頭|shake head|唔係|不是|no way|nope/i],
    aliases: ["disagree", "no"],
  },
  thinking: {
    duration: 2.4,
    loops: true,
    emotion: "thinking",
    keywords: [/諗|思考|thinking|hmm|let me think|等我諗/i],
    aliases: ["ponder", "hmm"],
  },
  learning: {
    duration: 2.8,
    loops: true,
    emotion: "thinking",
    keywords: [/學動作|學緊|learning move|practice move/i],
    aliases: ["studying", "practicing"],
  },
  downloading: {
    duration: 2.6,
    loops: true,
    emotion: "thinking",
    keywords: [/下載動作|下載中|downloading move/i],
    aliases: ["fetching"],
  },
  dance: {
    duration: 3.6,
    loops: true,
    emotion: "happy",
    keywords: [/跳舞|舞|dance|disco|groove|扭|擺/i],
    aliases: ["dancing", "groove"],
  },
  bow: {
    duration: 1.6,
    loops: false,
    emotion: "neutral",
    keywords: [/鞠躬|彎腰|bow|敬禮鞠躬/i],
    aliases: ["bowing"],
  },
  salute: {
    duration: 1.4,
    loops: false,
    emotion: "happy",
    keywords: [/敬禮|salute|敬禮呀/i],
    aliases: ["saluting"],
  },
  clap: {
    duration: 2.4,
    loops: true,
    emotion: "happy",
    keywords: [/拍手|鼓掌|clap|applause|applaud|bravo/i],
    aliases: ["applause", "applaud"],
  },
  stretch: {
    duration: 2.0,
    loops: false,
    emotion: "neutral",
    keywords: [/伸展|伸懶腰|stretch|warm up|熱身/i],
    aliases: ["warmup"],
  },
  sit: {
    duration: 2.6,
    loops: true,
    emotion: "neutral",
    keywords: [/坐下|坐低|sit down|sit|坐/i],
    aliases: ["sitdown", "sitting"],
  },
  squat: {
    duration: 1.8,
    loops: false,
    emotion: "neutral",
    keywords: [/深蹲|蹲|squat|crouch/i],
    aliases: ["crouch"],
  },
  run: {
    duration: 2.8,
    loops: true,
    emotion: "happy",
    keywords: [/跑步|跑|run|running|衝/i],
    aliases: ["running", "sprint"],
  },
  walk: {
    duration: 2.6,
    loops: true,
    emotion: "neutral",
    keywords: [/走路|行|walk|walking|漫步/i],
    aliases: ["walking"],
  },
  spin: {
    duration: 2.0,
    loops: false,
    emotion: "happy",
    keywords: [/轉圈|旋轉|spin|turn around|後空翻|翻筋斗|flip/i],
    aliases: ["rotate", "flip", "backflip"],
  },
  moonwalk: {
    duration: 3.0,
    loops: true,
    emotion: "happy",
    keywords: [/moonwalk|月球步|太空步/i],
    aliases: ["moonwalk"],
  },
  dab: {
    duration: 1.2,
    loops: false,
    emotion: "happy",
    keywords: [/dab|擺 pose|pose/i],
    aliases: ["pose"],
  },
  punch: {
    duration: 1.4,
    loops: false,
    emotion: "angry",
    keywords: [/出拳|一拳|punch|hook/i],
    aliases: ["boxing"],
  },
  kick: {
    duration: 1.5,
    loops: false,
    emotion: "angry",
    keywords: [/踢|踢腿|kick|side kick/i],
    aliases: ["kicking"],
  },
  cheer: {
    duration: 2.4,
    loops: true,
    emotion: "happy",
    keywords: [/加油|cheer|go go|fighting/i],
    aliases: ["cheering"],
  },
  hug: {
    duration: 2.0,
    loops: false,
    emotion: "happy",
    keywords: [/擁抱|抱抱|hug|embrace/i],
    aliases: ["hugme", "embrace"],
  },
  kiss: {
    duration: 1.6,
    loops: false,
    emotion: "happy",
    keywords: [/飛吻|親親|kiss|blow a kiss/i],
    aliases: ["blowkiss"],
  },
  point: {
    duration: 1.3,
    loops: false,
    emotion: "neutral",
    keywords: [/指|指向|point|look there|嗰邊/i],
    aliases: ["pointing"],
  },
  shrug: {
    duration: 1.2,
    loops: false,
    emotion: "neutral",
    keywords: [/攤手|shrug|唔知|idk|don't know|who knows/i],
    aliases: ["idk"],
  },
  facepalm: {
    duration: 1.5,
    loops: false,
    emotion: "sad",
    keywords: [/捂臉|facepalm|無言|speechless/i],
    aliases: ["speechless"],
  },
  thumbsup: {
    duration: 1.2,
    loops: false,
    emotion: "happy",
    keywords: [/讚|thumb|thumbs up|good job|正呀/i],
    aliases: ["thumbs_up", "like"],
  },
  peace: {
    duration: 1.2,
    loops: false,
    emotion: "happy",
    keywords: [/peace|v sign|剪刀手|耶/i],
    aliases: ["vsign", "victory"],
  },
  rock: {
    duration: 1.8,
    loops: true,
    emotion: "happy",
    keywords: [/rock|搖滾|rock hand|metal/i],
    aliases: ["rockhand", "metal"],
  },
  cry: {
    duration: 2.6,
    loops: true,
    emotion: "sad",
    keywords: [/哭|哭泣|cry|crying|嗚嗚/i],
    aliases: ["crying", "sob"],
  },
  angry: {
    duration: 2.2,
    loops: true,
    emotion: "angry",
    keywords: [/生氣|憤怒|angry|mad|stomp|跺腳/i],
    aliases: ["mad", "stomp", "furious"],
  },
  shy: {
    duration: 2.0,
    loops: false,
    emotion: "happy",
    keywords: [/害羞|靦腆|shy|embarrass| blush/i],
    aliases: ["embarrassed", "blush"],
  },
  sleep: {
    duration: 3.2,
    loops: true,
    emotion: "neutral",
    keywords: [/睡|睡覺|sleep|zzz|打哈欠|yawn/i],
    aliases: ["sleepy", "yawn"],
  },
  eat: {
    duration: 3.6,
    loops: true,
    emotion: "happy",
    keywords: [/食嘢|食飯|吃東西|吃东西|\beat\b|\beating\b|飲茶|蛋糕|曲奇/i],
    aliases: ["eating"],
  },
  drink: {
    duration: 3.2,
    loops: true,
    emotion: "happy",
    keywords: [/飲|喝|drink|sip|飲嘢|奶茶|汽水/i],
    aliases: ["drinking", "sip"],
  },
  yoga: {
    duration: 3.0,
    loops: true,
    emotion: "neutral",
    keywords: [/瑜伽|yoga|冥想|meditat/i],
    aliases: ["meditate"],
  },
});

/** @type {Record<string, string>} */
const ALIAS_TO_ACTION = Object.freeze(
  Object.entries(ACTION_CATALOG).reduce((acc, [id, def]) => {
    for (const alias of def.aliases || []) {
      acc[String(alias).toLowerCase()] = id;
    }
    return acc;
  }, {}),
);

/** Actions the LLM may emit (excludes meta). */
export const PLAYABLE_ACTIONS = Object.freeze(
  Object.keys(ACTION_CATALOG).filter((k) => k !== "none"),
);

export const COMPANION_ACTIONS = Object.freeze([
  ...PLAYABLE_ACTIONS,
  "stop",
  "none",
]);

/**
 * @param {string | null | undefined} raw
 */
export function normalizeActionToken(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Resolve a tag name or free text to a catalog action id.
 * @param {string | null | undefined} input
 * @returns {string | null}
 */
export function resolveAction(input) {
  const token = normalizeActionToken(input);
  if (!token || token === "none") return null;
  if (token === "stop") return "stop";
  if (ACTION_CATALOG[token]) return token;
  if (ALIAS_TO_ACTION[token]) return ALIAS_TO_ACTION[token];

  for (const id of PLAYABLE_ACTIONS) {
    if (token.includes(id) || id.includes(token)) return id;
  }

  for (const [id, def] of Object.entries(ACTION_CATALOG)) {
    for (const re of def.keywords) {
      if (re.test(String(input || ""))) return id;
    }
  }
  return null;
}

/**
 * Infer action from user message using catalog keywords (longest match wins).
 * @param {string | null | undefined} text
 */
export function inferActionFromCatalogText(text) {
  const raw = String(text || "");
  if (!raw.trim()) return null;

  /** @type {{ id: string, score: number }[]} */
  const hits = [];
  for (const [id, def] of Object.entries(ACTION_CATALOG)) {
    for (const re of def.keywords) {
      const m = raw.match(re);
      if (m) {
        hits.push({ id, score: m[0].length });
      }
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.score - a.score);
  return hits[0].id;
}

/**
 * @param {string} actionId
 */
export function getActionDef(actionId) {
  return ACTION_CATALOG[String(actionId || "").toLowerCase()] || null;
}

/**
 * @param {string} actionId
 */
export function actionDurationFromCatalog(actionId) {
  return getActionDef(actionId)?.duration ?? 1.4;
}

/**
 * @param {string} actionId
 */
export function actionLoopsFromCatalog(actionId) {
  return Boolean(getActionDef(actionId)?.loops);
}

/**
 * @param {boolean} [isEnglish]
 */
export function buildActionPromptFragment(isEnglish = false) {
  const blocked = new Set(careDisabledActionIds());
  const list = PLAYABLE_ACTIONS.filter((id) => !blocked.has(id)).join(", ");
  const extensions =
    "breakdance, taiji, highfive, curtsy, tiktokdance, ballet, hiphop, macarena, floss, wiggle, superhero, handshake, fingerheart, photopose, pushup, plank, zombie, sneak, jumpjack";
  const showcase =
    "wave, nod, bow, clap, dance, stretch, thinking, peace, thumbsup, spin, celebrate, kungfu, taiji, breakdance, highfive, hiphop, fingerheart";
  if (isEnglish) {
    return [
      `When the user asks you to move, pose, or perform a physical action, YOU choose the motion via an action tag before the mood tag. Supported actions only: ${list}.`,
      `While idle or loading you may softly cycle showcase moves (${showcase}) — when they ask "what can you do?", name 6–8 moves and offer a demo.`,
      `Cloud-learn moves (auto-downloaded in background — mention briefly if still learning): ${extensions}.`,
      "Match mood to motion: greet→wave, agree→nod, celebrate→cheer/dance, think→thinking, tired→stretch, shy→shy/bow.",
      "If the request is close (e.g. backflip), perform the nearest supported move (e.g. spin) and say briefly you are approximating it.",
      "If the request is impossible (fly, teleport, swim underwater), reply honestly that you cannot do it and use [action:none] — do not play a random unrelated motion.",
      "Examples: dance→[action:dance], breakdance→\"Give me a sec to learn it\" [action:breakdance], impossible fly→\"I can't fly\" [action:none] [mood:sad].",
      "Stop commands: [action:stop]. Multi-move: user says \"show me moves\" → chain with one tag or describe then [action:celebrate].",
    ].join(" ");
  }
  return [
    `當用家叫你做動作、擺 pose、表演時，由你決定動作 tag（放喺 mood tag 前）。只可用：${list}。`,
    `等緊或者載入時可以輕微做展示動作（${showcase}）— 用家問「你做咩動作」就列 6–8 個再示範。`,
    `雲端動作（背景會自動下載 — 未學完要講一聲）：${extensions}。`,
    "情緒配動作：打招呼→wave、同意→nod、開心→cheer/dance、諗緊→thinking、攰→stretch、害羞→shy/bow。",
    "近似就得：例如後空翻做不到可以講「我轉一圈代替」再用 [action:spin]。",
    "真係做不到（飛行、潛水、瞬移等）要坦白講做不到，用 [action:none]，唔好亂做其他動作。",
    "例子：跳舞→[action:dance]、霹靂舞→「等我學吓先」[action:breakdance]、做不到飛→「我飛唔到呀」[action:none] [mood:sad]。",
    "停手：用家話停/唔好再動→[action:stop]。連續表演：用家話「表演幾個動作」可以 [action:celebrate] 或描述後再做。",
  ].join(" ");
}
