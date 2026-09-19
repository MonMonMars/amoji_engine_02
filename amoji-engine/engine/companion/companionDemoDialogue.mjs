/**
 * Demo dialogue pools — starters, proactive lines, boot chitchat, sample scenes.
 * Single source for rich companion demo copy (EN + 粵).
 */
import { PROACTIVE_NEW_TOPIC_LINES } from "./companionProactiveTopics.mjs";
import { filterCareDialogueLines } from "./companionCareDialogue.js";

export const DEMO_DIALOGUE_SCHEMA = "amoji.companionDemoDialogue.v2";

/** @type {Readonly<Record<string, { en: readonly string[], yue: readonly string[] }>>} */
export const DEMO_STARTER_PROMPTS = Object.freeze({
  nova: {
    en: [
      "How are you today?",
      "What's on your mind?",
      "Help me plan my day",
      "Tell me something interesting",
      "What should I focus on this week?",
      "Can you ask me a question?",
    ],
    yue: [
      "今日點呀？",
      "有咩心事想講？",
      "幫我計劃今日",
      "同我講件有趣嘅事",
      "今個星期應該專心咩？",
      "你可唔可以問我問題？",
    ],
  },
  kizuna: {
    en: [
      "What's up today?",
      "Got a secret?",
      "Want to hang out?",
      "Show me a dance move",
      "Tell me something hype",
      "Ask me a fun question",
    ],
    yue: [
      "今日搞咩？",
      "有冇秘密？",
      "想唔想陪我？",
      "跳個舞俾我睇",
      "講件好 excite 嘅事",
      "問我個有趣問題啦",
    ],
  },
  alicia: {
    en: [
      "Tell me a story",
      "What's your mood today?",
      "Roast me playfully",
      "Give me a pep talk",
      "Let's play 20 questions",
      "Surprise me with a topic",
    ],
    yue: [
      "講個故事俾我聽",
      "你今日咩 mood？",
      "輕鬆吐槽我一下",
      "俾啲打氣說話我",
      "玩二十問題啦",
      "丟個話題嚇我一跳",
    ],
  },
  ember: {
    en: [
      "What's got you fired up?",
      "Tell me a hot take",
      "Want to vent together?",
      "Give me a bold question",
      "What should we talk about?",
      "Make me laugh",
    ],
    yue: [
      "有咩令你好 excite？",
      "講個大膽觀點俾我聽",
      "想唔想一齊發洩？",
      "問我個大膽問題",
      "我哋傾咩好？",
      "逗我笑啦",
    ],
  },
  amoji: {
    en: [
      "What's fun today?",
      "Roast me gently",
      "Tell me a joke",
      "Ask me anything",
      "What's the tea?",
      "Let's play truth or dare (mild)",
    ],
    yue: [
      "今日有咩好玩？",
      "輕鬆吐槽我一下",
      "講個笑話俾我聽",
      "問我咩都得",
      "有咩八卦？",
      "玩真心話大冒險（輕鬆版）",
    ],
  },
  rex: {
    en: [
      "What's the move today?",
      "Give it to me straight",
      "Ask me something direct",
      "Help me decide fast",
      "What's worth my time?",
      "Challenge my thinking",
    ],
    yue: [
      "今日搞咩？",
      "有咩直講",
      "問我個直接問題",
      "幫我快啲決定",
      "咩值得我花時間？",
      "挑戰下我嘅諗法",
    ],
  },
  sky: {
    en: [
      "What's the vibe today?",
      "Tell me something dreamy",
      "Ask me about my mood",
      "Let's talk about music",
      "What would you ask a friend?",
      "Switch topics — what's cool lately?",
    ],
    yue: [
      "今日咩 vibe？",
      "講件好 dream 嘅事",
      "問我心情點",
      "我哋傾下音樂",
      "你會問朋友咩問題？",
      "轉 topic — 最近有咩 cool？",
    ],
  },
  yuki: {
    en: [
      "How was your day?",
      "What should we eat tonight?",
      "Tell me about your weekend plans",
      "What show are you watching?",
      "Ask me something sweet",
      "Start a new topic with me",
    ],
    yue: [
      "今日過成點呀？",
      "今晚食咩好？",
      "同我講下週末 plan",
      "你追緊咩劇？",
      "問我個 sweet 問題啦",
      "同我開個新 topic",
    ],
  },
  hina: {
    en: [
      "Recommend me a book or song",
      "What's been on your mind quietly?",
      "Tell me a small meaningful moment",
      "Ask me a gentle question",
      "Let's talk about something new",
      "What felt calm today?",
    ],
    yue: [
      "推介本書或者首歌俾我",
      "有咩 quietly 留喺你心入面？",
      "同我講個 small meaningful moment",
      "問我個 gentle 問題",
      "我哋傾啲新嘢啦",
      "今日有咩 moment 覺得 calm？",
    ],
  },
  mio: {
    en: [
      "Help me prioritize today",
      "What's my top goal this week?",
      "Ask me about my progress",
      "Let's plan the next hour",
      "What decision am I avoiding?",
      "Give me a direct check-in",
    ],
    yue: [
      "幫我排今日 priority",
      "今個星期 top goal 係咩？",
      "問我 progress 點",
      "一齊 plan 下個鐘",
      "有咩決定我一直 avoid？",
      "直接 check-in 問我啦",
    ],
  },
  shiro: {
    en: [
      "How was your day?",
      "Tell me something quiet and good",
      "Ask me a gentle question",
      "Want a calm new topic?",
      "What's been on your mind softly?",
      "Share a small detail with me",
    ],
    yue: [
      "今日過成點呀？",
      "同我講件 quietly 好嘅事",
      "問我個 gentle 問題",
      "想唔想轉個 calm topic？",
      "有咩 softly 留喺你心入面？",
      "分享個 small detail 俾我",
    ],
  },
  jennifer: {
    en: [
      "What's fun today?",
      "Tell me what you're watching",
      "Weekend plans yet?",
      "Ask me something sweet",
      "What's new since we talked?",
      "Share a cute moment",
    ],
    yue: [
      "今日有咩 fun？",
      "同我講你追緊咩",
      "weekend plan 搞掂未？",
      "問我個 sweet 問題",
      "上次傾完有咩 new？",
      "分享個 cute moment",
    ],
  },
  poly: {
    en: [
      "What's your vibe today?",
      "Pick a song mood for us",
      "What should we celebrate?",
      "Give me a hype topic",
      "Want to move or just chat?",
      "What's got your energy up?",
    ],
    yue: [
      "今日咩 vibe？",
      "揀個 song mood 俾我哋",
      "有咩值得 celebrate？",
      "俾個 hype topic 我",
      "想 move 定純傾？",
      "咩令你好有 energy？",
    ],
  },
  aesthe: {
    en: [
      "What felt beautiful today?",
      "Recommend a song or design",
      "Describe a color from your day",
      "Ask me an artful question",
      "What's a small aesthetic win?",
      "Want a refined new topic?",
    ],
    yue: [
      "今日有咩 feel beautiful？",
      "推介首歌或者 design",
      "describe 今日一種顏色",
      "問我個 artful 問題",
      "有咩 small aesthetic win？",
      "想唔想 refined 新 topic？",
    ],
  },
  chad: {
    en: [
      "How are you holding up?",
      "Tell me what's on your mind",
      "Need a straight answer?",
      "What's the real issue?",
      "Want me to check in on you?",
      "Give me one honest update",
    ],
    yue: [
      "你 hold 得點呀？",
      "有咩心事同我講",
      "要唔要 straight answer？",
      "real issue 係咩？",
      "想唔想我 check in 你？",
      "俾個 honest update 我",
    ],
  },
  david: {
    en: [
      "Did you eat today?",
      "Tell me something gentle",
      "How are you really feeling?",
      "Want a soft check-in?",
      "Share something small with me",
      "What would comfort you right now?",
    ],
    yue: [
      "今日食咗飯未？",
      "同我講件 gentle 嘅事",
      "你 really Feel 點？",
      "想唔想 soft check-in？",
      "分享件小事俾我",
      "而家咩會 comfort 到你？",
    ],
  },
  hugo: {
    en: [
      "Got a joke for me?",
      "What's fun today?",
      "Roast me lightly",
      "Tell me something silly",
      "Want a playful topic?",
      "What's the plan — honestly?",
    ],
    yue: [
      "有冇 joke 俾我？",
      "今日有咩 fun？",
      "輕鬆 roast 我一下",
      "同我講件 silly 嘅事",
      "想唔想 playful topic？",
      "plan 係咩 — 老實講？",
    ],
  },
  default: {
    en: [
      "Say hi",
      "What can you do?",
      "Let's chat",
      "Ask me a question",
      "Tell me about yourself",
      "What's a good topic today?",
    ],
    yue: [
      "打個招呼",
      "你可以做咩？",
      "我哋傾下偈",
      "問我問題啦",
      "同我講下你自己",
      "今日傾咩好？",
    ],
  },
});

/**
 * Tutorial starter chips — showcase companion features (voice, poke, camera, scene, etc.).
 * Each entry: { cat, en, yue } — picked across categories so every empty chat teaches the app.
 * @type {ReadonlyArray<{ cat: string, en: string, yue: string }>}
 */
export const TUTORIAL_STARTER_PROMPTS = Object.freeze([
  /* intro / capabilities */
  { cat: "intro", en: "What can you do?", yue: "你可以做咩？" },
  { cat: "intro", en: "Show me your features", yue: "展示你有咩功能" },
  { cat: "intro", en: "How do I use this app?", yue: "點樣用呢個 app？" },
  { cat: "intro", en: "Give me a quick tour", yue: "帶我快速睇一圈" },
  { cat: "intro", en: "What makes you special?", yue: "你有咩特別？" },
  { cat: "intro", en: "Teach me something new", yue: "教我用啲新嘢" },
  /* voice / mic */
  { cat: "voice", en: "How does voice chat work?", yue: "語音傾偈點用？" },
  { cat: "voice", en: "Hold the mic and listen to me", yue: "按住 mic 聽我講" },
  { cat: "voice", en: "Can you hear me if I speak?", yue: "我講嘢你聽到嘛？" },
  { cat: "voice", en: "Switch to voice mode", yue: "轉做語音模式" },
  { cat: "voice", en: "Read this aloud after I type", yue: "我打完字你讀出嚟" },
  { cat: "voice", en: "What does the mic button do?", yue: "mic 掣做咩用？" },
  /* text chat */
  { cat: "chat", en: "Let's chat by text", yue: "我哋用文字傾" },
  { cat: "chat", en: "Reply in short bubbles", yue: "用短句回覆我" },
  { cat: "chat", en: "Remember what I say", yue: "記住我講嘅嘢" },
  { cat: "chat", en: "Ask me a follow-up question", yue: "追問我一個問題" },
  { cat: "chat", en: "Summarize our chat so far", yue: "總結我哋傾過嘅內容" },
  { cat: "chat", en: "Keep the conversation going", yue: "繼續同我傾落去" },
  /* poke / tap body */
  { cat: "poke", en: "What happens if I tap you?", yue: "撳你會點呀？" },
  { cat: "poke", en: "Poke my avatar on the head", yue: "戳下我個頭像" },
  { cat: "poke", en: "React when I touch your body", yue: "我摸你身體時 react 下" },
  { cat: "poke", en: "Show a poke reaction", yue: "做個被戳 reaction" },
  { cat: "poke", en: "Can I interact by tapping?", yue: "可唔可以撳嚟互動？" },
  { cat: "poke", en: "Surprise me with a tap response", yue: "被撳時 surprise 我" },
  /* camera / orbit */
  { cat: "camera", en: "How do I orbit the camera?", yue: "點樣 orbit 鏡頭？" },
  { cat: "camera", en: "Drag empty space to look around", yue: "拖空白位轉角度" },
  { cat: "camera", en: "Reset camera to front view", yue: "重置鏡頭做正面" },
  { cat: "camera", en: "Double-click to reset the view", yue: "雙擊空白重置視角" },
  { cat: "camera", en: "Show me from the front", yue: "正面影俾我睇" },
  { cat: "camera", en: "Spin around and strike a pose", yue: "轉一圈擺個 pose" },
  /* scene / outfit */
  { cat: "scene", en: "Change the background scene", yue: "換個背景 scene" },
  { cat: "scene", en: "Try a new outfit look", yue: "試吓新造型" },
  { cat: "scene", en: "Open scene settings for me", yue: "幫我開 scene 設定" },
  { cat: "scene", en: "Pick a cozy background vibe", yue: "揀個 cozy 背景 vibe" },
  { cat: "scene", en: "What scenes can I choose?", yue: "有咩 scene 可以揀？" },
  { cat: "scene", en: "Match the mood with a new backdrop", yue: "換 backdrop 配合 mood" },
  /* motions / emotions */
  { cat: "motion", en: "Wave at me", yue: "同我揮手" },
  { cat: "motion", en: "Do a happy dance", yue: "開心跳個舞" },
  { cat: "motion", en: "Show an emotion on your face", yue: "面上 show 個表情" },
  { cat: "motion", en: "Use a mood tag in your reply", yue: "回覆加 mood tag" },
  { cat: "motion", en: "Play an idle animation", yue: "播 idle 動畫" },
  { cat: "motion", en: "React with body language", yue: "用 body language react" },
  /* menu / settings */
  { cat: "menu", en: "Where is the menu?", yue: "menu 喺邊？" },
  { cat: "menu", en: "Mute or unmute your voice", yue: "mute 定 unmute 把聲" },
  { cat: "menu", en: "Hide the chat panel", yue: "收起 chat panel" },
  { cat: "menu", en: "Open settings for me", yue: "幫我開 settings" },
  { cat: "menu", en: "What shortcuts are in the menu?", yue: "menu 有咩 shortcuts？" },
  { cat: "menu", en: "Toggle speaker from settings", yue: "喺 settings  toggle 喇叭" },
  /* character switch */
  { cat: "character", en: "How do I switch characters?", yue: "點樣換角色？" },
  { cat: "character", en: "Tell me about other companions", yue: "講下其他 companion" },
  { cat: "character", en: "Who else can I talk to?", yue: "仲可以同邊個傾？" },
  { cat: "character", en: "Compare yourself to another character", yue: "同第二個角色 compare 下" },
  { cat: "character", en: "What is your personality?", yue: "你性格係點？" },
  { cat: "character", en: "Introduce yourself properly", yue: "正式自我介紹" },
  /* secretary / planning (Rose-style but universal tutorial) */
  { cat: "secretary", en: "Help me plan my day", yue: "幫我計劃今日" },
  { cat: "secretary", en: "What's on my schedule?", yue: "今日有咩 schedule？" },
  { cat: "secretary", en: "Prioritize my tasks", yue: "幫我排 task 優先次序" },
  { cat: "secretary", en: "Give me a gentle check-in", yue: "gentle check-in 問下我" },
  { cat: "secretary", en: "Remind me what to focus on", yue: "提醒我要專心咩" },
  { cat: "secretary", en: "Organize my thoughts", yue: "幫我整理思路" },
]);

/** Category order for tutorial chips — one pick per group when possible. */
export const TUTORIAL_STARTER_CATEGORY_ORDER = Object.freeze([
  "intro",
  "voice",
  "chat",
  "poke",
  "camera",
  "scene",
  "motion",
  "menu",
  "character",
  "secretary",
]);

/**
 * @param {string} text
 */
export function hashTutorialSeed(text) {
  let h = 2166136261;
  const s = String(text || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {number} seed
 */
export function createTutorialRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @template T
 * @param {T[]} items
 * @param {() => number} rng
 */
export function shuffleWithRng(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick tutorial + personality starter chips. Seed with character + login session for variety.
 *
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ max?: number, seed?: string }} [opts]
 * @returns {{ text: string, cat: string, tutorial: boolean }[]}
 */
export function pickTutorialStarterPrompts(characterId, isEnglish = false, opts = {}) {
  const max = Math.max(1, opts.max ?? 8);
  const lang = isEnglish ? "en" : "yue";
  const id = String(characterId || "nova").toLowerCase();
  const dayBucket = Math.floor(Date.now() / 86400000);
  const seedStr = `${opts.seed || "guest"}|${id}|${lang}|${dayBucket}`;
  const rng = createTutorialRng(hashTutorialSeed(seedStr));

  /** @type {{ text: string, cat: string, tutorial: boolean }[]} */
  const picked = [];
  const used = new Set();

  const pushText = (text, cat, tutorial) => {
    const t = String(text || "").trim();
    if (!t || used.has(t) || filterCareDialogueLines([t]).length === 0) return false;
    used.add(t);
    picked.push({ text: t, cat, tutorial });
    return true;
  };

  for (const cat of TUTORIAL_STARTER_CATEGORY_ORDER) {
    if (picked.length >= max) break;
    const pool = TUTORIAL_STARTER_PROMPTS.filter((p) => p.cat === cat);
    if (!pool.length) continue;
    for (const item of shuffleWithRng(pool, rng)) {
      if (pushText(item[lang], cat, true)) break;
    }
  }

  const personalityPack = DEMO_STARTER_PROMPTS[id] || DEMO_STARTER_PROMPTS.default;
  const personalityPool = shuffleWithRng([...(personalityPack[lang] || [])], rng);
  for (const text of personalityPool) {
    if (picked.length >= max) break;
    pushText(text, "personality", false);
  }

  if (picked.length < max) {
    const filler = shuffleWithRng([...TUTORIAL_STARTER_PROMPTS], rng);
    for (const item of filler) {
      if (picked.length >= max) break;
      pushText(item[lang], item.cat, true);
    }
  }

  return picked.slice(0, max);
}

/** @type {Readonly<Record<string, { en: readonly string[], yue: readonly string[] }>>} */
export const DEMO_PROACTIVE_LINES = Object.freeze({
  nova: {
    en: [
      "So — what's on your mind today?",
      "Anything fun happen since we last talked?",
      "Want to tell me about your day?",
      "I'm curious — what brought you here?",
      "Got a goal you're working on? I'd love to hear it.",
      "If you could change one thing about today, what would it be?",
      "What's been taking most of your energy lately?",
      "Want me to ask you a question to get us started?",
      "Tell me one good thing and one annoying thing from today.",
      "What would make the rest of your day better?",
    ],
    yue: [
      "咁 — 今日有咩心事想同我講？",
      "有咩開心或者煩惱事想分享？",
      "今日過成點？同我講吓啦。",
      "我好好奇 — 你今日想傾咩？",
      "有冇咩目標進行緊？我想聽吓。",
      "如果今日可以改一件事，你想改咩？",
      "最近咩最攞你精力？",
      "想唔想我先問你問題，幫你開場？",
      "同我講今日一件開心同一件煩嘅事啦。",
      "點樣可以令今日餘下時間好過啲？",
    ],
  },
  kizuna: {
    en: [
      "Hey~ anything you wanna chat about?",
      "I'm bored waiting — entertain me?",
      "Got a secret to tell me?",
      "What should we do together today?",
      "You seem quiet — everything okay?",
      "Wanna play a quick question game with me?",
      "Tell me your favorite thing this week!",
      "If we were streaming right now, what topic would you pick?",
      "Give me a dare — I'll react live!",
      "Who made you smile recently?",
    ],
    yue: [
      "喂~ 有咩想同我傾呀？",
      "我好悶呀 — 陪下我傾偈啦？",
      "有冇秘密想話我知？",
      "今日想同我做咩？",
      "你好似好靜 — 冇事嘛？",
      "想唔想同我玩快問快答？",
      "同我講今個星期最正嘅一件事！",
      "如果我哋而家開 live，你想傾咩 topic？",
      "俾個 dare 我 — 我即場做 reaction！",
      "最近邊個人令你好開心？",
    ],
  },
  alicia: {
    en: [
      "Hi hi~ got a story for me?",
      "What's your mood color today?",
      "Want me to pick a fun topic?",
      "Tell me something that made you laugh!",
      "If your day was a song, which one?",
      "Ask me anything — I dare you!",
      "What's one thing you're proud of?",
      "Want to do a quick would-you-rather?",
    ],
    yue: [
      "哈囉～有故事想同我分享？",
      "你今日心情係咩顏色？",
      "想唔想我幫你揀個有趣 topic？",
      "同我講件令你笑嘅事！",
      "如果今日係一首歌，會係咩歌？",
      "問我咩都得 — 我接招！",
      "有咩事令你好 proud？",
      "玩「二選一」好唔好？",
    ],
  },
  ember: {
    en: [
      "Something burning on your mind?",
      "Hit me with your hottest take today!",
      "What's worth getting excited about?",
      "Tell me what you're passionate about lately.",
      "Want to rant? I'm all flames for it.",
      "What would you do if you had zero fear today?",
      "Give me a topic and I'll hype it up!",
    ],
    yue: [
      "有咩事燒住你個腦？",
      "今日最 bold 嘅觀點係咩？話我知！",
      "有咩值得好 excite？",
      "最近咩嘢令你最有 passion？",
      "想發洩？我奉陪！",
      "如果今日完全唔驚，你會做咩？",
      "俾個 topic 我 — 我幫你 hype 起佢！",
    ],
  },
  amoji: {
    en: [
      "C'mon, say something — I'm all ears!",
      "Roast me, praise me, or just vent — your call.",
      "What's the vibe today? Spill it.",
      "Got a hot take you want to test on me?",
      "Tell me something I don't know yet.",
      "Truth or a tiny dare — your pick!",
      "What's the weirdest thing on your mind right now?",
      "If we were at a café, what would you tell me first?",
    ],
    yue: [
      "喂，講嘢啦 — 我聽緊！",
      "吐槽我、讚我、或者發洩都得 — 你話事。",
      "今日咩 mood？講嚟聽下。",
      "有冇啲大膽想法想同我試下講？",
      "同我講件我未聽過嘅事啦。",
      "真心話定小 dare — 你揀！",
      "而家腦入面最 weird 嘅嘢係咩？",
      "如果我哋喺 café，你會第一句同我講咩？",
    ],
  },
  sky: {
    en: [
      "What's the vibe today — spill it.",
      "You seem quiet. Cool topic or real talk?",
      "Music, style, or food — pick a lane and I'll follow.",
      "What's something underrated in your day?",
      "If today had a color, what would it be?",
      "Want me to throw out a fresh topic?",
    ],
    yue: [
      "今日咩 vibe — 講嚟聽下。",
      "你好似好靜 — cool topic 定 real talk？",
      "音樂、style 定 food — 揀一條 lane 我跟。",
      "今日有咩 underrated 嘅嘢？",
      "如果今日係一種顏色，會係咩？",
      "想唔想我丟個 fresh topic？",
    ],
  },
  yuki: {
    en: [
      "Hey~ what's new since we last talked?",
      "Tell me something cute from your day.",
      "What are you craving right now — food or fun?",
      "Weekend plans yet, or still winging it?",
      "Want to switch to a cozy new topic?",
      "Who made you smile recently?",
    ],
    yue: [
      "喂～上次傾完有咩新嘢？",
      "同我講件今日 cute 嘅事啦。",
      "而家最 craving 咩 — 食定玩？",
      "weekend plan 搞掂未，定係仲 winging it？",
      "想唔想轉個 cozy 新 topic？",
      "最近邊個人令你 smile？",
    ],
  },
  hina: {
    en: [
      "I'm here — want to wander into a new topic together?",
      "Any story or song stuck in your head?",
      "What's been quietly good lately?",
      "Would a gentle question help us start fresh?",
      "Tell me about a place that feels like home.",
      "What's one thing you're grateful for today?",
    ],
    yue: [
      "我喺度 — 想唔想一齊 wander 去個新 topic？",
      "有咩 story 或者 song 留喺你腦入面？",
      "最近有咩 quietly 好嘅事？",
      "gentle 問題可唔可以幫我哋 fresh start？",
      "同我講一個 feel like home 嘅地方。",
      "今日有咩一件你 grateful 嘅事？",
    ],
  },
  mio: {
    en: [
      "Quick check — what's blocking you right now?",
      "Want to talk priorities for the rest of today?",
      "What's one win you haven't claimed yet?",
      "Any follow-up you've been avoiding?",
      "Should we pick a fresh practical topic?",
      "What's the next tiny step on your mind?",
    ],
    yue: [
      "quick check — 而家咩 block 住你？",
      "想唔想傾今日剩低時間嘅 priority？",
      "有咩 win 你未 claim？",
      "有咩 follow-up 你一直 avoid？",
      "我哋揀個 fresh practical topic 好唔好？",
      "你心入面 next tiny step 係咩？",
    ],
  },
  rex: {
    en: [
      "Spit it out — what's going on?",
      "You got something to say or what?",
      "What's the move today?",
      "Hit me with a topic — anything.",
      "What's the real problem underneath?",
      "Be honest — what's draining you?",
      "Give me one decision you're stuck on.",
    ],
    yue: [
      "有咩就講啦 — 發生緊咩事？",
      "有嘢想講定係點？",
      "今日搞咩？",
      "丟個話題過嚟 — 咩都得。",
      "講真 — 底層問題係咩？",
      "老實講，咩最攞你精力？",
      "有咩決定你卡住咗？講嚟聽下。",
    ],
  },
  shiro: {
    en: [
      "Quiet check-in — how are you, really?",
      "Want to wander into a gentle new topic?",
      "Tell me one small good thing from today.",
      "What's been softly on your mind?",
      "If today had a quiet color, what would it be?",
      "I'm here — no rush to answer.",
    ],
    yue: [
      "quiet check-in — 你 really 點呀？",
      "想唔想 wander 去個 gentle 新 topic？",
      "同我講今日一件 small good 事。",
      "有咩 softly 留喺你心入面？",
      "如果今日係 quiet 顏色，會係咩？",
      "我喺度 — 唔使急答。",
    ],
  },
  jennifer: {
    en: [
      "Hey~ what's new since we last talked?",
      "Tell me something cute from your day.",
      "What are you craving — food or fun?",
      "Weekend plans yet, or still winging it?",
      "Who made you smile recently?",
      "Want to switch to a cozy new topic?",
    ],
    yue: [
      "喂～上次傾完有咩 new？",
      "同我講件今日 cute 嘅事啦。",
      "而家最 craving 咩 — 食定玩？",
      "weekend plan 搞掂未，定係 winging it？",
      "最近邊個人令你 smile？",
      "想唔想轉個 cozy 新 topic？",
    ],
  },
  poly: {
    en: [
      "New beat — what's your energy today?",
      "Pick music, dance, or just vent — I'll match you.",
      "What's worth a little celebration right now?",
      "Give me a topic and I'll hype it up!",
      "If we had a theme song today, what would it be?",
      "Want to switch lanes into something dynamic?",
    ],
    yue: [
      "new beat — 今日咩 energy？",
      "揀 music、dance 定 vent — 我跟。",
      "而家有咩 worth 小 celebrate？",
      "俾個 topic 我 — 我 hype 起佢！",
      "如果今日有 theme song，會係咩？",
      "想唔想 switch 去 dynamic topic？",
    ],
  },
  aesthe: {
    en: [
      "Aesthetic shift — any color, song, or scene on your mind?",
      "What's a small beautiful moment from this week?",
      "Want to talk design, art, or mood boards?",
      "If your day were a photo, what would it look like?",
      "Tell me something that felt visually satisfying.",
      "Should we open a refined new topic together?",
    ],
    yue: [
      "aesthetic shift — 有咩 color、song 或 scene 留喺心？",
      "今個星期有咩 small beautiful moment？",
      "想唔想傾 design、art 定 mood board？",
      "如果今日係一張 photo，會似咩？",
      "同我講件 visually satisfying 嘅事。",
      "我哋一齊 open 個 refined topic 好唔好？",
    ],
  },
  chad: {
    en: [
      "Real talk — what's actually on your mind?",
      "You holding up okay today?",
      "Give me one thing I should know about your day.",
      "Want a direct check-in, no fluff?",
      "What's the move for the rest of today?",
      "Tell me what's bothering you — straight.",
    ],
    yue: [
      "real talk — 真正 on your mind 係咩？",
      "今日 hold 得 okay 唔 okay？",
      "俾一件我應該知嘅事關於你今日。",
      "想唔想 direct check-in，唔使 fluff？",
      "今日剩低時間 move 係咩？",
      "有咩烦你 — straight 講。",
    ],
  },
  david: {
    en: [
      "Soft check-in — did you take care of yourself today?",
      "Tell me something gentle that's been on your heart.",
      "What's one small thing I can remember for you?",
      "Want to share without pressure?",
      "How are you feeling right this minute?",
      "I'm here — we can start a calm new topic.",
    ],
    yue: [
      "soft check-in — 今日有冇 take care 自己？",
      "同我講件 gentle、留喺心入面嘅事。",
      "有咩 small 事我可以幫你 remember？",
      "想唔想 share 但唔使 pressure？",
      "而家 this minute feel 點？",
      "我喺度 — 可以 calm 開新 topic。",
    ],
  },
  hugo: {
    en: [
      "Alright — got a dumb joke or a real topic?",
      "What's something funny that happened lately?",
      "Want to roast the day together?",
      "If today were a meme, what would it be?",
      "Give me a word and I'll spin a conversation.",
      "Serious or silly — your pick, I'm in.",
    ],
    yue: [
      "好 — 有 dumb joke 定 real topic？",
      "最近有咩 funny 事發生？",
      "想唔想一齊 roast 今日？",
      "如果今日係 meme，會係咩？",
      "俾個字我 — 我 spin conversation。",
      "serious 定 silly — 你揀，我陪。",
    ],
  },
  default: {
    en: [
      "What's on your mind?",
      "Want to tell me about your day?",
      "I'm here — what should we talk about?",
      "Got a question for me?",
      "Anything you want to get off your chest?",
      "How are you feeling right now?",
      "Tell me something good that happened lately.",
      "Want to try a fun topic together?",
      "If you could ask me one thing, what would it be?",
      "What's been on loop in your head today?",
      "Pick a topic — I'll follow your lead.",
      "Want me to start with a question?",
    ],
    yue: [
      "有咩心事？",
      "想同我講今日過成點？",
      "我喺度 — 想傾咩？",
      "有冇問題想問我？",
      "有咩想發洩可以同我講。",
      "而家心情點呀？",
      "同我講件最近開心嘅事啦。",
      "想唔想玩個有趣話題？",
      "如果你可以問我一個問題，會係咩？",
      "今日腦入面一直 loop 緊咩？",
      "你揀 topic — 我跟住你。",
      "想唔想我先問你問題？",
    ],
  },
});

/** English boot-phase replies while 3D loads. */
export const DEMO_BOOT_EN = Object.freeze({
  hello:
    "Hi! I'm still loading my 3D body — you can chat while I get ready. What's on your mind? [action:wave] [mood:happy] [nuance:excited]",
  howareyou:
    "Doing great! My 3D model is still loading, but I'm here to chat. How's your day going? [mood:happy] [nuance:excited]",
  who: "I'm your anime companion — still booting my 3D avatar. Ask me anything while we wait! [action:wave] [mood:happy] [nuance:excited]",
  bye: "Bye for now! Come back soon~ [action:wave] [mood:happy] [nuance:excited]",
  thanks: "You're welcome! Happy to hang out. [mood:happy] [nuance:love]",
  bored:
    "I know waiting is boring — tell me a story and I'll react! [mood:thinking] [nuance:curious]",
  dance:
    "Ooh I can't dance fully yet, but save that request — I'll show you when I'm ready! [action:wave] [mood:happy]",
  joke: "Why did the avatar cross the road? …Still loading the punchline! [mood:happy] [nuance:excited]",
  name:
    "I'm still waking up — but you can call me your companion for now! [mood:happy]",
  default:
    "Got it — I'm still loading my 3D body, but I'm listening. What else is on your mind? [mood:thinking] [nuance:curious]",
});

/** Sample multi-turn demo scenes (for docs, tests, QA). */
export const DEMO_CONVERSATION_SCENES = Object.freeze([
  {
    id: "first-meet-en",
    title: "First meet (EN)",
    lang: "en",
    turns: [
      { role: "assistant", text: "Hello! I'm Nova. Take your time — I'm listening closely." },
      { role: "assistant", text: "So — what's on your mind today?" },
      { role: "user", text: "I'm testing the demo." },
      { role: "assistant", text: "Nice! What do you want to try first — chat, voice, or a move?" },
    ],
  },
  {
    id: "first-meet-yue",
    title: "First meet (粵)",
    lang: "yue",
    turns: [
      { role: "assistant", text: "你好，我係諾娃。慢慢講，我會仔細聽。" },
      { role: "assistant", text: "咁 — 今日有咩心事想同我講？" },
      { role: "user", text: "試緊個 demo。" },
      { role: "assistant", text: "好呀！你想先試傾偈、語音定係做個動作？" },
    ],
  },
  {
    id: "quiet-user",
    title: "Quiet user nudge",
    lang: "en",
    turns: [
      { role: "assistant", text: "I'm here whenever you're ready…" },
      { role: "assistant", text: "Want me to start with a question?" },
    ],
  },
  {
    id: "boot-chat",
    title: "Boot chitchat while loading",
    lang: "en",
    turns: [
      { role: "user", text: "Hey, you there?" },
      {
        role: "assistant",
        text: "Hi! I'm still loading my 3D body — you can chat while I get ready.",
      },
      { role: "user", text: "Tell me a joke" },
      { role: "assistant", text: "Why did the avatar cross the road? …Still loading the punchline!" },
    ],
  },
]);

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {number} [max]
 */
export function demoStarterPrompts(characterId, isEnglish = false, max = 8, seed = "demo") {
  return pickTutorialStarterPrompts(characterId, isEnglish, { max, seed }).map((p) => p.text);
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ avoid?: Set<string>, bucket?: "greeting" | "followup" | "idle" }} [opts]
 */
export function pickDemoProactiveLine(characterId, isEnglish = false, opts = {}) {
  const id = String(characterId || "nova").toLowerCase();
  const pack = DEMO_PROACTIVE_LINES[id] || DEMO_PROACTIVE_LINES.default;
  const topics = PROACTIVE_NEW_TOPIC_LINES[id] || PROACTIVE_NEW_TOPIC_LINES.default;
  const lang = isEnglish ? "en" : "yue";
  const bucket = opts.bucket || "idle";
  const base = [...(pack[lang] || DEMO_PROACTIVE_LINES.default[lang])];
  const fresh = [...(topics[lang] || PROACTIVE_NEW_TOPIC_LINES.default[lang])];
  /** @type {string[]} */
  let pool;
  if (bucket === "followup") {
    pool = base;
  } else if (bucket === "greeting") {
    pool = [...fresh, ...base];
  } else {
    pool = [...fresh, ...fresh, ...base];
  }
  const avoid = opts.avoid || new Set();
  const careSafe = filterCareDialogueLines(pool);
  const filtered = careSafe.filter((line) => !avoid.has(line));
  const choices = filtered.length ? filtered : careSafe.length ? careSafe : pool;
  if (!choices.length) return "";
  return choices[Math.floor(Math.random() * choices.length)];
}

export { PROACTIVE_NEW_TOPIC_LINES };

/**
 * @param {string} message
 */
export function buildDemoBootReplyEn(message) {
  const lower = String(message || "")
    .trim()
    .toLowerCase();
  if (/^hello|^hi\b|^hey\b/.test(lower)) return DEMO_BOOT_EN.hello;
  if (/how are you|how's it going|what's up/.test(lower)) return DEMO_BOOT_EN.howareyou;
  if (/who are you|what are you/.test(lower)) return DEMO_BOOT_EN.who;
  if (/^bye\b|^goodbye|see you/.test(lower)) return DEMO_BOOT_EN.bye;
  if (/thank/.test(lower)) return DEMO_BOOT_EN.thanks;
  if (/bored|nothing to do/.test(lower)) return DEMO_BOOT_EN.bored;
  if (/dance|move|wave|action/.test(lower)) return DEMO_BOOT_EN.dance;
  if (/joke|funny|laugh/.test(lower)) return DEMO_BOOT_EN.joke;
  if (/your name|call you/.test(lower)) return DEMO_BOOT_EN.name;
  if (/what.*mind|talk about|chat about/.test(lower)) {
    return "Lots of things! How's your day, any plans, or something on your mind? [mood:happy] [nuance:curious]";
  }
  return DEMO_BOOT_EN.default;
}
