/**
 * Japanese raising-game UI logic — daily goals, bond ranks, activity commands,
 * advice lines, pinned memories (MomoTalk-style), stat deltas.
 *
 * Inspired by Uma Musume header goals, Tokimeki command grid, Blue Archive MomoTalk.
 */
import { clampNeed, dailyYmd, tickCare } from "./companionPetCare.js";

export const COMPANION_RAISING_UI_SCHEMA = "amoji.companionRaising.v1";
export const RAISING_STORAGE_KEY = "amoji.companionRaising.v1";
export const PINNED_MEMORY_LIMIT = 3;

export const PET_WALK_HEARTS = 5;
export const PET_WALK_HUNGER = 2;
export const PET_SNACK_HEARTS = 3;
export const PET_SNACK_HUNGER = 10;
export const PET_SNACK_COINS = 0;

/** @typedef {{ id: string, target: number, en: string, yue: string, icon: string }} DailyGoalDef */
/** @typedef {{ min: number, en: string, yue: string, icon: string }} BondRankDef */
/** @typedef {{ id: string, icon: string, en: string, yue: string, kind: "snack" | "talk" | "walk" }} ActivityCommandDef */

/** @type {Readonly<DailyGoalDef[]>} */
export const DAILY_GOAL_DEFS = Object.freeze([
  { id: "feed", target: 1, en: "Feed her once", yue: "餵佢食一次", icon: "🍰" },
  { id: "chat", target: 3, en: "Chat 3 times", yue: "傾偈 3 次", icon: "💬" },
  { id: "pet", target: 2, en: "Pet her twice", yue: "摸摸 2 次", icon: "💗" },
  { id: "walk", target: 1, en: "Take a walk", yue: "散吓步", icon: "🚶" },
  { id: "hearts", target: 70, en: "Fun mood 70+", yue: "心情 70+", icon: "✨" },
]);

/** @type {Readonly<BondRankDef[]>} */
export const BOND_RANKS = Object.freeze([
  { min: 0, en: "New face", yue: "初見", icon: "🌱" },
  { min: 20, en: "Acquaintance", yue: "熟人", icon: "🙂" },
  { min: 40, en: "Friend", yue: "朋友", icon: "💫" },
  { min: 60, en: "Close friend", yue: "好朋友", icon: "💗" },
  { min: 80, en: "Best bond", yue: "知心", icon: "✨" },
]);

/** @type {Readonly<ActivityCommandDef[]>} */
export const ACTIVITY_COMMANDS = Object.freeze([
  { id: "snack", kind: "snack", icon: "🍰", en: "Snack", yue: "小食" },
  { id: "talk", kind: "talk", icon: "💬", en: "Talk", yue: "傾偈" },
  { id: "walk", kind: "walk", icon: "🚶", en: "Walk", yue: "散步" },
]);

/**
 * @param {string} seed
 */
export function hashSeed(seed) {
  let h = 2166136261;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {string} characterId
 * @param {string} [ymd]
 */
export function pickDailyGoalDef(characterId, ymd = dailyYmd()) {
  const idx = hashSeed(`${ymd}:${characterId}`) % DAILY_GOAL_DEFS.length;
  return DAILY_GOAL_DEFS[idx];
}

/**
 * @param {number} hearts
 * @param {boolean} [isEnglish]
 */
export function resolveBondRank(hearts, isEnglish = false) {
  const value = clampNeed(hearts);
  let rank = BOND_RANKS[0];
  for (const entry of BOND_RANKS) {
    if (value >= entry.min) rank = entry;
  }
  return {
    ...rank,
    label: isEnglish ? rank.en : rank.yue,
    hearts: value,
    tier: BOND_RANKS.indexOf(rank),
  };
}

/**
 * @param {object} care
 * @param {DailyGoalDef} goal
 */
export function goalProgressValue(care, goal) {
  const hearts = clampNeed(care?.hearts);
  switch (goal.id) {
    case "hearts":
      return hearts;
    default:
      return 0;
  }
}

/**
 * @param {object} state
 * @param {DailyGoalDef} goal
 */
export function isGoalComplete(state, goal) {
  const progress = Number(state?.goalProgress) || 0;
  if (goal.id === "hearts") {
    return clampNeed(state?.lastHearts ?? 0) >= goal.target || progress >= goal.target;
  }
  return progress >= goal.target;
}

/**
 * @param {string} characterId
 * @param {boolean} [isEnglish]
 * @param {number} [now]
 */
export function defaultRaisingState(characterId = "amoji", isEnglish = false, now = Date.now()) {
  const ymd = dailyYmd(now);
  const goal = pickDailyGoalDef(characterId, ymd);
  return {
    schema: COMPANION_RAISING_UI_SCHEMA,
    characterId: String(characterId || "amoji").toLowerCase(),
    goalYmd: ymd,
    goalId: goal.id,
    goalProgress: 0,
    goalTarget: goal.target,
    goalComplete: false,
    pinnedMemories: [],
    counts: { feed: 0, chat: 0, pet: 0, walk: 0, snack: 0 },
    lastHearts: 0,
    updatedAt: now,
  };
}

/**
 * @param {unknown} raw
 * @param {string} characterId
 * @param {number} [now]
 */
export function normalizeRaisingState(raw, characterId = "amoji", now = Date.now()) {
  const base = defaultRaisingState(characterId, false, now);
  if (!raw || typeof raw !== "object") return base;
  const src = /** @type {Record<string, unknown>} */ (raw);
  const ymd = dailyYmd(now);
  const goal = pickDailyGoalDef(characterId, ymd);
  const pinned = Array.isArray(src.pinnedMemories)
    ? src.pinnedMemories
        .filter((m) => typeof m === "string" && m.trim())
        .slice(0, PINNED_MEMORY_LIMIT)
        .map((m) => String(m).trim())
    : [];
  const countsSrc =
    src.counts && typeof src.counts === "object"
      ? /** @type {Record<string, unknown>} */ (src.counts)
      : {};
  const sameDay = src.goalYmd === ymd && src.goalId === goal.id;
  return {
    ...base,
    characterId: String(characterId || "amoji").toLowerCase(),
    goalYmd: ymd,
    goalId: goal.id,
    goalTarget: goal.target,
    goalProgress: sameDay ? Math.max(0, Math.round(Number(src.goalProgress) || 0)) : 0,
    goalComplete: sameDay ? Boolean(src.goalComplete) : false,
    pinnedMemories: pinned,
    counts: {
      feed: Math.max(0, Math.round(Number(countsSrc.feed) || 0)),
      chat: Math.max(0, Math.round(Number(countsSrc.chat) || 0)),
      pet: Math.max(0, Math.round(Number(countsSrc.pet) || 0)),
      walk: Math.max(0, Math.round(Number(countsSrc.walk) || 0)),
      snack: Math.max(0, Math.round(Number(countsSrc.snack) || 0)),
    },
    lastHearts: clampNeed(src.lastHearts),
    updatedAt: Math.max(0, Math.round(Number(src.updatedAt) || now)),
  };
}

/**
 * @param {string} characterId
 * @param {Pick<Storage, "getItem"> | null | undefined} [storage]
 * @param {number} [now]
 */
export function loadRaisingState(
  characterId,
  storage = globalThis.localStorage,
  now = Date.now(),
) {
  const id = String(characterId || "amoji").toLowerCase();
  const key = `${RAISING_STORAGE_KEY}.${id}`;
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return defaultRaisingState(id, false, now);
    return normalizeRaisingState(JSON.parse(raw), id, now);
  } catch {
    return defaultRaisingState(id, false, now);
  }
}

/**
 * @param {object} state
 * @param {Pick<Storage, "setItem"> | null | undefined} [storage]
 */
export function saveRaisingState(state, storage = globalThis.localStorage) {
  const next = normalizeRaisingState(state, state?.characterId);
  const key = `${RAISING_STORAGE_KEY}.${next.characterId}`;
  try {
    storage?.setItem?.(key, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

/**
 * @param {object} state
 * @param {string} event
 * @param {{ hearts?: number, now?: number }} [opts]
 */
export function bumpRaisingProgress(state, event, opts = {}) {
  const now = opts.now ?? Date.now();
  const goal = pickDailyGoalDef(state.characterId, dailyYmd(now));
  let next = normalizeRaisingState(state, state?.characterId, now);
  const counts = { ...next.counts };
  if (event && event in counts) counts[event] = (counts[event] || 0) + 1;

  let progress = next.goalProgress;
  if (event && goal.id === event) progress += 1;
  if (goal.id === "hearts" && opts.hearts != null) progress = clampNeed(opts.hearts);

  const complete =
    goal.id === "hearts"
      ? clampNeed(opts.hearts ?? next.lastHearts) >= goal.target
      : progress >= goal.target;

  next = {
    ...next,
    counts,
    goalProgress: progress,
    goalComplete: complete || next.goalComplete,
    lastHearts: opts.hearts != null ? clampNeed(opts.hearts) : next.lastHearts,
    updatedAt: now,
  };
  return next;
}

/**
 * @param {object} state
 * @param {boolean} [isEnglish]
 * @param {number} [now]
 */
export function formatDailyGoalLine(state, isEnglish = false, now = Date.now()) {
  const goal = pickDailyGoalDef(state?.characterId || "amoji", dailyYmd(now));
  const label = isEnglish ? goal.en : goal.yue;
  if (state?.goalComplete || isGoalComplete(state, goal)) {
    return isEnglish ? `Today · ${goal.icon} done!` : `今日 · ${goal.icon} 完成！`;
  }
  const progress =
    goal.id === "hearts"
      ? Math.min(goal.target, clampNeed(state?.lastHearts ?? 0))
      : Math.min(goal.target, Number(state?.goalProgress) || 0);
  return isEnglish
    ? `Today · ${goal.icon} ${label} (${progress}/${goal.target})`
    : `今日 · ${goal.icon} ${label}（${progress}/${goal.target}）`;
}

/**
 * @param {object} care
 * @param {number} coins
 * @param {number} [now]
 */
export function applyWalkCare(care, coins, now = Date.now()) {
  const current = tickCare(care, now);
  return {
    care: {
      ...current,
      hunger: clampNeed(current.hunger - PET_WALK_HUNGER),
      hearts: clampNeed(current.hearts + PET_WALK_HEARTS),
    },
    coins: Math.max(0, Math.round(Number(coins) || 0)),
    earned: 0,
    heartsDelta: PET_WALK_HEARTS,
    hungerDelta: -PET_WALK_HUNGER,
  };
}

/**
 * Quick nibble — small hunger/hearts boost without consuming bag item.
 * @param {object} care
 * @param {number} coins
 * @param {number} [now]
 */
export function applySnackCare(care, coins, now = Date.now()) {
  const current = tickCare(care, now);
  return {
    care: {
      ...current,
      hunger: clampNeed(current.hunger + PET_SNACK_HUNGER),
      hearts: clampNeed(current.hearts + PET_SNACK_HEARTS),
    },
    coins: Math.max(0, Math.round(Number(coins) || 0) + PET_SNACK_COINS),
    earned: PET_SNACK_COINS,
    heartsDelta: PET_SNACK_HEARTS,
    hungerDelta: PET_SNACK_HUNGER,
  };
}

/**
 * @param {string} action
 * @param {{ itemName?: string, refused?: boolean, heartsDelta?: number, hungerDelta?: number, goalComplete?: boolean }} ctx
 * @param {boolean} [isEnglish]
 */
export function adviceLineForAction(action, ctx = {}, isEnglish = false) {
  if (ctx.goalComplete) {
    return isEnglish ? "Daily goal cleared — nice work!" : "今日目標達成 — 做得好！";
  }
  if (ctx.refused) {
    return isEnglish ? "Maybe later — she'll let you know when she's ready." : "遲啲再試 — 佢準備好會話你知。";
  }
  const hearts = ctx.heartsDelta ?? 0;
  const hunger = ctx.hungerDelta ?? 0;
  switch (action) {
    case "feed":
      return hearts > 0 && hunger > 0
        ? isEnglish
          ? `${ctx.itemName || "That snack"} hit the spot~`
          : `${ctx.itemName || "呢份小食"} 好滿足～`
        : isEnglish
          ? "Yum — energy restored."
          : "好味 — 補返啲力。";
    case "chat":
      return hearts > 0
        ? isEnglish
          ? "She brightens when you talk."
          : "同你傾偈佢好開心。"
        : isEnglish
          ? "Good chat — keep it going."
          : "傾得好 — 繼續啦。";
    case "pet":
      return isEnglish ? "Headpats registered — bond up!" : "摸摸成功 — 羈絆上升！";
    case "walk":
      return isEnglish ? "Fresh air walk — mood lifted." : "散咗步 — 心情好啲。";
    case "snack":
      return isEnglish ? "Quick bite — small boost." : "食咗口小食 — 少少補給。";
    default:
      return "";
  }
}

/**
 * @param {{ hearts?: number, hunger?: number, coins?: number }} delta
 * @param {boolean} [isEnglish]
 */
export function formatStatDelta(delta, isEnglish = false) {
  const parts = [];
  if (delta.hearts) parts.push(`${delta.hearts > 0 ? "+" : ""}${delta.hearts} 💗`);
  if (delta.hunger) parts.push(`${delta.hunger > 0 ? "+" : ""}${delta.hunger} 🍽️`);
  if (delta.coins) parts.push(`${delta.coins > 0 ? "+" : ""}${delta.coins} 🪙`);
  if (!parts.length) return "";
  return parts.join(" ");
}

const MEMORY_PATTERNS = [
  { re: /(?:my name is|call me|i am|i'm)\s+([A-Za-z\u4e00-\u9fff]{2,24})/i, fmt: (m, en) => (en ? `Your name: ${m[1]}` : `你叫：${m[1]}`) },
  { re: /(?:我叫|我係|叫我)\s*([^\s，。！？,.]{1,12})/, fmt: (m, en) => (en ? `Your name: ${m[1]}` : `你叫：${m[1]}`) },
  { re: /(?:i like|i love|my favorite|fav(?:orite)? is)\s+(.{2,40})/i, fmt: (m, en) => (en ? `Likes: ${m[1].trim()}` : `鍾意：${m[1].trim()}`) },
  { re: /(?:我鍾意|我愛|我最愛|我中意)\s*(.{2,24})/, fmt: (m, en) => (en ? `Likes: ${m[1].trim()}` : `鍾意：${m[1].trim()}`) },
  { re: /(?:remember (?:that )?|don't forget)\s+(.{4,60})/i, fmt: (m, en) => (en ? `Remember: ${m[1].trim()}` : `記住：${m[1].trim()}`) },
  { re: /(?:記住|唔好忘記)\s*(.{4,40})/, fmt: (m, en) => (en ? `Remember: ${m[1].trim()}` : `記住：${m[1].trim()}`) },
];

/**
 * @param {string} userText
 * @param {boolean} [isEnglish]
 */
export function extractMemoryCandidate(userText, isEnglish = false) {
  const text = String(userText || "").trim();
  if (text.length < 4) return "";
  for (const { re, fmt } of MEMORY_PATTERNS) {
    const m = text.match(re);
    if (m) {
      const line = fmt(m, isEnglish).slice(0, 72);
      if (line.length >= 4) return line;
    }
  }
  return "";
}

/**
 * @param {string[]} memories
 * @param {string} candidate
 */
export function updatePinnedMemories(memories = [], candidate = "") {
  const line = String(candidate || "").trim();
  if (!line) return memories.slice(0, PINNED_MEMORY_LIMIT);
  const next = [line, ...memories.filter((m) => m !== line)].slice(0, PINNED_MEMORY_LIMIT);
  return next;
}

/**
 * @param {ActivityCommandDef} cmd
 * @param {boolean} [isEnglish]
 */
export function activityCommandLabel(cmd, isEnglish = false) {
  return isEnglish ? cmd.en : cmd.yue;
}
