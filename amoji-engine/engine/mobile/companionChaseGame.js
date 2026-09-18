/**
 * Chase minigame — catch the running anime companion for coins + bond hearts.
 * Inspired by Japanese "chase / collection" mobile games (time-limited variants, daily runs).
 */
export const COMPANION_CHASE_GAME_SCHEMA = "amoji.companionChaseGame.v1";

export const CHASE_ROUND_SECONDS = 45;
export const CHASE_CATCH_GOAL = 5;
export const CHASE_SPAWN_MS = 1800;
export const CHASE_PLAYER_SPEED = 4.2;
export const CHASE_GIRL_SPEED = 3.1;

/** @typedef {{
 *   highScore: number,
 *   totalCatches: number,
 *   dailyYmd: string,
 *   dailyCatches: number,
 *   dailyCoinsEarned: number,
 *   streakDays: number,
 *   lastPlayedYmd: string,
 *   unlockedVariants: string[],
 * }} ChaseSave */

/**
 * @param {number} [now]
 * @returns {ChaseSave}
 */
export function defaultChaseSave(now = Date.now()) {
  return {
    highScore: 0,
    totalCatches: 0,
    dailyYmd: dailyYmd(now),
    dailyCatches: 0,
    dailyCoinsEarned: 0,
    streakDays: 0,
    lastPlayedYmd: "",
    unlockedVariants: ["default"],
  };
}

/**
 * @param {number} [now]
 */
export function dailyYmd(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * @param {unknown} raw
 * @param {number} [now]
 * @returns {ChaseSave}
 */
export function normalizeChaseSave(raw, now = Date.now()) {
  const base = defaultChaseSave(now);
  if (!raw || typeof raw !== "object") return base;
  const src = /** @type {Record<string, unknown>} */ (raw);
  return {
    highScore: Math.max(0, Math.round(Number(src.highScore) || 0)),
    totalCatches: Math.max(0, Math.round(Number(src.totalCatches) || 0)),
    dailyYmd: typeof src.dailyYmd === "string" ? src.dailyYmd.slice(0, 10) : base.dailyYmd,
    dailyCatches: Math.max(0, Math.round(Number(src.dailyCatches) || 0)),
    dailyCoinsEarned: Math.max(0, Math.round(Number(src.dailyCoinsEarned) || 0)),
    streakDays: Math.max(0, Math.round(Number(src.streakDays) || 0)),
    lastPlayedYmd: typeof src.lastPlayedYmd === "string" ? src.lastPlayedYmd.slice(0, 10) : "",
    unlockedVariants: Array.isArray(src.unlockedVariants)
      ? src.unlockedVariants.map(String)
      : base.unlockedVariants,
  };
}

/**
 * @param {"easy"|"normal"|"hard"} difficulty
 */
export function chaseDifficultyConfig(difficulty) {
  if (difficulty === "easy") {
    return { girlSpeed: 2.4, spawnMs: 2200, catchGoal: 4, coinPerCatch: 8 };
  }
  if (difficulty === "hard") {
    return { girlSpeed: 3.9, spawnMs: 1400, catchGoal: 6, coinPerCatch: 14 };
  }
  return { girlSpeed: CHASE_GIRL_SPEED, spawnMs: CHASE_SPAWN_MS, catchGoal: CHASE_CATCH_GOAL, coinPerCatch: 10 };
}

/**
 * @param {ChaseSave} save
 * @param {number} [now]
 */
export function rollDailyChase(save, now = Date.now()) {
  const current = normalizeChaseSave(save, now);
  const ymd = dailyYmd(now);
  if (current.dailyYmd === ymd) return current;
  const playedYesterday =
    current.lastPlayedYmd &&
    current.lastPlayedYmd === new Date(now - 86400000).toISOString().slice(0, 10);
  return {
    ...current,
    dailyYmd: ymd,
    dailyCatches: 0,
    dailyCoinsEarned: 0,
    streakDays: playedYesterday ? current.streakDays + 1 : 0,
  };
}

/**
 * @param {ChaseSave} save
 * @param {{ catches: number, score: number, coins: number }} result
 * @param {number} [now]
 */
export function applyChaseResult(save, result, now = Date.now()) {
  let next = rollDailyChase(save, now);
  const ymd = dailyYmd(now);
  next = {
    ...next,
    highScore: Math.max(next.highScore, Math.round(result.score || 0)),
    totalCatches: next.totalCatches + Math.max(0, Math.round(result.catches || 0)),
    dailyCatches: next.dailyCatches + Math.max(0, Math.round(result.catches || 0)),
    dailyCoinsEarned: next.dailyCoinsEarned + Math.max(0, Math.round(result.coins || 0)),
    lastPlayedYmd: ymd,
  };
  if (next.dailyCatches >= 3 && !next.unlockedVariants.includes("runner")) {
    next.unlockedVariants = [...next.unlockedVariants, "runner"];
  }
  return next;
}

/**
 * Lightweight 2D chase sim for tests + headless logic.
 * @param {{
 *   width?: number,
 *   height?: number,
 *   difficulty?: "easy"|"normal"|"hard",
 *   premium?: boolean,
 *   tickMs?: number,
 *   durationMs?: number,
 *   rng?: () => number,
 * }} [opts]
 */
export function simulateChaseRound(opts = {}) {
  const width = opts.width || 320;
  const height = opts.height || 480;
  const cfg = chaseDifficultyConfig(opts.difficulty || "normal");
  const rng = opts.rng || Math.random;
  const durationMs = opts.durationMs || CHASE_ROUND_SECONDS * 1000;
  const tickMs = opts.tickMs || 100;

  let t = 0;
  let catches = 0;
  let score = 0;
  let nextSpawn = 0;
  /** @type {{ x: number, y: number, active: boolean }[]} */
  const girls = [];

  const player = { x: width / 2, y: height * 0.82 };

  while (t < durationMs) {
    if (t >= nextSpawn) {
      girls.push({
        x: 24 + rng() * (width - 48),
        y: 48 + rng() * (height * 0.45),
        active: true,
      });
      nextSpawn = t + cfg.spawnMs * (opts.premium ? 1.15 : 1);
    }

    for (const girl of girls) {
      if (!girl.active) continue;
      const dx = player.x - girl.x;
      const dy = player.y - girl.y;
      const dist = Math.hypot(dx, dy) || 1;
      girl.x += (dx / dist) * cfg.girlSpeed * (tickMs / 16);
      girl.y += (dy / dist) * cfg.girlSpeed * (tickMs / 16);
      if (dist < 28) {
        girl.active = false;
        catches += 1;
        score += 100 + Math.round(rng() * 40);
      }
    }

    t += tickMs;
    if (catches >= cfg.catchGoal) break;
  }

  const coins = catches * cfg.coinPerCatch + (catches >= cfg.catchGoal ? 25 : 0);
  return { catches, score, coins, goal: cfg.catchGoal, durationMs: t };
}

/**
 * @param {boolean} isEnglish
 * @param {{ catches: number, coins: number, goal: number }} result
 */
export function formatChaseSummary(isEnglish, result) {
  if (isEnglish) {
    return `Caught ${result.catches}/${result.goal} · +${result.coins} coins`;
  }
  return `捉到 ${result.catches}/${result.goal} · +${result.coins} 金幣`;
}
