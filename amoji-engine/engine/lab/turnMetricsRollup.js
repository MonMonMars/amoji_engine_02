/**
 * Rolling turn latency stats for the realtime voice lab / demos.
 *
 * Tracks asrMs / robotMs / ttsMs / totalMs samples and exposes mean / p50 / p95.
 */

export const TURN_METRICS_ROLLUP_SCHEMA = "amoji.turnMetricsRollup.v1";

const KEYS = ["asrMs", "robotMs", "ttsMs", "totalMs"];

/**
 * Nearest-rank percentile on a sorted numeric array.
 * @param {number[]} sorted
 * @param {number} p 0–100
 */
export function percentileNearest(sorted, p) {
  if (!sorted.length) return null;
  const clamped = Math.min(100, Math.max(0, Number(p) || 0));
  if (sorted.length === 1) return sorted[0];
  const rank = Math.ceil((clamped / 100) * sorted.length);
  const idx = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[idx];
}

/**
 * @param {number[]} values
 */
export function summarizeSeries(values) {
  if (!values.length) {
    return { count: 0, mean: null, p50: null, p95: null, min: null, max: null };
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  return {
    count: sorted.length,
    mean: Math.round(sum / sorted.length),
    p50: percentileNearest(sorted, 50),
    p95: percentileNearest(sorted, 95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Normalize a pipeline metrics object into numeric samples.
 * @param {object | null | undefined} metrics
 */
export function normalizeTurnMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") return null;
  /** @type {Record<string, number>} */
  const out = {};
  for (const key of KEYS) {
    const n = Number(metrics[key]);
    if (!Number.isFinite(n) || n < 0) return null;
    out[key] = Math.round(n);
  }
  return {
    ...out,
    barged: Boolean(metrics.barged),
    chunkCount:
      metrics.chunkCount == null ? null : Number(metrics.chunkCount) || 0,
    speechMs: metrics.speechMs == null ? null : Number(metrics.speechMs),
  };
}

/**
 * @param {{ maxSamples?: number }} [opts]
 */
export function createTurnMetricsRollup(opts = {}) {
  const maxSamples = Math.max(1, Number(opts.maxSamples) || 200);
  /** @type {ReturnType<typeof normalizeTurnMetrics>[]} */
  let samples = [];

  const push = (metrics) => {
    const row = normalizeTurnMetrics(metrics);
    if (!row) return null;
    samples.push(row);
    if (samples.length > maxSamples) {
      samples = samples.slice(samples.length - maxSamples);
    }
    return row;
  };

  const series = (key) =>
    samples
      .map((s) => s?.[key])
      .filter((n) => typeof n === "number" && Number.isFinite(n));

  const summary = () => {
    /** @type {Record<string, ReturnType<typeof summarizeSeries>>} */
    const byKey = {};
    for (const key of KEYS) {
      byKey[key] = summarizeSeries(series(key));
    }
    return {
      schema: TURN_METRICS_ROLLUP_SCHEMA,
      count: samples.length,
      bargedCount: samples.filter((s) => s.barged).length,
      ...byKey,
    };
  };

  const formatHud = () => {
    const s = summary();
    if (!s.count) return "—";
    const t = s.totalMs;
    return `n=${s.count} Σ p50 ${t.p50} · p95 ${t.p95} · μ ${t.mean}ms`;
  };

  return {
    get schema() {
      return TURN_METRICS_ROLLUP_SCHEMA;
    },
    get length() {
      return samples.length;
    },
    get samples() {
      return samples.map((s) => ({ ...s }));
    },
    push,
    summary,
    formatHud,
    clear() {
      samples = [];
    },
    toJSON() {
      return {
        schema: TURN_METRICS_ROLLUP_SCHEMA,
        samples: samples.map((s) => ({ ...s })),
        summary: summary(),
      };
    },
    /** @param {{ samples?: object[] } | object[]} data */
    fromJSON(data) {
      const list = Array.isArray(data) ? data : (data?.samples ?? []);
      samples = [];
      for (const row of list) {
        push(row);
      }
      return this;
    },
  };
}
