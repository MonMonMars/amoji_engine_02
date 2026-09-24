/**
 * Structured LLM context database — user menu, profile, compressed chat memory,
 * and active 3D character performance record (local + cloud user save).
 */
import {
  characterGender,
  characterGreeting,
  characterGreetingPerformance,
  characterHungryPerformance,
  characterLonelyPerformance,
  characterProsodyBias,
  characterTapLines,
  characterVoiceLabel,
  defaultVoiceForCharacter,
  getCharacter,
} from "./companionCharacterCatalog.js";
import { buildSettingsChromeLabels } from "./companionSettingsChrome.js";
import { CHARACTER_PERFORMANCE_STYLE } from "./companionLlmPerformancePreset.js";
import { idleGenderBodyProfile, normalizeIdleGender } from "./companionIdleGender.js";
import { loadAuthSession } from "../mobile/companionMobileAuth.js";
import { loadCompanionRole, roleLabel } from "../mobile/companionRolePresets.js";
import { loadChatHistory } from "./companionChatPersistence.js";
import {
  extractMemoryFromMessage,
} from "./secretary/memoryExtract.js";
import {
  memoryFactsForPrompt,
  readLastChatSummary,
  saveLastChatSummary,
} from "./secretary/memoryStore.js";
import { findVoiceProfile } from "./companionVoiceProfiles.js";

export const LLM_CONTEXT_DB_SCHEMA = "amoji.companionLlmContextDb.v1";
export const LLM_CONTEXT_DB_STORAGE_KEY = LLM_CONTEXT_DB_SCHEMA;

/** @typedef {{
 *   id: string,
 *   label: string,
 *   hint?: string,
 * }} MenuItemRecord */

/** @typedef {{
 *   userId?: string | null,
 *   guest: boolean,
 *   locale: "yue" | "en",
 *   role: string,
 *   roleLabel: string,
 *   activeCharacterId: string,
 *   displayName?: string,
 *   updatedAt: number,
 * }} UserProfileRecord */

/** @typedef {{
 *   compressedSummary: string,
 *   mainPoints: string[],
 *   factBullets: string[],
 *   updatedAt: number,
 * }} ChatMemoryRecord */

/** @typedef {{
 *   id: string,
 *   name: string,
 *   tagline: string,
 *   traits: string[],
 *   personalityShort: string,
 *   gender: "male" | "female",
 *   voices: { yue: string, en: string, gender: string },
 *   catchPhrases: string[],
 *   tapLines: string[],
 *   greeting: string,
 *   postureIdle: {
 *     genderProfile: string,
 *     greetingPerformance: Record<string, unknown>,
 *     hungryPerformance: Record<string, unknown>,
 *     lonelyPerformance: Record<string, unknown>,
 *   },
 *   prosodyBias: { rate: number, pitch: number, volume: number },
 *   performanceStyle: {
 *     moves: string[],
 *     moods: string[],
 *     nuances: string[],
 *     note: string,
 *   },
 *   talkStyle: string,
 *   speechEnergy: number,
 *   updatedAt: number,
 * }} CharacterLlmRecord */

/**
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function readLlmContextDb(storage = globalThis.localStorage) {
  if (!storage) return defaultLlmContextDb();
  try {
    const raw = storage.getItem(LLM_CONTEXT_DB_STORAGE_KEY);
    if (!raw) return defaultLlmContextDb();
    const parsed = JSON.parse(raw);
    return normalizeLlmContextDb(parsed);
  } catch {
    return defaultLlmContextDb();
  }
}

/**
 * @param {Partial<import("./companionLlmContextDb.js").LlmContextDb>} patch
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function writeLlmContextDb(patch, storage = globalThis.localStorage) {
  const current = readLlmContextDb(storage);
  const next = normalizeLlmContextDb({
    ...current,
    ...patch,
    schema: LLM_CONTEXT_DB_SCHEMA,
    updatedAt: Date.now(),
  });
  try {
    storage?.setItem(LLM_CONTEXT_DB_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  return next;
}

function emptyLlmContextDbShell() {
  return {
    schema: LLM_CONTEXT_DB_SCHEMA,
    userMenu: { items: /** @type {MenuItemRecord[]} */ ([]), updatedAt: 0 },
    userProfile: /** @type {UserProfileRecord | null} */ (null),
    chatMemory: {
      compressedSummary: "",
      mainPoints: /** @type {string[]} */ ([]),
      factBullets: /** @type {string[]} */ ([]),
      updatedAt: 0,
    },
    character: /** @type {CharacterLlmRecord | null} */ (null),
    updatedAt: 0,
  };
}

export function defaultLlmContextDb() {
  return emptyLlmContextDbShell();
}

/**
 * @param {unknown} raw
 */
export function normalizeLlmContextDb(raw) {
  const base = emptyLlmContextDbShell();
  if (!raw || typeof raw !== "object") return base;
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const userMenuRaw = /** @type {Record<string, unknown> | undefined} */ (
    obj.userMenu
  );
  const chatRaw = /** @type {Record<string, unknown> | undefined} */ (obj.chatMemory);
  return {
    schema: LLM_CONTEXT_DB_SCHEMA,
    userMenu: {
      items: Array.isArray(userMenuRaw?.items)
        ? userMenuRaw.items.filter((i) => i && i.id && i.label)
        : base.userMenu.items,
      updatedAt: Number(userMenuRaw?.updatedAt) || 0,
    },
    userProfile: obj.userProfile
      ? { ...(base.userProfile || {}), ...obj.userProfile }
      : base.userProfile,
    chatMemory: {
      compressedSummary: String(chatRaw?.compressedSummary || ""),
      mainPoints: Array.isArray(chatRaw?.mainPoints)
        ? chatRaw.mainPoints.map((s) => String(s)).filter(Boolean).slice(0, 16)
        : [],
      factBullets: Array.isArray(chatRaw?.factBullets)
        ? chatRaw.factBullets.map((s) => String(s)).filter(Boolean).slice(0, 16)
        : [],
      updatedAt: Number(chatRaw?.updatedAt) || 0,
    },
    character: obj.character
      ? { ...(base.character || {}), ...obj.character }
      : base.character,
    updatedAt: Number(obj.updatedAt) || Date.now(),
  };
}

/**
 * @param {boolean} [isEnglish]
 * @param {Parameters<typeof buildSettingsChromeLabels>[1]} [menuState]
 */
export function buildUserMenuCatalog(isEnglish = false, menuState = {}) {
  const labels = buildSettingsChromeLabels(isEnglish, menuState);
  /** @type {MenuItemRecord[]} */
  const items = [
    { id: "menu", label: labels.menuTitle, hint: isEnglish ? "Top-right gear" : "右上角選單" },
    { id: "language", label: labels.language, hint: labels.languageSwitchTitle },
    { id: "chat_visibility", label: labels.chat },
    { id: "talk_speed", label: labels.talkSpeed },
    { id: "background", label: labels.background },
    { id: "outfits", label: labels.outfitHint },
    { id: "switch_companion", label: labels.switchCompanion, hint: labels.rosterModelsHint },
    { id: "speaker", label: labels.speaker },
    { id: "sound_effects", label: labels.soundEffects },
    { id: "haptics", label: labels.haptics },
    { id: "camera_reset", label: labels.camera },
    { id: "brain_llm", label: labels.brain, hint: `${labels.modelLabel}; ${labels.llmUrlLabel}` },
    { id: "attach_files", label: isEnglish ? "Attach files (+ left of composer)" : "附加檔案（輸入框左 +）" },
    { id: "voice_mic", label: isEnglish ? "Voice mic (orb button)" : "語音麥克風（圓形按鈕）" },
    { id: "secretary_today", label: labels.secretaryToday },
    { id: "secretary_tasks", label: labels.secretaryTasks },
    { id: "voice_lab", label: labels.labLink },
  ];
  return { items, updatedAt: Date.now() };
}

/**
 * @param {{
 *   characterId: string,
 *   langCode?: "yue" | "en",
 *   isEnglish?: boolean,
 *   role?: string,
 *   storage?: Storage | null,
 *   displayName?: string,
 * }} opts
 */
export function buildUserProfileRecord(opts) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const auth = loadAuthSession(storage);
  const lang = opts.langCode === "en" ? "en" : "yue";
  const role = opts.role || loadCompanionRole(storage);
  const isEnglish = Boolean(opts.isEnglish ?? lang === "en");
  return {
    userId: auth?.userId || null,
    guest: !auth?.userId,
    locale: lang,
    role: String(role),
    roleLabel: roleLabel(role, isEnglish),
    activeCharacterId: String(opts.characterId || "nova").toLowerCase(),
    displayName: opts.displayName || auth?.displayName || null,
    updatedAt: Date.now(),
  };
}

/**
 * @param {string} characterId
 * @param {"yue" | "en"} langCode
 * @param {boolean} [isEnglish]
 */
export function buildCharacterLlmRecord(characterId, langCode, isEnglish = false) {
  const id = String(characterId || "nova").toLowerCase();
  const def = getCharacter(id);
  const english = Boolean(isEnglish || langCode === "en");
  const gender = characterGender(id, langCode);
  const idle = idleGenderBodyProfile(normalizeIdleGender(gender));
  const greetPerf = characterGreetingPerformance(id);
  const style =
    CHARACTER_PERFORMANCE_STYLE[id] || CHARACTER_PERFORMANCE_STYLE.amoji;
  const yueVoice = defaultVoiceForCharacter(id, "yue");
  const enVoice = defaultVoiceForCharacter(id, "en");
  const voiceGender = findVoiceProfile(yueVoice)?.gender || gender;

  return {
    id,
    name: english ? def.name.en : def.name.yue,
    tagline: english ? def.tagline.en : def.tagline.yue,
    traits: english ? def.traits.en : def.traits.yue,
    personalityShort: english ? def.personalityEn : def.personalityYue,
    gender,
    voices: {
      yue: yueVoice,
      en: enVoice,
      gender: voiceGender,
      label: characterVoiceLabel(id, langCode, english),
    },
    catchPhrases: [characterGreeting(id, english)],
    tapLines: characterTapLines(id, english).slice(0, 6),
    greeting: characterGreeting(id, english),
    postureIdle: {
      genderProfile: english
        ? gender === "male"
          ? `Male idle: lower sway (${idle.swayMul}), wider stance (${idle.legSpread}), grounded arms.`
          : `Female idle: softer sway (${idle.swayMul}), lighter hip motion (${idle.hipMul}).`
        : gender === "male"
          ? `男 idle： sway ${idle.swayMul}、步距 ${idle.legSpread}、手放低。`
          : `女 idle： sway ${idle.swayMul}、hip ${idle.hipMul}、手位較柔。`,
      greetingPerformance: greetPerf,
      hungryPerformance: characterHungryPerformance(id),
      lonelyPerformance: characterLonelyPerformance(id),
    },
    prosodyBias: characterProsodyBias(id),
    performanceStyle: {
      moves: style.moves,
      moods: style.moods,
      nuances: style.nuances,
      note: english ? style.noteEn : style.noteYue,
    },
    talkStyle: String(greetPerf.talkStyle || "soft"),
    speechEnergy: Number(greetPerf.speechEnergy) || 0.6,
    updatedAt: Date.now(),
  };
}

/**
 * Heuristic compression — main user points + short summary for LLM context.
 * @param {import("./companionChatPersistence.js").ChatMessage[]} messages
 * @param {{ isEnglish?: boolean, maxPoints?: number }} [opts]
 */
export function compressChatHistoryForLlm(messages, opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const maxPoints = opts.maxPoints ?? 10;
  const list = Array.isArray(messages) ? messages : [];
  const userLines = list.filter((m) => m.role === "user").map((m) => String(m.text || "").trim());
  /** @type {string[]} */
  const mainPoints = [];
  for (const line of userLines.slice(-24)) {
    const short = line.length > 160 ? `${line.slice(0, 157)}…` : line;
    if (short.length < 4) continue;
    if (mainPoints.includes(short)) continue;
    mainPoints.push(short);
    const extracted = extractMemoryFromMessage(short, { isEn: isEnglish });
    if (extracted.memory?.text) {
      mainPoints.push(
        isEnglish
          ? `Memory: ${extracted.memory.text}`
          : `記憶：${extracted.memory.text}`,
      );
    }
  }
  const trimmedPoints = mainPoints.slice(-maxPoints);
  const summarySource = trimmedPoints.slice(-4).join(" · ");
  const compressedSummary = summarySource
    ? summarySource.length > 520
      ? `${summarySource.slice(0, 517)}…`
      : summarySource
    : readLastChatSummary(storage) || "";

  if (compressedSummary && compressedSummary === summarySource) {
    saveLastChatSummary(compressedSummary, storage);
  }

  const memoryFacts = memoryFactsForPrompt({ storage, limit: 6 })
    .split("\n")
    .filter(Boolean);

  return {
    compressedSummary,
    mainPoints: trimmedPoints,
    factBullets: memoryFacts,
    updatedAt: Date.now(),
  };
}

/**
 * Refresh local LLM context DB from live app state.
 * @param {{
 *   characterId: string,
 *   langCode?: "yue" | "en",
 *   isEnglish?: boolean,
 *   role?: string,
 *   storage?: Storage | null,
 *   menuState?: Parameters<typeof buildSettingsChromeLabels>[1],
 *   chatMessages?: import("./companionChatPersistence.js").ChatMessage[],
 * }} opts
 */
export function refreshLlmContextDb(opts) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const langCode = opts.langCode === "en" ? "en" : "yue";
  const isEnglish = Boolean(opts.isEnglish ?? langCode === "en");
  const characterId = String(opts.characterId || "nova").toLowerCase();
  const messages =
    opts.chatMessages ?? loadChatHistory(characterId, storage);

  return writeLlmContextDb(
    {
      userMenu: buildUserMenuCatalog(isEnglish, opts.menuState || {}),
      userProfile: buildUserProfileRecord({
        characterId,
        langCode,
        isEnglish,
        role: opts.role,
        storage,
        displayName: opts.menuState?.companionName,
      }),
      chatMemory: compressChatHistoryForLlm(messages, { isEnglish }),
      character: buildCharacterLlmRecord(characterId, langCode, isEnglish),
    },
    storage,
  );
}

/**
 * Compact prompt block injected into the system prompt (database snapshot).
 * @param {{
 *   storage?: Storage | null,
 *   isEnglish?: boolean,
 *   refresh?: Parameters<typeof refreshLlmContextDb>[0],
 * }} [opts]
 */
export function buildLlmContextDatabaseFragment(opts = {}) {
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const isEnglish = Boolean(opts.isEnglish);
  if (opts.refresh) {
    refreshLlmContextDb({ ...opts.refresh, storage: opts.refresh.storage ?? storage });
  }
  const db = readLlmContextDb(storage);
  const en = isEnglish;

  const menuLines = (db.userMenu?.items || [])
    .slice(0, 14)
    .map((i) => `- ${i.id}: ${i.label}${i.hint ? ` (${i.hint})` : ""}`)
    .join("\n");

  const profile = db.userProfile;
  const profileBlock = profile
    ? en
      ? `Guest: ${profile.guest}. Locale: ${profile.locale}. Role: ${profile.roleLabel}. Active character: ${profile.activeCharacterId}. Reply language: English only.`
      : `訪客：${profile.guest}。語言：${profile.locale}。模式：${profile.roleLabel}。角色：${profile.activeCharacterId}。`
    : "";

  const mem = db.chatMemory || {};
  const points = (mem.mainPoints || []).slice(-8).map((p) => `- ${p}`).join("\n");
  const facts = (mem.factBullets || []).slice(-6).join("\n");
  const memoryBlock = [
    mem.compressedSummary
      ? en
        ? `Summary: ${mem.compressedSummary}`
        : `摘要：${mem.compressedSummary}`
      : "",
    points
      ? en
        ? `Main user points:\n${points}`
        : `用戶重點：\n${points}`
      : "",
    facts
      ? en
        ? `Saved facts:\n${facts}`
        : `已存事實：\n${facts}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const ch = db.character;
  const charBlock = ch
    ? en
      ? [
          `Character ${ch.name} (${ch.id}): ${ch.tagline}`,
          `Traits: ${(ch.traits || []).join(", ")}`,
          `Voice: ${ch.voices?.label || ch.voices?.yue} (${ch.voices?.gender})`,
          `Talk style: ${ch.talkStyle}, energy ${ch.speechEnergy}`,
          `Catch / tap lines: ${(ch.tapLines || []).slice(0, 4).join(" | ")}`,
          `Idle/posture: ${ch.postureIdle?.genderProfile || ""}`,
          `Performance moves: ${(ch.performanceStyle?.moves || []).slice(0, 8).join(", ")}`,
          `Preferred moods: ${(ch.performanceStyle?.moods || []).join(", ")}`,
        ].join("\n")
      : [
          `角色 ${ch.name}（${ch.id}）：${ch.tagline}`,
          `特質：${(ch.traits || []).join("、")}`,
          `聲線：${ch.voices?.label || ch.voices?.yue}（${ch.voices?.gender}）`,
          `講法：${ch.talkStyle}，能量 ${ch.speechEnergy}`,
          `口頭禪／點擊句：${(ch.tapLines || []).slice(0, 4).join("｜")}`,
          `Idle／姿態：${ch.postureIdle?.genderProfile || ""}`,
          `動作偏好：${(ch.performanceStyle?.moves || []).slice(0, 8).join("、")}`,
          `表情 mood：${(ch.performanceStyle?.moods || []).join("、")}`,
        ].join("\n")
    : "";

  const header = en
    ? "LLM CONTEXT DATABASE (reference — use for menu help, user continuity, and staying in character):"
    : "LLM 上下文資料庫（參考 — 用嚟答選單問題、延續用戶、保持人設）：";

  return [
    header,
    en ? "[USER MENU]" : "[用戶選單]",
    menuLines || (en ? "(none)" : "（無）"),
    en ? "[USER PROFILE]" : "[用戶資料]",
    profileBlock || (en ? "(anonymous session)" : "（匿名連線）"),
    en ? "[CHAT MEMORY — compressed]" : "[對話記憶 — 壓縮]",
    memoryBlock || (en ? "(no prior points this session storage)" : "（本地未存重點）"),
    en ? "[ACTIVE 3D CHARACTER RECORD]" : "[當前 3D 角色檔]",
    charBlock || (en ? "(unknown)" : "（未知）"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Payload slice stored under user save on the server.
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function llmContextDbForCloudSave(storage = globalThis.localStorage) {
  const db = readLlmContextDb(storage);
  return {
    schema: LLM_CONTEXT_DB_SCHEMA,
    userProfile: db.userProfile,
    chatMemory: db.chatMemory,
    characterId: db.character?.id || db.userProfile?.activeCharacterId || "nova",
    updatedAt: db.updatedAt,
  };
}

/**
 * Merge cloud save llmContextDb into local storage.
 * @param {unknown} remote
 * @param {typeof globalThis.localStorage | null | undefined} [storage]
 */
export function mergeCloudLlmContextDb(remote, storage = globalThis.localStorage) {
  if (!remote || typeof remote !== "object") return readLlmContextDb(storage);
  const local = readLlmContextDb(storage);
  const r = /** @type {Record<string, unknown>} */ (remote);
  const remoteUpdated = Number(r.updatedAt) || 0;
  if (remoteUpdated <= (local.updatedAt || 0)) return local;
  return writeLlmContextDb(
    {
      userProfile: r.userProfile || local.userProfile,
      chatMemory: r.chatMemory || local.chatMemory,
      character: local.character,
    },
    storage,
  );
}
