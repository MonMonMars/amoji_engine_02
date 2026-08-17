/**
 * Voice ↔ Sakura robot bridge — emits plan/emotion/lip-sync events for the lab HUD.
 *
 * Events: sakura | lip_sync | done | aborted
 * HUD fields: phase, emotion, summary, steps (first steps shown in UI)
 */
import { detectLanguage, stripAsrTags } from './dialect.js';
import { prosodyFromMarkedText } from './prosodyMarkers.js';

const ROBOT_EVENTS = Object.freeze([
  "sakura",
  "lip_sync",
  "done",
  "aborted",
]);

const EMPTY_HUD = () => ({
  phase: "idle",
  emotion: "neutral",
  summary: "",
  steps: [],
  language: "yue",
});

/**
 * Infer a simple Cantonese/English display name from user text.
 * @param {string} text
 */
export function extractRememberedName(text) {
  const raw = String(text ?? "");
  // Questions about one's name are not introductions.
  if (/我叫咩名|我叫什么|我叫什麼|what('?s| is) my name/i.test(raw)) {
    return null;
  }
  const patterns = [
    /我叫\s*([^\s，。！？,.!?]+)/,
    /我嘅名(?:字)?係\s*([^\s，。！？,.!?]+)/,
    /my name is\s+([A-Za-z0-9_\-]+)/i,
    /call me\s+([A-Za-z0-9_\-]+)/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Build a small robot plan from user text + memory.
 * @param {string} text
 * @param {{ userName?: string | null }} [memory]
 */
export function planRobotSteps(text, memory = {}) {
  const name = extractRememberedName(text) ?? memory.userName ?? null;
  const askingName = /我叫咩名|我叫什么|我叫什麼|what('?s| is) my name/i.test(
    text,
  );
  const happy = /哈哈|開心|多謝|谢谢|thank/i.test(text);

  /** @type {string[]} */
  const steps = [];
  let emotion = "neutral";
  let summary = "acknowledge and reply";

  if (extractRememberedName(text)) {
    emotion = "happy";
    summary = `remember user name ${name}`;
    steps.push(`store_name:${name}`);
    steps.push("greet_by_name");
    steps.push("sakura:happy");
  } else if (askingName && name) {
    emotion = "happy";
    summary = `recall user name ${name}`;
    steps.push(`recall_name:${name}`);
    steps.push("speak_name");
    steps.push("sakura:happy");
  } else if (askingName) {
    emotion = "thinking";
    summary = "name unknown — ask user";
    steps.push("admit_unknown_name");
    steps.push("ask_name");
    steps.push("sakura:thinking");
  } else if (happy) {
    emotion = "happy";
    summary = "positive reaction";
    steps.push("sakura:happy");
    steps.push("short_reply");
  } else {
    steps.push("sakura:neutral");
    steps.push("short_reply");
  }

  steps.push("lip_sync");
  steps.push("done");

  return { emotion, summary, steps, rememberedName: name };
}

/**
 * @param {{
 *   onEvent?: (event: string, payload: object) => void,
 *   memory?: { userName?: string | null },
 *   language?: string,
 *   forceLanguage?: string | null,
 * }} [opts]
 */
export function createVoiceRobotBridge(opts = {}) {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();
  for (const ev of ROBOT_EVENTS) listeners.set(ev, new Set());

  let hud = EMPTY_HUD();
  let memory = { userName: opts.memory?.userName ?? null };
  let language = opts.language || "yue";
  let forceLanguage =
    opts.forceLanguage == null || opts.forceLanguage === ""
      ? null
      : String(opts.forceLanguage).toLowerCase();
  if (forceLanguage) language = forceLanguage;
  let aborted = false;

  const emit = (event, payload = {}) => {
    if (!ROBOT_EVENTS.includes(event)) {
      throw new TypeError(`Unknown robot event: ${event}`);
    }
    const next = {
      phase: payload.phase ?? event,
      emotion: payload.emotion ?? hud.emotion,
      summary: payload.summary ?? hud.summary,
      steps: Array.isArray(payload.steps) ? payload.steps.slice() : hud.steps,
      language: payload.language ?? language,
      ...payload,
    };
    hud = {
      phase: next.phase,
      emotion: next.emotion,
      summary: next.summary,
      steps: next.steps,
      language: next.language,
    };
    opts.onEvent?.(event, next);
    for (const cb of listeners.get(event) ?? []) {
      cb(next);
    }
    return next;
  };

  return {
    get events() {
      return ROBOT_EVENTS.slice();
    },
    getHud() {
      return {
        phase: hud.phase,
        emotion: hud.emotion,
        summary: hud.summary,
        steps: hud.steps.slice(),
        language: hud.language || language,
      };
    },
    get memory() {
      return { ...memory };
    },
    get language() {
      return language;
    },
    get forceLanguage() {
      return forceLanguage;
    },
    /**
     * @param {string} id
     */
    setLanguage(id) {
      language = id || language;
      return language;
    },
    /**
     * Lock dialect (`yue`/`en`) or pass null/''/'auto' for auto-detect.
     * @param {string | null | undefined} id
     */
    setForceLanguage(id) {
      forceLanguage =
        id == null || id === "" || id === "auto"
          ? null
          : String(id).toLowerCase();
      if (forceLanguage) language = forceLanguage;
      return forceLanguage;
    },
    /**
     * @param {'sakura'|'lip_sync'|'done'|'aborted'} event
     * @param {(payload: object) => void} cb
     */
    on(event, cb) {
      if (!listeners.has(event)) {
        throw new TypeError(`Unknown robot event: ${event}`);
      }
      listeners.get(event).add(cb);
      return () => listeners.get(event)?.delete(cb);
    },
    emit,
    reset() {
      aborted = false;
      hud = EMPTY_HUD();
      return this.getHud();
    },
    clearMemory() {
      memory = { userName: null };
    },
    abort(reason = "aborted") {
      aborted = true;
      return emit("aborted", {
        phase: "aborted",
        summary: String(reason),
        steps: hud.steps,
        language,
      });
    },
    /**
     * Run a stub robot turn: sakura → lip_sync → (optional speak delay) → done (or aborted).
     * Updates memory when the user introduces a name (e.g. 小明).
     * Auto-switches language from SenseVoice tags / heuristics.
     * @param {string} userText
     * @param {{ forceReply?: string, speakMs?: number, tickMs?: number }} [opts]
     */
    async runTurn(userText, opts = {}) {
      aborted = false;
      const detected = detectLanguage(
        { asrRaw: userText, text: userText },
        { sticky: language, preferred: language, force: forceLanguage },
      );
      language = detected.id;
      const cleanText = stripAsrTags(userText) || String(userText ?? "");

      const learned = extractRememberedName(cleanText);
      if (learned) memory.userName = learned;

      const plan = planRobotSteps(cleanText, memory);
      if (plan.rememberedName) memory.userName = plan.rememberedName;

      emit("sakura", {
        phase: "planning",
        emotion: plan.emotion,
        summary: plan.summary,
        steps: plan.steps,
        language,
        dialect: detected,
      });

      if (aborted) return this.getHud();

      emit("lip_sync", {
        phase: "speaking",
        emotion: plan.emotion,
        summary: plan.summary,
        steps: plan.steps,
        language,
      });

      if (aborted) return this.getHud();

      const replySource =
        typeof opts.forceReply === "string"
          ? opts.forceReply
          : buildStubReply(cleanText, memory, language);
      const prosody = prosodyFromMarkedText(replySource, {
        emotion: plan.emotion,
        language,
      });
      const spoken = prosody.text || replySource;

      const speakMs =
        typeof opts.speakMs === "number" ? Math.max(0, opts.speakMs) : 0;
      const tickMs = Math.max(16, opts.tickMs ?? 40);
      if (speakMs > 0) {
        let elapsed = 0;
        while (elapsed < speakMs) {
          if (aborted) {
            return {
              ...this.getHud(),
              reply: spoken,
              language,
              dialect: detected,
              prosody,
              barged: true,
            };
          }
          const slice = Math.min(tickMs, speakMs - elapsed);
          await sleep(slice);
          elapsed += slice;
        }
      }

      if (aborted) {
        return {
          ...this.getHud(),
          reply: spoken,
          language,
          dialect: detected,
          prosody,
          barged: true,
        };
      }

      emit("done", {
        phase: "done",
        emotion: plan.emotion,
        summary: plan.summary,
        steps: plan.steps,
        reply: spoken,
        language,
        dialect: detected,
        prosody,
      });

      return {
        ...this.getHud(),
        reply: spoken,
        language,
        dialect: detected,
        prosody,
      };
    },
  };
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} userText
 * @param {{ userName?: string | null }} memory
 * @param {string} [language]
 */
function buildStubReply(userText, memory, language = "yue") {
  const askingName = /我叫咩名|我叫什么|我叫什麼|what('?s| is) my name/i.test(
    userText,
  );
  if (language === "en") {
    if (askingName && memory.userName) {
      return `You're ${memory.userName}!`;
    }
    if (askingName) {
      return "I don't remember your name yet — tell me again?";
    }
    const learned = extractRememberedName(userText);
    if (learned) {
      return `Hi ${learned}! Nice to meet you.`;
    }
    return "Got it — what would you like to talk about?";
  }
  if (askingName && memory.userName) {
    return `你叫${memory.userName}呀！`;
  }
  if (askingName) {
    return "我未記得你嘅名，你可以再講一次嗎？";
  }
  const learned = extractRememberedName(userText);
  if (learned) {
    return `你好${learned}！好開心認識你。`;
  }
  return "收到啦，有咩想傾？";
}

export { ROBOT_EVENTS };
