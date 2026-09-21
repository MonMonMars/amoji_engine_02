/**
 * Procedural poke reaction — upper-body shake, feet stay planted.
 */
import { lockedIdleHipTilt } from "./companionFootLock.js";

export const COMPANION_POKE_BODY_SCHEMA = "amoji.companionPokeBody.v1";

/** Visible wobble window after a tap (seconds). */
export const POKE_SHAKE_DURATION_SEC = 0.62;

/**
 * @param {number} elapsedSec
 * @param {number} [duration]
 */
export function pokeShakeEnvelope(elapsedSec, duration = POKE_SHAKE_DURATION_SEC) {
  if (elapsedSec < 0 || elapsedSec >= duration) return 0;
  const p = elapsedSec / duration;
  const attack = Math.min(1, elapsedSec / 0.055);
  const decay = Math.pow(Math.max(0, 1 - p), 1.75);
  return attack * decay;
}

/**
 * @param {import('three').Vector3 | { x?: number } | null | undefined} point
 * @param {number} [anchorX]
 * @returns {-1 | 0 | 1}
 */
export function pokeSideBiasFromPoint(point, anchorX = 0) {
  if (!point || !Number.isFinite(point.x)) return 0;
  const dx = point.x - anchorX;
  if (Math.abs(dx) < 0.025) return 0;
  return dx > 0 ? 1 : -1;
}

/**
 * Upper-body-only pose overlay (no leg / root channels).
 * @param {number} elapsedSec
 * @param {{ strength?: number, sideBias?: number }} [opts]
 */
export function samplePokeShakePose(elapsedSec, opts = {}) {
  const env = pokeShakeEnvelope(elapsedSec);
  if (env <= 0) return {};
  const strength = Math.max(0.55, Math.min(1.45, opts.strength ?? 1)) * env;
  const side = Math.max(-1, Math.min(1, opts.sideBias ?? 0));
  const t = elapsedSec;
  const wobble =
    Math.sin(t * 14.2) * 0.52 + Math.sin(t * 9.4 + 0.65) * 0.48;
  const jolt = Math.sin(t * 18.5) * 0.35 * Math.max(0, 1 - t * 1.6);

  return {
    spineX: (0.018 + wobble * 0.042 + jolt * 0.02) * strength,
    spineZ: (side * -0.022 + wobble * 0.026) * strength,
    chestX: wobble * 0.018 * strength,
    headX: (-0.012 + wobble * 0.058 + jolt * 0.035) * strength,
    headZ: (side * 0.045 + wobble * 0.05) * strength,
    leanY: (side * -0.04 + wobble * 0.032) * strength,
    hipZ: lockedIdleHipTilt(wobble * 0.022 * strength, 0.42),
  };
}
