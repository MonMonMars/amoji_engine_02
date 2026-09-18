/**
 * Canvas renderer for ChatGPT-style cloud voice orb — airy mist layers + live volume.
 */
export const COMPANION_EMOTION_ORB_CANVAS_SCHEMA =
  "amoji.companionEmotionOrbCanvas.v2";

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
 * Pastel cloud palette — desaturate and lift lightness so the orb reads as mist, not gel.
 * @param {number} hue
 * @param {number} sat
 * @param {number} light
 */
export function resolveCloudOrbPalette(hue, sat, light) {
  const h = Number(hue) || 210;
  const s = Number(sat) || 40;
  const l = Number(light) || 58;
  return {
    hue: h,
    sat: clamp(s * 0.38, 14, 48),
    light: clamp(l + 26, 72, 94),
    mistSat: clamp(s * 0.22, 8, 32),
    mistLight: clamp(l + 34, 82, 98),
    accentSat: clamp(s * 0.52, 18, 58),
    accentLight: clamp(l + 18, 68, 88),
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {number} hue
 * @param {number} sat
 * @param {number} light
 * @param {number} alpha
 */
function drawSoftCloudPuff(ctx, x, y, radius, hue, sat, light, alpha) {
  const g = ctx.createRadialGradient(
    x - radius * 0.12,
    y - radius * 0.16,
    radius * 0.04,
    x,
    y,
    radius,
  );
  g.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(99, light + 6)}%, ${alpha})`);
  g.addColorStop(0.38, `hsla(${hue}, ${Math.max(8, sat - 6)}%, ${light}%, ${alpha * 0.52})`);
  g.addColorStop(0.72, `hsla(${hue}, ${Math.max(6, sat - 14)}%, ${Math.min(96, light + 4)}%, ${alpha * 0.2})`);
  g.addColorStop(1, `hsla(${hue}, ${Math.max(4, sat * 0.5)}%, ${Math.min(98, light + 10)}%, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} alpha
 * @param {{ x: number, y: number }} drift
 */
function drawCloudWhiteCore(ctx, cx, cy, radius, alpha, drift) {
  const hx = cx - radius * 0.14 + drift.x;
  const hy = cy - radius * 0.24 + drift.y;
  const g = ctx.createRadialGradient(hx, hy, 0, cx, cy, radius);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.42, `rgba(255,255,255,${alpha * 0.38})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {number} time
 * @param {number} volume
 * @param {string} state
 * @param {boolean} compact
 */
function buildCloudPuffSpecs(time, volume, state, compact) {
  const count = compact ? 5 : 7;
  const spread = compact ? 0.24 : 0.34;
  const spin = state === "thinking" || state === "loading" ? time * 0.55 : time * 0.12;
  /** @type {{ ox: number, oy: number, r: number, a: number }[]} */
  const specs = [
    {
      ox: 0,
      oy: 0,
      r: 0.78 + volume * 0.16,
      a: 0.22 + volume * 0.14,
    },
  ];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + spin;
    const wobble = Math.sin(time * 1.05 + i * 1.35) * 0.08;
    const dist = spread * (0.62 + wobble + volume * 0.12);
    specs.push({
      ox: Math.cos(angle) * dist,
      oy: Math.sin(angle) * dist * 0.86,
      r: 0.46 + (i % 3) * 0.1 + volume * 0.1,
      a: 0.12 + volume * 0.08 + (i % 2) * 0.03,
    });
  }
  return specs;
}

/**
 * ChatGPT-style airy cloud orb (full + chip).
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
function drawCloudEmotionOrb(ctx, width, height, opts) {
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const state = String(opts.state || "idle");
  const reduced = Boolean(opts.reducedMotion);
  const time = reduced ? 0 : Number(opts.time) || 0;
  const compact = Boolean(opts.compact);
  const palette = resolveCloudOrbPalette(opts.hue, opts.sat, opts.light);
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height);
  const breath = reduced
    ? 1
    : 1 + volume * 0.18 + Math.sin(time * 1.15) * 0.035;
  const baseR = size * (compact ? 0.36 : 0.34) * breath;
  const squash = reduced ? 1 : clamp(Number(opts.squash) || 1, 0.88, 1.12);
  const spin = reduced ? 0 : Number(opts.spin) || 0;
  const drift = reduced
    ? { x: 0, y: 0 }
    : {
        x: Math.sin(time * 0.85) * baseR * 0.04,
        y: Math.cos(time * 0.72) * baseR * 0.035,
      };

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (compact) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(1 / Math.sqrt(squash), squash);
    ctx.translate(-cx, -cy);
  }

  const outerGlow = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR * 2.4);
  outerGlow.addColorStop(
    0,
    `hsla(${palette.hue}, ${palette.mistSat}%, ${palette.mistLight}%, ${0.14 + volume * 0.18})`,
  );
  outerGlow.addColorStop(
    0.42,
    `hsla(${palette.hue}, ${palette.sat}%, ${palette.light}%, ${0.08 + volume * 0.1})`,
  );
  outerGlow.addColorStop(1, "hsla(0, 0%, 100%, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "screen";

  const specs = buildCloudPuffSpecs(time, volume, state, compact);
  for (const puff of specs) {
    const px = cx + puff.ox * baseR * 1.05;
    const py = cy + puff.oy * baseR * 1.05;
    drawSoftCloudPuff(
      ctx,
      px,
      py,
      baseR * puff.r,
      palette.hue,
      palette.sat,
      palette.light,
      puff.a,
    );
  }

  drawSoftCloudPuff(
    ctx,
    cx + drift.x * 0.5,
    cy + drift.y * 0.5,
    baseR * (0.52 + volume * 0.08),
    palette.hue + 8,
    palette.accentSat,
    palette.accentLight,
    0.1 + volume * 0.08,
  );

  ctx.globalCompositeOperation = prevComposite || "source-over";

  drawCloudWhiteCore(
    ctx,
    cx + drift.x,
    cy + drift.y,
    baseR * (0.72 + volume * 0.12),
    0.42 + volume * 0.28,
    drift,
  );

  if ((state === "thinking" || state === "loading") && !reduced) {
    const orbit = baseR * (state === "loading" ? 0.34 : 0.42);
    const ox =
      cx + Math.cos(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    const oy =
      cy + Math.sin(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    drawSoftCloudPuff(
      ctx,
      ox,
      oy,
      baseR * 0.34,
      palette.hue + 14,
      palette.accentSat,
      palette.accentLight,
      0.28,
    );
  }

  if (
    !reduced &&
    volume > 0.06 &&
    (state === "speaking" || state === "listening")
  ) {
    const incoming = state === "listening";
    for (let r = 0; r < 2; r += 1) {
      const phase = ((time * 1.35 + r * 0.45) % 1);
      const t = incoming ? 1 - phase : phase;
      const rippleR = baseR * (1.02 + t * 0.42);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * volume * 0.28})`;
      ctx.lineWidth = compact ? 0.9 : 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }
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
  drawCloudEmotionOrb(ctx, width, height, opts);
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
      0.18 +
      volume * 0.62 +
      Math.sin(time * 5.5 + i * 0.72) * 0.14 * volume +
      Math.sin(time * 3.1 + i * 1.15) * 0.08;
    out[i] = clamp(wave, 0.06, 0.82);
  }
  return out;
}
