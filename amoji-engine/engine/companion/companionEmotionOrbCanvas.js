/**
 * Canvas renderer for ChatGPT-style cloud voice orb — layered mist, volume pulse,
 * emotion tint, and an optional robot-face read (eyes + mouth) for mic / HUD display.
 */
export const COMPANION_EMOTION_ORB_CANVAS_SCHEMA =
  "amoji.companionEmotionOrbCanvas.v4";

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

/** @typedef {"neutral"|"happy"|"thinking"|"sad"|"surprised"|"angry"} OrbEmotionKey */

/** Robot-face geometry per emotion — drives eyes, mouth, blob skew. */
export const EMOTION_ORB_FACE_PROFILES = Object.freeze({
  neutral: {
    eyeSpread: 0.22,
    eyeY: -0.1,
    eyeSize: 0.075,
    mouthY: 0.14,
    mouthWidth: 0.16,
    blobSkewY: 0,
    blobTension: 0.04,
    warmth: 0,
  },
  happy: {
    eyeSpread: 0.24,
    eyeY: -0.11,
    eyeSize: 0.082,
    mouthY: 0.15,
    mouthWidth: 0.2,
    blobSkewY: -0.06,
    blobTension: 0.06,
    warmth: 0.12,
  },
  thinking: {
    eyeSpread: 0.2,
    eyeY: -0.12,
    eyeSize: 0.07,
    mouthY: 0.12,
    mouthWidth: 0.12,
    blobSkewY: 0.04,
    blobTension: 0.03,
    warmth: -0.04,
  },
  sad: {
    eyeSpread: 0.21,
    eyeY: -0.06,
    eyeSize: 0.068,
    mouthY: 0.17,
    mouthWidth: 0.14,
    blobSkewY: 0.1,
    blobTension: -0.02,
    warmth: -0.08,
  },
  surprised: {
    eyeSpread: 0.27,
    eyeY: -0.13,
    eyeSize: 0.092,
    mouthY: 0.16,
    mouthWidth: 0.12,
    blobSkewY: -0.08,
    blobTension: 0.1,
    warmth: 0.06,
  },
  angry: {
    eyeSpread: 0.23,
    eyeY: -0.09,
    eyeSize: 0.078,
    mouthY: 0.15,
    mouthWidth: 0.18,
    blobSkewY: 0.02,
    blobTension: 0.08,
    warmth: 0.18,
  },
});

/**
 * @param {string | null | undefined} emotion
 * @returns {keyof typeof EMOTION_ORB_FACE_PROFILES}
 */
export function normalizeOrbEmotion(emotion) {
  const key = String(emotion || "neutral").toLowerCase();
  if (EMOTION_ORB_FACE_PROFILES[key]) return key;
  const aliases = {
    joy: "happy",
    cheerful: "happy",
    calm: "neutral",
    curious: "thinking",
    sorrow: "sad",
    shock: "surprised",
    fear: "surprised",
    mad: "angry",
  };
  return aliases[key] || "neutral";
}

/**
 * @param {string | null | undefined} emotion
 */
export function resolveOrbFaceProfile(emotion) {
  return EMOTION_ORB_FACE_PROFILES[normalizeOrbEmotion(emotion)];
}

/**
 * Rich orb palette — live mode keeps ChatGPT saturation; idle stays airy.
 * @param {number} hue
 * @param {number} sat
 * @param {number} light
 * @param {{ live?: boolean, emotion?: string }} [opts]
 */
export function resolveCloudOrbPalette(hue, sat, light, opts = {}) {
  const h = Number(hue) || 210;
  const s = Number(sat) || 40;
  const l = Number(light) || 58;
  const live = Boolean(opts.live);
  const profile = resolveOrbFaceProfile(opts.emotion);
  const warmHue = lerpHue(h, h + profile.warmth * 38, 0.35);

  if (live) {
    return {
      hue: warmHue,
      sat: clamp(s * 0.92, 42, 96),
      light: clamp(l + 4, 48, 72),
      mistSat: clamp(s * 0.55, 24, 68),
      mistLight: clamp(l + 18, 68, 88),
      accentSat: clamp(s * 0.88, 38, 92),
      accentLight: clamp(l + 10, 58, 78),
      coreSat: clamp(s * 0.35, 12, 42),
      coreLight: clamp(l + 32, 82, 98),
      shadowSat: clamp(s * 0.65, 28, 72),
      shadowLight: clamp(l - 12, 28, 48),
    };
  }

  return {
    hue: warmHue,
    sat: clamp(s * 0.38, 14, 48),
    light: clamp(l + 26, 72, 94),
    mistSat: clamp(s * 0.22, 8, 32),
    mistLight: clamp(l + 34, 82, 98),
    accentSat: clamp(s * 0.52, 18, 58),
    accentLight: clamp(l + 18, 68, 88),
    coreSat: clamp(s * 0.18, 8, 28),
    coreLight: clamp(l + 36, 88, 99),
    shadowSat: clamp(s * 0.28, 10, 36),
    shadowLight: clamp(l + 8, 58, 78),
  };
}

/** @deprecated alias */
export function resolveEmotionOrbPalette(hue, sat, light, opts = {}) {
  return resolveCloudOrbPalette(hue, sat, light, opts);
}

/**
 * Organic blob radius at angle — volume + emotion deform the silhouette.
 * @param {number} angle
 * @param {{
 *   time?: number,
 *   volume?: number,
 *   wobble?: number,
 *   squash?: number,
 *   emotion?: string,
 *   reducedMotion?: boolean,
 * }} opts
 */
export function sampleOrganicBlobRadius(angle, opts = {}) {
  const time = Number(opts.time) || 0;
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const wobble = clamp(Number(opts.wobble) || 0.04, 0, 0.35);
  const squash = clamp(Number(opts.squash) || 1, 0.82, 1.18);
  const reduced = Boolean(opts.reducedMotion);
  const profile = resolveOrbFaceProfile(opts.emotion);
  const t = reduced ? 0 : time;

  const wave1 = Math.sin(angle * 2 + t * 1.05) * wobble;
  const wave2 = Math.sin(angle * 3 - t * 0.82) * wobble * 0.72;
  const wave3 = Math.cos(angle * 5 + t * 0.55) * wobble * 0.45;
  const volPulse =
    volume * (0.14 + Math.sin(angle * 2 - 0.6) * 0.05 + Math.cos(angle * 3) * 0.03);
  const skew =
    profile.blobSkewY * Math.sin(angle - Math.PI / 2) +
    profile.blobTension * Math.cos(angle * 2);

  let r = 1 + wave1 + wave2 + wave3 + volPulse + skew;
  const vertical = Math.sin(angle);
  r *= 1 + (squash - 1) * vertical * 0.55;
  return clamp(r, 0.72, 1.32);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} baseR
 * @param {Parameters<typeof sampleOrganicBlobRadius>[1]} opts
 * @param {number} [segments]
 */
function traceOrganicBlobPath(ctx, cx, cy, baseR, opts, segments = 72) {
  const step = (Math.PI * 2) / segments;
  let first = true;
  for (let i = 0; i <= segments; i += 1) {
    const angle = i * step;
    const rad = baseR * sampleOrganicBlobRadius(angle, opts);
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
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
    x - radius * 0.14,
    y - radius * 0.18,
    radius * 0.03,
    x,
    y,
    radius,
  );
  g.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(99, light + 8)}%, ${alpha})`);
  g.addColorStop(0.32, `hsla(${hue}, ${Math.max(8, sat - 4)}%, ${light}%, ${alpha * 0.62})`);
  g.addColorStop(0.68, `hsla(${hue}, ${Math.max(6, sat - 12)}%, ${Math.min(96, light + 4)}%, ${alpha * 0.24})`);
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
  const hx = cx - radius * 0.16 + drift.x;
  const hy = cy - radius * 0.28 + drift.y;
  const g = ctx.createRadialGradient(hx, hy, 0, cx, cy, radius);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.48})`);
  g.addColorStop(0.72, `rgba(255,255,255,${alpha * 0.12})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Inner swirl layers — ChatGPT-style depth inside the orb.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} baseR
 * @param {ReturnType<typeof resolveCloudOrbPalette>} palette
 * @param {{ time?: number, volume?: number, spin?: number, reducedMotion?: boolean }} opts
 */
function drawInnerSwirlLayers(ctx, cx, cy, baseR, palette, opts) {
  const time = Number(opts.time) || 0;
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const spin = Number(opts.spin) || 0;
  const reduced = Boolean(opts.reducedMotion);
  const t = reduced ? 0 : time;
  const layers = [
    { angle: t * 0.9 + spin, dist: 0.18, r: 0.42, alpha: 0.16 + volume * 0.12 },
    { angle: -t * 0.65 + spin * 0.5, dist: 0.14, r: 0.36, alpha: 0.12 + volume * 0.1 },
    { angle: t * 1.2 + spin * 1.2, dist: 0.1, r: 0.28, alpha: 0.1 + volume * 0.08 },
  ];
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "screen";
  for (const layer of layers) {
    const lx = cx + Math.cos(layer.angle) * baseR * layer.dist;
    const ly = cy + Math.sin(layer.angle) * baseR * layer.dist * 0.88;
    drawSoftCloudPuff(
      ctx,
      lx,
      ly,
      baseR * layer.r,
      palette.hue + 12,
      palette.accentSat,
      palette.accentLight,
      layer.alpha,
    );
  }
  ctx.globalCompositeOperation = prev || "source-over";
}

/**
 * Robot face — glowing eyes + volume-driven mouth (usable as standalone face display).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} baseR
 * @param {{
 *   emotion?: string,
 *   volume?: number,
 *   state?: string,
 *   time?: number,
 *   compact?: boolean,
 *   reducedMotion?: boolean,
 * }} opts
 */
export function drawOrbRobotFace(ctx, cx, cy, baseR, opts = {}) {
  const profile = resolveOrbFaceProfile(opts.emotion);
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const state = String(opts.state || "idle");
  const time = Number(opts.time) || 0;
  const compact = Boolean(opts.compact);
  const reduced = Boolean(opts.reducedMotion);
  const live = state === "speaking" || state === "listening";
  const speaking = state === "speaking";

  const eyeSpread = profile.eyeSpread * baseR;
  const eyeY = cy + profile.eyeY * baseR;
  const eyeR = profile.eyeSize * baseR * (compact ? 0.92 : 1);
  const blink =
    !reduced && !live && Math.sin(time * 0.45) > 0.985 ? 0.15 : 1;
  const eyeGlow = 0.55 + volume * 0.45;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeSpread;
    const ey = eyeY;
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeR * 2.2);
    g.addColorStop(0, `rgba(255,255,255,${0.92 * eyeGlow * blink})`);
    g.addColorStop(0.35, `rgba(255,255,255,${0.42 * eyeGlow})`);
    g.addColorStop(0.72, `rgba(255,255,255,${0.08 * eyeGlow})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ex, ey, eyeR * blink, eyeR * 1.15 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.88 * blink})`;
    ctx.beginPath();
    ctx.arc(ex, ey, eyeR * 0.38 * blink, 0, Math.PI * 2);
    ctx.fill();
  }

  const mouthY = cy + profile.mouthY * baseR;
  const mouthW = profile.mouthWidth * baseR;
  const mouthOpen =
    speaking
      ? 0.08 + volume * 0.22
      : live
        ? 0.04 + volume * 0.1
        : 0.02 + volume * 0.04;
  const mouthH = mouthOpen * baseR;

  if (speaking || live || volume > 0.05) {
    const mg = ctx.createRadialGradient(
      cx,
      mouthY - mouthH * 0.2,
      0,
      cx,
      mouthY,
      Math.max(mouthW, mouthH) * 1.2,
    );
    mg.addColorStop(0, `rgba(255,255,255,${0.35 + volume * 0.45})`);
    mg.addColorStop(0.55, `rgba(255,255,255,${0.12 + volume * 0.2})`);
    mg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY, mouthW * 0.5, Math.max(mouthH, mouthW * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const emotion = normalizeOrbEmotion(opts.emotion);
  if (emotion === "angry" && !compact) {
    ctx.strokeStyle = `rgba(255,255,255,${0.28 + volume * 0.2})`;
    ctx.lineWidth = Math.max(0.8, baseR * 0.04);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * eyeSpread * 0.55, eyeY - eyeR * 1.4);
      ctx.lineTo(cx + side * eyeSpread * 1.15, eyeY - eyeR * 2.1);
      ctx.stroke();
    }
  }
  if (emotion === "thinking" && !reduced) {
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + volume * 0.12})`;
    ctx.lineWidth = Math.max(0.6, baseR * 0.028);
    const orbitR = baseR * 0.38;
    const ox = cx + Math.cos(time * 1.4) * orbitR;
    const oy = cy + Math.sin(time * 1.4) * orbitR * 0.35 - baseR * 0.05;
    ctx.beginPath();
    ctx.arc(ox, oy, baseR * 0.055, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * @param {number} time
 * @param {number} volume
 * @param {string} state
 * @param {boolean} compact
 * @param {string} [emotion]
 */
function buildCloudPuffSpecs(time, volume, state, compact, emotion) {
  const count = compact ? 6 : 9;
  const spread = compact ? 0.26 : 0.36;
  const spin =
    state === "thinking" || state === "loading" ? time * 0.55 : time * 0.14;
  const profile = resolveOrbFaceProfile(emotion);
  /** @type {{ ox: number, oy: number, r: number, a: number }[]} */
  const specs = [
    {
      ox: 0,
      oy: profile.blobSkewY * 0.3,
      r: 0.8 + volume * 0.18,
      a: 0.24 + volume * 0.16,
    },
  ];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + spin;
    const wobble = Math.sin(time * 1.08 + i * 1.28) * 0.09;
    const dist = spread * (0.64 + wobble + volume * 0.14);
    specs.push({
      ox: Math.cos(angle) * dist,
      oy: Math.sin(angle) * dist * 0.86 + profile.blobSkewY * 0.2,
      r: 0.44 + (i % 3) * 0.09 + volume * 0.12,
      a: 0.13 + volume * 0.09 + (i % 2) * 0.03,
    });
  }
  return specs;
}

/**
 * Perfect-circle magic orb for mic button — glass sphere, inner swirl, specular shine.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Parameters<typeof drawCloudEmotionOrb>[3]} opts
 */
function drawMagicBallEmotionOrb(ctx, width, height, opts) {
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const state = String(opts.state || "idle");
  const emotion = normalizeOrbEmotion(opts.emotion);
  const reduced = Boolean(opts.reducedMotion);
  const time = reduced ? 0 : Number(opts.time) || 0;
  const live =
    Boolean(opts.live) || state === "speaking" || state === "listening";
  const palette = resolveCloudOrbPalette(opts.hue, opts.sat, opts.light, {
    live,
    emotion,
  });
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height);
  const volumeSize = 0.62 + volume * 0.38;
  const breath = reduced
    ? 1
    : 1 + Math.sin(time * 1.35) * 0.012 * (1 - volume * 0.65);
  const sphereR = size * 0.5 * volumeSize * breath;
  const spin = reduced ? 0 : Number(opts.spin) || 0;
  const drift = reduced
    ? { x: 0, y: 0 }
    : {
        x: Math.sin(time * 0.62) * sphereR * 0.012,
        y: Math.cos(time * 0.54) * sphereR * 0.01,
      };
  const sx = cx + drift.x;
  const sy = cy + drift.y;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.clip();

  const outerGlow = ctx.createRadialGradient(
    sx,
    sy,
    sphereR * 0.05,
    sx,
    sy,
    sphereR * 2.4,
  );
  outerGlow.addColorStop(
    0,
    `hsla(${palette.hue}, ${palette.mistSat}%, ${palette.mistLight}%, ${0.22 + volume * 0.24})`,
  );
  outerGlow.addColorStop(
    0.45,
    `hsla(${palette.hue}, ${palette.sat}%, ${palette.light}%, ${0.12 + volume * 0.16})`,
  );
  outerGlow.addColorStop(1, "hsla(0, 0%, 100%, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(sx, sy, sphereR * 2.4, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createRadialGradient(
    sx - sphereR * 0.28,
    sy - sphereR * 0.32,
    sphereR * 0.04,
    sx + sphereR * 0.08,
    sy + sphereR * 0.12,
    sphereR * 1.05,
  );
  bodyGrad.addColorStop(
    0,
    `hsla(${palette.hue}, ${Math.min(99, palette.coreSat + 6)}%, ${Math.min(99, palette.coreLight + 6)}%, 0.72)`,
  );
  bodyGrad.addColorStop(
    0.38,
    `hsla(${palette.hue}, ${palette.sat}%, ${palette.light}%, ${0.52 + volume * 0.28})`,
  );
  bodyGrad.addColorStop(
    0.72,
    `hsla(${palette.hue}, ${palette.shadowSat}%, ${palette.shadowLight}%, ${0.38 + volume * 0.14})`,
  );
  bodyGrad.addColorStop(
    1,
    `hsla(${palette.hue}, ${palette.mistSat}%, ${Math.max(18, palette.mistLight - 18)}%, 0.22)`,
  );
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, sphereR * 0.96, 0, Math.PI * 2);
  ctx.fill();

  const rimGrad = ctx.createRadialGradient(
    sx,
    sy,
    sphereR * 0.72,
    sx,
    sy,
    sphereR * 1.02,
  );
  rimGrad.addColorStop(0, "hsla(0, 0%, 100%, 0)");
  rimGrad.addColorStop(
    0.82,
    `hsla(${palette.hue}, ${palette.shadowSat}%, ${palette.shadowLight}%, ${0.08 + volume * 0.1})`,
  );
  rimGrad.addColorStop(
    1,
    `hsla(${palette.hue}, ${palette.shadowSat}%, ${Math.max(22, palette.shadowLight - 12)}%, ${0.28 + volume * 0.12})`,
  );
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, sphereR * 0.98, 0, Math.PI * 2);
  ctx.fill();

  drawInnerSwirlLayers(ctx, sx, sy, sphereR * 0.92, palette, {
    time,
    volume,
    spin,
    reducedMotion: reduced,
  });

  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "screen";
  drawSoftCloudPuff(
    ctx,
    sx - sphereR * 0.12,
    sy - sphereR * 0.08,
    sphereR * (0.38 + volume * 0.08),
    palette.hue + 8,
    palette.accentSat,
    palette.accentLight,
    0.16 + volume * 0.12,
  );
  ctx.globalCompositeOperation = prevComposite || "source-over";

  drawCloudWhiteCore(
    ctx,
    sx,
    sy,
    sphereR * (0.62 + volume * 0.1),
    0.42 + volume * 0.28,
    drift,
  );

  const specX = sx - sphereR * 0.22;
  const specY = sy - sphereR * 0.28;
  const specG = ctx.createRadialGradient(
    specX,
    specY,
    0,
    specX,
    specY,
    sphereR * 0.38,
  );
  specG.addColorStop(0, `rgba(255,255,255,${0.82 + volume * 0.12})`);
  specG.addColorStop(0.35, `rgba(255,255,255,${0.28 + volume * 0.18})`);
  specG.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = specG;
  ctx.beginPath();
  ctx.arc(specX, specY, sphereR * 0.34, 0, Math.PI * 2);
  ctx.fill();

  if (!reduced) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.85 + spin);
    ctx.strokeStyle = `rgba(255,255,255,${0.14 + volume * 0.22})`;
    ctx.lineWidth = Math.max(0.65, sphereR * 0.045);
    ctx.lineCap = "round";
    for (let band = 0; band < 2; band += 1) {
      const start = band * Math.PI + 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, sphereR * (0.58 + band * 0.12), start, start + Math.PI * 0.42);
      ctx.stroke();
    }
    ctx.restore();

    for (let i = 0; i < 3; i += 1) {
      const sparkleAngle = time * (1.1 + i * 0.15) + spin + i * 2.1;
      const dist = sphereR * (0.32 + (i % 2) * 0.14);
      const px = sx + Math.cos(sparkleAngle) * dist;
      const py = sy + Math.sin(sparkleAngle) * dist * 0.88;
      const twinkle = 0.35 + Math.sin(time * 3.2 + i * 1.7) * 0.25;
      ctx.fillStyle = `rgba(255,255,255,${(0.12 + volume * 0.2) * twinkle})`;
      ctx.beginPath();
      ctx.arc(px, py, sphereR * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (
    (state === "thinking" || state === "loading") &&
    !reduced
  ) {
    const orbit = sphereR * (state === "loading" ? 0.28 : 0.34);
    const ox = sx + Math.cos(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    const oy = sy + Math.sin(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    ctx.fillStyle = `rgba(255,255,255,${0.28 + volume * 0.2})`;
    ctx.beginPath();
    ctx.arc(ox, oy, sphereR * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  if (
    !reduced &&
    volume > 0.05 &&
    (state === "speaking" || state === "listening")
  ) {
    const incoming = state === "listening";
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, sphereR * 0.98, 0, Math.PI * 2);
    ctx.clip();
    for (let r = 0; r < 3; r += 1) {
      const phase = ((time * 1.55 + r * 0.34) % 1);
      const t = incoming ? 1 - phase : phase;
      const rippleR = sphereR * (0.92 + t * 0.38);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * volume * 0.28})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.arc(sx, sy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * ChatGPT-style layered cloud orb with robot-face overlay.
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
 *   emotion?: string,
 *   compact?: boolean,
 *   magicBall?: boolean,
 *   wobble?: number,
 *   squash?: number,
 *   spin?: number,
 *   reducedMotion?: boolean,
 *   face?: boolean,
 *   live?: boolean,
 * }} opts
 */
function drawCloudEmotionOrb(ctx, width, height, opts) {
  if (Boolean(opts.magicBall)) {
    drawMagicBallEmotionOrb(ctx, width, height, opts);
    return;
  }
  const volume = clamp(Number(opts.volume) || 0, 0, 1);
  const state = String(opts.state || "idle");
  const emotion = normalizeOrbEmotion(opts.emotion);
  const reduced = Boolean(opts.reducedMotion);
  const time = reduced ? 0 : Number(opts.time) || 0;
  const compact = Boolean(opts.compact);
  const live =
    Boolean(opts.live) || state === "speaking" || state === "listening";
  const showFace = opts.face !== false;
  const palette = resolveCloudOrbPalette(opts.hue, opts.sat, opts.light, {
    live,
    emotion,
  });
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height);
  const breath = reduced
    ? 1
    : 1 + volume * 0.22 + Math.sin(time * 1.18) * 0.042;
  const baseR = size * (compact ? 0.38 : 0.36) * breath;
  const squash = reduced ? 1 : clamp(Number(opts.squash) || 1, 0.88, 1.12);
  const spin = reduced ? 0 : Number(opts.spin) || 0;
  const wobble = clamp(Number(opts.wobble) || 0.05, 0.02, 0.35);
  const drift = reduced
    ? { x: 0, y: 0 }
    : {
        x: Math.sin(time * 0.88) * baseR * 0.045,
        y: Math.cos(time * 0.74) * baseR * 0.038,
      };
  const blobOpts = {
    time,
    volume,
    wobble,
    squash,
    emotion,
    reducedMotion: reduced,
  };

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (compact) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.clip();
  }

  const outerGlow = ctx.createRadialGradient(cx, cy, baseR * 0.08, cx, cy, baseR * 2.6);
  outerGlow.addColorStop(
    0,
    `hsla(${palette.hue}, ${palette.mistSat}%, ${palette.mistLight}%, ${0.18 + volume * 0.22})`,
  );
  outerGlow.addColorStop(
    0.38,
    `hsla(${palette.hue}, ${palette.sat}%, ${palette.light}%, ${0.1 + volume * 0.14})`,
  );
  outerGlow.addColorStop(
    0.72,
    `hsla(${palette.hue}, ${palette.shadowSat}%, ${palette.shadowLight}%, ${0.04 + volume * 0.06})`,
  );
  outerGlow.addColorStop(1, "hsla(0, 0%, 100%, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR * 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx + drift.x * 0.3, cy + drift.y * 0.3);
  ctx.scale(1 / Math.sqrt(squash), squash);
  ctx.translate(-cx, -cy);

  const bodyGrad = ctx.createRadialGradient(
    cx - baseR * 0.12,
    cy - baseR * 0.2,
    baseR * 0.05,
    cx,
    cy,
    baseR * 1.15,
  );
  bodyGrad.addColorStop(0, `hsla(${palette.hue}, ${palette.coreSat}%, ${palette.coreLight}%, 0.55)`);
  bodyGrad.addColorStop(
    0.42,
    `hsla(${palette.hue}, ${palette.sat}%, ${palette.light}%, ${0.38 + volume * 0.22})`,
  );
  bodyGrad.addColorStop(
    0.78,
    `hsla(${palette.hue}, ${palette.shadowSat}%, ${palette.shadowLight}%, ${0.28 + volume * 0.12})`,
  );
  bodyGrad.addColorStop(1, `hsla(${palette.hue}, ${palette.mistSat}%, ${palette.mistLight}%, 0.05)`);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  traceOrganicBlobPath(ctx, cx, cy, baseR * 0.94, blobOpts, compact ? 56 : 80);
  ctx.fill();

  ctx.restore();

  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "screen";

  const specs = buildCloudPuffSpecs(time, volume, state, compact, emotion);
  for (const puff of specs) {
    const px = cx + puff.ox * baseR * 1.08 + drift.x * 0.4;
    const py = cy + puff.oy * baseR * 1.08 + drift.y * 0.4;
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

  drawInnerSwirlLayers(ctx, cx, cy, baseR, palette, {
    time,
    volume,
    spin,
    reducedMotion: reduced,
  });

  drawSoftCloudPuff(
    ctx,
    cx + drift.x * 0.55,
    cy + drift.y * 0.55,
    baseR * (0.54 + volume * 0.1),
    palette.hue + 10,
    palette.accentSat,
    palette.accentLight,
    0.14 + volume * 0.1,
  );

  ctx.globalCompositeOperation = prevComposite || "source-over";

  drawCloudWhiteCore(
    ctx,
    cx + drift.x,
    cy + drift.y,
    baseR * (0.74 + volume * 0.14),
    0.48 + volume * 0.32,
    drift,
  );

  if (showFace) {
    drawOrbRobotFace(ctx, cx, cy, baseR, {
      emotion,
      volume,
      state,
      time,
      compact,
      reducedMotion: reduced,
    });
  }

  if ((state === "thinking" || state === "loading") && !reduced) {
    const orbit = baseR * (state === "loading" ? 0.36 : 0.44);
    const ox = cx + Math.cos(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    const oy = cy + Math.sin(time * (state === "loading" ? 1.05 : 1.65) + spin) * orbit;
    drawSoftCloudPuff(
      ctx,
      ox,
      oy,
      baseR * 0.32,
      palette.hue + 16,
      palette.accentSat,
      palette.accentLight,
      0.32,
    );
  }

  if (
    !reduced &&
    volume > 0.05 &&
    (state === "speaking" || state === "listening")
  ) {
    const incoming = state === "listening";
    ctx.save();
    ctx.beginPath();
    traceOrganicBlobPath(ctx, cx, cy, baseR * 0.98, blobOpts, compact ? 48 : 64);
    ctx.clip();
    for (let r = 0; r < 3; r += 1) {
      const phase = ((time * 1.42 + r * 0.38) % 1);
      const t = incoming ? 1 - phase : phase;
      const rippleR = baseR * (1.04 + t * 0.48);
      ctx.strokeStyle = `rgba(255,255,255,${(1 - t) * volume * (compact ? 0.22 : 0.32)})`;
      ctx.lineWidth = compact ? 0.85 : 1.15;
      ctx.beginPath();
      ctx.arc(cx, cy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Parameters<typeof drawCloudEmotionOrb>[3]} opts
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
  for (let i = 0; i < count; i += 1) {
    const wave =
      0.18 +
      volume * 0.62 +
      Math.sin(time * 5.5 + i * 0.72) * 0.14 * volume +
      Math.sin(time * 3.1 + i * 1.15) * 0.08;
    out[i] = clamp(wave, 0.06, 0.82);
  }
  return out;
}
