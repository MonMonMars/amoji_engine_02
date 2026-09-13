/**
 * Smoothed mic energy meter for lab VAD tuning.
 */
import { frameEnergy } from "../voice/alwaysOnListen.js";

export const MIC_LEVEL_METER_SCHEMA = "amoji.micLevelMeter.v1";

/**
 * @param {{
 *   alpha?: number,
 *   peakDecay?: number,
 *   threshold?: number,
 *   nowMs?: () => number,
 * }} [opts]
 */
export function createMicLevelMeter(opts = {}) {
  const alpha = clamp01(opts.alpha ?? 0.35);
  const peakDecay = Math.max(0.001, Number(opts.peakDecay) || 0.92);
  let threshold = Math.max(0, Number(opts.threshold) || 0.025);
  let level = 0;
  let peak = 0;
  let lastAt = 0;
  const nowMs = opts.nowMs ?? (() => Date.now());

  return {
    get schema() {
      return MIC_LEVEL_METER_SCHEMA;
    },
    get level() {
      return level;
    },
    get peak() {
      return peak;
    },
    get threshold() {
      return threshold;
    },
    setThreshold(value) {
      threshold = Math.max(0, Number(value) || 0);
      return threshold;
    },
    /**
     * @param {Float32Array | Int16Array | ArrayLike<number>} frame
     */
    push(frame) {
      const energy = frameEnergy(frame);
      level = level * (1 - alpha) + energy * alpha;
      peak = Math.max(peak * peakDecay, energy);
      lastAt = nowMs();
      return this.snapshot();
    },
    reset() {
      level = 0;
      peak = 0;
      lastAt = 0;
      return this.snapshot();
    },
    snapshot() {
      const over = level >= threshold;
      return {
        schema: MIC_LEVEL_METER_SCHEMA,
        level,
        peak,
        threshold,
        over,
        headroom: threshold > 0 ? level / threshold : 0,
        lastAt,
      };
    },
    /**
     * Compact HUD string, e.g. `0.031 / thr 0.025 · ▓▓▓░░ SPEECH`.
     * @param {{ width?: number }} [fmt]
     */
    formatHud(fmt = {}) {
      const width = Math.max(4, Math.min(24, Number(fmt.width) || 10));
      const snap = this.snapshot();
      const filled = Math.round(clamp01(snap.level / Math.max(snap.threshold * 2, 0.001)) * width);
      const bar = `${"▓".repeat(filled)}${"░".repeat(width - filled)}`;
      return `${snap.level.toFixed(3)} / thr ${snap.threshold.toFixed(3)} · ${bar} ${
        snap.over ? "SPEECH" : "quiet"
      }`;
    },
  };
}

/** @param {number} n */
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
