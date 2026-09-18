/**
 * Demo dialogue pools — starters, proactive lines, boot chitchat, sample scenes.
 * Single source for rich companion demo copy (EN + 粵).
 */

export const DEMO_DIALOGUE_SCHEMA = "amoji.companionDemoDialogue.v1";

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
  sora: {
    en: [
      "I need calm advice",
      "Explain something simply",
      "How do I unwind?",
      "Can we talk through my day?",
      "Help me name my feelings",
      "What's a gentle question for me?",
    ],
    yue: [
      "我需要啲淡定建議",
      "用簡單方式解釋件事",
      "點樣放鬆心情？",
      "可唔可以同我梳理今日？",
      "幫我講清楚而家嘅感受",
      "有咩溫柔問題想問我？",
    ],
  },
  rose: {
    en: [
      "What's on my schedule?",
      "Help me prioritize tasks",
      "Summarize my day so far",
      "What should I tackle first?",
      "Ask me about my goals",
      "Give me a check-in question",
    ],
    yue: [
      "今日有咩安排？",
      "幫我排優先次序",
      "總結我今日到而家",
      "我應該先做咩？",
      "問我關於目標嘅問題",
      "做個 check-in 問我啦",
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
    ],
    yue: [
      "今日咩 vibe？",
      "講件好 dream 嘅事",
      "問我心情點",
      "我哋傾下音樂",
      "你會問朋友咩問題？",
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
  sora: {
    en: [
      "Take your time — but I'm here if you want to talk.",
      "Is something weighing on you? You can tell me.",
      "What would feel good to chat about right now?",
      "Want to unpack your day together?",
      "Any small win you want to celebrate?",
      "What's one feeling you haven't named yet today?",
      "Would a gentle question help you open up?",
      "What's been quiet in your life lately — worth mentioning?",
    ],
    yue: [
      "唔使急 — 想傾嘅話我喺度。",
      "有冇嘢壓住你？可以同我講。",
      "而家傾咩會舒服啲？",
      "想唔想一齊梳理下今日？",
      "有冇小成就想同我分享？",
      "今日有咩感受你未講出口？",
      "想唔想我用 gentle 問題幫你打開話題？",
      "最近生活有咩變化 — 值得提一提？",
    ],
  },
  rose: {
    en: [
      "What's on your schedule — anything I can help organize?",
      "Any tasks you want to talk through?",
      "How's your day going so far?",
      "Want to plan something together?",
      "What's the one thing you'd regret not doing today?",
      "Should we do a quick priorities check-in?",
      "Any follow-ups you're avoiding?",
    ],
    yue: [
      "今日有咩安排 — 有冇我可以幫手整理？",
      "有冇任務想同我傾清楚？",
      "今日過到而家點呀？",
      "想唔想一齊計劃啲嘢？",
      "今日有咩事唔做會後悔？",
      "做個優先次序 check-in 好唔好？",
      "有冇啲 follow-up 你一直拖住？",
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
export function demoStarterPrompts(characterId, isEnglish = false, max = 6) {
  const id = String(characterId || "nova").toLowerCase();
  const pack = DEMO_STARTER_PROMPTS[id] || DEMO_STARTER_PROMPTS.default;
  const lang = isEnglish ? "en" : "yue";
  return [...(pack[lang] || DEMO_STARTER_PROMPTS.default[lang])].slice(0, max);
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {{ avoid?: Set<string> }} [opts]
 */
export function pickDemoProactiveLine(characterId, isEnglish = false, opts = {}) {
  const id = String(characterId || "nova").toLowerCase();
  const pack = DEMO_PROACTIVE_LINES[id] || DEMO_PROACTIVE_LINES.default;
  const lang = isEnglish ? "en" : "yue";
  const pool = [...(pack[lang] || DEMO_PROACTIVE_LINES.default[lang])];
  const avoid = opts.avoid || new Set();
  const filtered = pool.filter((line) => !avoid.has(line));
  const choices = filtered.length ? filtered : pool;
  if (!choices.length) return "";
  return choices[Math.floor(Math.random() * choices.length)];
}

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
