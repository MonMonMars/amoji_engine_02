/**
 * Soft latency budgets for worker pipeline turns (lab / demos).
 */
export const LATENCY_BUDGET_SCHEMA = "amoji.latencyBudget.v1";

/** Default budgets aimed at interactive lab feel (not GPU SLAs). */
export const DEFAULT_LATENCY_BUDGET = Object.freeze({
  asrMs: 1500,
  robotMs: 800,
  ttsMs: 2000,
  totalMs: 3500,
});

/**
 * @param {Partial<typeof DEFAULT_LATENCY_BUDGET>} [overrides]
 */
export function resolveLatencyBudget(overrides = {}) {
  return {
    asrMs: Number(overrides.asrMs) || DEFAULT_LATENCY_BUDGET.asrMs,
    robotMs: Number(overrides.robotMs) || DEFAULT_LATENCY_BUDGET.robotMs,
    ttsMs: Number(overrides.ttsMs) || DEFAULT_LATENCY_BUDGET.ttsMs,
    totalMs: Number(overrides.totalMs) || DEFAULT_LATENCY_BUDGET.totalMs,
  };
}

/**
 * Compare turn metrics against a budget.
 * @param {object | null | undefined} metrics
 * @param {Partial<typeof DEFAULT_LATENCY_BUDGET>} [budget]
 */
export function checkLatencyBudget(metrics, budget) {
  const limits = resolveLatencyBudget(budget);
  /** @type {{ key: string, value: number, limit: number }[]} */
  const breaches = [];
  if (!metrics || typeof metrics !== "object") {
    return {
      schema: LATENCY_BUDGET_SCHEMA,
      ok: false,
      skipped: true,
      breaches,
      budget: limits,
    };
  }

  for (const key of /** @type {const} */ ([
    "asrMs",
    "robotMs",
    "ttsMs",
    "totalMs",
  ])) {
    const value = Number(metrics[key]);
    const limit = limits[key];
    if (!Number.isFinite(value) || value < 0) continue;
    if (value > limit) {
      breaches.push({ key, value: Math.round(value), limit });
    }
  }

  return {
    schema: LATENCY_BUDGET_SCHEMA,
    ok: breaches.length === 0,
    skipped: false,
    breaches,
    budget: limits,
  };
}

/**
 * Short HUD / log line for a budget check.
 * @param {ReturnType<typeof checkLatencyBudget>} result
 */
export function formatLatencyBudget(result) {
  if (!result || result.skipped) return "budget —";
  if (result.ok) return `budget ok (Σ≤${result.budget.totalMs}ms)`;
  return `budget miss ${result.breaches
    .map((b) => `${b.key} ${b.value}>${b.limit}`)
    .join(", ")}`;
}
