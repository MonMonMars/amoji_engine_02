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
 * }} opts
 */
export function drawEmotionOrbFrame(ctx, width, height, opts) {
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
    state === "thinking"
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
    const ripples = 2;
    for (let r = 0; r < ripples; r++) {
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
