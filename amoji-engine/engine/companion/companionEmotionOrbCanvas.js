/**
 * Canvas renderer for ChatGPT-style fluid voice orb — emotion hue + live volume.
 */
export const COMPANION_EMOTION_ORB_CANVAS_SCHEMA =
  "amoji.companionEmotionOrbCanvas.v1";

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {number} current
 * @param {number} target
 * @param {number} factor
 */
export function smoothStep(current, target, factor) {
  return current + (target - current) * factor;
}

/**
 * Shortest-path hue interpolation (0..360).
 * @param {number} from
 * @param {number} to
 * @param {number} factor
 */
export function lerpHue(from, to, factor) {
  const a = ((Number(from) || 0) % 360 + 360) % 360;
  const b = ((Number(to) || 0) % 360 + 360) % 360;
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return ((a + delta * clamp(factor, 0, 1)) % 360 + 360) % 360;
}

/**
 * Whether the user asked for less motion (still update color + volume).
 */
export function prefersReducedMotion(media = globalThis.matchMedia) {
  try {
    return Boolean(media?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} wobbleAmp
 * @param {number} time
 * @param {number} spin
 */
function fillWobblyBlob(ctx, cx, cy, radius, wobbleAmp, time, spin) {
  const points = 72;
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2 + spin;
    const wobble =
      1 +
      Math.sin(angle * 3 + time * 2.1) * wobbleAmp * 0.55 +
      Math.sin(angle * 5 - time * 2.8) * wobbleAmp * 0.35 +
      Math.sin(angle * 2 + time * 1.4) * wobbleAmp * 0.25;
    const r = radius * wobble;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Chip-sized ChatGPT orb: clipped to the circle, squash-breath, thinking swirl.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{
 *   time: number,
 *   volume: number,
 *   hue: number,
 *   sat: number,
 *   light: number,
 *   state: string,
 *   wobble?: number,
 *   squash?: number,
 *   spin?: number,
 *   reducedMotion?: boolean,
 * }} opts
 */
function drawCompactEmotionOrb(ctx, width, height, opts) {
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const hue = Number(opts.hue) || 0;
  const sat = Number(opts.sat) || 0;
  const light = Number(opts.light) || 50;
  const state = String(opts.state || "idle");
  const reduced = Boolean(opts.reducedMotion);
  const time = reduced ? 0 : Number(opts.time) || 0;
  const squash = reduced ? 1 : clamp(Number(opts.squash) || 1, 0.82, 1.18);
  const spin = reduced ? 0 : Number(opts.spin) || 0;
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height);
  const base = size * 0.34;
  const pulse = 1 + volume * 0.38;
  const radius = Math.min(base * pulse, size * 0.46);
  const wobbleAmp =
    opts.wobble != null
      ? clamp(Number(opts.wobble) || 0, 0, 0.45)
      : state === "thinking" || state === "loading"
        ? 0.055
        : state === "idle" || state === "typing"
          ? 0.04
          : 0.07 + volume * 0.12;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.scale(1 / Math.sqrt(squash), squash);
  ctx.translate(-cx, -cy);

  const glow = ctx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.18);
  glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 18}%, ${0.28 + volume * 0.42})`);
  glow.addColorStop(0.55, `hsla(${hue}, ${sat}%, ${light}%, ${0.16 + volume * 0.22})`);
  glow.addColorStop(1, "hsla(0, 0%, 0%, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.18, 0, Math.PI * 2);
  ctx.fill();

  const core = ctx.createRadialGradient(
    cx - radius * 0.22,
    cy - radius * 0.28,
    radius * 0.05,
    cx,
    cy,
    radius * 1.08,
  );
  core.addColorStop(0, `hsl(${hue + 12} ${Math.min(98, sat + 12)}% ${Math.min(88, light + 24)}%)`);
  core.addColorStop(0.42, `hsl(${hue} ${sat}% ${light}%)`);
  core.addColorStop(1, `hsl(${hue - 8} ${Math.max(32, sat - 12)}% ${Math.max(18, light - 28)}%)`);
  ctx.fillStyle = core;
  fillWobblyBlob(ctx, cx, cy, radius, wobbleAmp, time, spin);

  if ((state === "thinking" || state === "loading") && !reduced) {
    const orbit = radius * (state === "loading" ? 0.22 : 0.28);
    const ox = cx + Math.cos(time * (state === "loading" ? 1.1 : 1.7) + spin) * orbit;
    const oy = cy + Math.sin(time * (state === "loading" ? 1.1 : 1.7) + spin) * orbit;
    const satBlob = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius * 0.42);
    satBlob.addColorStop(0, `hsla(${hue + 18}, ${Math.min(98, sat + 8)}%, ${Math.min(88, light + 18)}%, 0.7)`);
    satBlob.addColorStop(1, "hsla(0, 0%, 0%, 0)");
    ctx.fillStyle = satBlob;
    ctx.beginPath();
    ctx.arc(ox, oy, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }

  const hx = cx - radius * 0.18 + Math.sin(time * 1.1) * radius * 0.06;
  const hy = cy - radius * 0.28 + Math.cos(time * 0.9) * radius * 0.05;
  const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, radius * 0.48);
  shine.addColorStop(0, `rgba(255,255,255,${0.55 + volume * 0.22})`);
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(hx, hy, radius * 0.34, radius * 0.2, -0.45, 0, Math.PI * 2);
  ctx.fill();

  if (
    !reduced &&
    volume > 0.08 &&
    (state === "speaking" || state === "listening")
  ) {
    const incoming = state === "listening";
    const phase = (time * 1.6) % 1;
    const t = incoming ? 1 - phase : phase;
    const rippleR = radius * (1.02 + t * 0.28);
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light + 10}%, ${(1 - t) * volume * 0.42})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {{
 *   time: number,
 *   volume: number,
 *   hue: number,
 *   sat: number,
 *   light: number,
 *   state: string,
 *   compact?: boolean,
 *   wobble?: number,
 *   squash?: number,
 *   spin?: number,
 *   reducedMotion?: boolean,
 * }} opts
 */
export function drawEmotionOrbFrame(ctx, width, height, opts) {
  if (opts.compact) {
    drawCompactEmotionOrb(ctx, width, height, opts);
    return;
  }

  const { time, volume, hue, sat, light, state } = opts;
  const cx = width / 2;
  const cy = height / 2;
  const base = Math.min(width, height) * 0.34;
  const pulse = 1 + volume * 0.38;
  const radius = base * pulse;

  ctx.clearRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius * 2.1);
  glow.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 18}%, ${0.22 + volume * 0.35})`);
  glow.addColorStop(0.45, `hsla(${hue}, ${sat}%, ${light}%, ${0.12 + volume * 0.22})`);
  glow.addColorStop(1, "hsla(0, 0%, 0%, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  const points = 72;
  const wobbleAmp =
    opts.wobble != null
      ? clamp(Number(opts.wobble) || 0, 0, 0.45)
      : state === "thinking"
        ? 0.05
        : state === "idle"
          ? 0.035
          : 0.08 + volume * 0.18;

  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble =
      1 +
      Math.sin(angle * 3 + time * 2.1) * wobbleAmp * 0.55 +
      Math.sin(angle * 5 - time * 2.8) * wobbleAmp * 0.35 +
      Math.sin(angle * 2 + time * 1.4) * wobbleAmp * 0.25;
    const r = radius * wobble;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const core = ctx.createRadialGradient(
    cx - radius * 0.22,
    cy - radius * 0.28,
    radius * 0.05,
    cx,
    cy,
    radius * 1.15,
  );
  core.addColorStop(0, `hsl(${hue + 12} ${Math.min(98, sat + 12)}% ${Math.min(88, light + 24)}%)`);
  core.addColorStop(0.42, `hsl(${hue} ${sat}% ${light}%)`);
  core.addColorStop(1, `hsl(${hue - 8} ${Math.max(32, sat - 12)}% ${Math.max(18, light - 28)}%)`);
  ctx.fillStyle = core;
  ctx.fill();

  ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light + 20}%, ${0.35 + volume * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const shine = ctx.createRadialGradient(
    cx - radius * 0.18,
    cy - radius * 0.32,
    0,
    cx - radius * 0.1,
    cy - radius * 0.2,
    radius * 0.55,
  );
  shine.addColorStop(0, "rgba(255,255,255,0.75)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(
    cx - radius * 0.12,
    cy - radius * 0.22,
    radius * 0.38,
    radius * 0.22,
    -0.45,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (state === "listening" || state === "speaking" || state === "thinking") {
    const bars = 28;
    const innerR = radius * 1.12;
    const outerR = radius * (1.32 + volume * 0.22);
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const phase = time * 4.5 + i * 0.55;
      const bar =
        state === "thinking"
          ? 0.25 + Math.sin(phase) * 0.15
          : 0.18 + volume * 0.75 + Math.sin(phase) * 0.22 * volume;
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * (innerR + (outerR - innerR) * bar);
      const y2 = cy + Math.sin(angle) * (outerR - innerR) * bar + cy - cy;
      const y2fixed = cy + Math.sin(angle) * (innerR + (outerR - innerR) * bar);
      ctx.strokeStyle = `hsla(${hue + 20}, ${sat}%, ${light + 16}%, ${0.35 + bar * 0.55})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2fixed);
      ctx.stroke();
    }
  }

  if (volume > 0.08 && (state === "speaking" || state === "listening")) {
    for (let r = 0; r < 2; r++) {
      const phase = (time * 1.6 + r * 0.5) % 1;
      const rippleR = radius * (1.05 + phase * 0.55);
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light + 10}%, ${(1 - phase) * volume * 0.5})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * @param {readonly number[]} levels
 * @param {number} volume
 * @param {number} time
 * @param {number} [count]
 */
export function buildSpectrumLevels(levels, volume, time, count = 16) {
  const out = levels.length === count ? levels : new Array(count).fill(0);
  for (let i = 0; i < count; i++) {
    const wave =
      0.22 +
      volume * 0.78 +
      Math.sin(time * 5.5 + i * 0.72) * 0.18 * volume +
      Math.sin(time * 3.1 + i * 1.15) * 0.1;
    out[i] = clamp(wave, 0.08, 1);
  }
  return out;
}
