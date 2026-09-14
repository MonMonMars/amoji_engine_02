/**
 * Mic energy helpers for companion UI metering (button bounce, glow).
 */

/**
 * @param {Uint8Array} buf
 * @returns {number}
 */
export function rmsFromByteTimeDomain(buf) {
  if (!buf?.length) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

/**
 * Map RMS to 0–1 for visual metering.
 * @param {number} rms
 * @param {{ floor?: number, ceiling?: number }} [opts]
 */
export function normalizeMicLevel(rms, opts = {}) {
  const floor = opts.floor ?? 0.008;
  const ceiling = opts.ceiling ?? 0.13;
  const span = Math.max(0.001, ceiling - floor);
  const n = (Number(rms) - floor) / span;
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * @param {number} [alpha]
 */
export function createMicLevelSmoother(alpha = 0.32) {
  const smooth = Math.min(1, Math.max(0.05, Number(alpha) || 0.32));
  let level = 0;

  return {
    get level() {
      return level;
    },
    /**
     * @param {number} rms
     */
    push(rms) {
      const target = normalizeMicLevel(rms);
      level = level * (1 - smooth) + target * smooth;
      return level;
    },
    reset() {
      level = 0;
      return 0;
    },
  };
}
