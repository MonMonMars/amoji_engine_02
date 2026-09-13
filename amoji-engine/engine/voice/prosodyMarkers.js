/**
 * Inline prosody markers in spoken text:
 *   [pause] [pause:0.5] [fast] [slow] [soft] [bright] [rate:1.2]
 * Stripped from TTS text; returned as overrides for resolveProsody().
 */
export const PROSODY_MARKERS_SCHEMA = 'amoji.prosodyMarkers.v1';

const MARKER_RE = /\[\s*(pause|fast|slow|soft|bright|rate)(?:\s*[:=]\s*([0-9]*\.?[0-9]+))?\s*\]/gi;

/**
 * @param {string} text
 */
export function parseProsodyMarkers(text) {
  const raw = String(text || '');
  /** @type {Array<{ kind: string, value?: number }>} */
  const markers = [];
  let pauseBonusMs = 0;
  let speedMul = 1;
  let energyMul = 1;
  let pitchAdd = 0;

  let m;
  const re = new RegExp(MARKER_RE.source, 'gi');
  while ((m = re.exec(raw)) !== null) {
    const kind = m[1].toLowerCase();
    const num = m[2] != null && m[2] !== '' ? Number(m[2]) : undefined;
    markers.push({ kind, value: num });
    if (kind === 'pause') pauseBonusMs += Math.round((num ?? 0.45) * 1000);
    if (kind === 'fast') speedMul *= num ?? 1.15;
    if (kind === 'slow') speedMul *= num ?? 0.85;
    if (kind === 'rate') speedMul *= num ?? 1;
    if (kind === 'soft') energyMul *= 0.75;
    if (kind === 'bright') {
      energyMul *= 1.1;
      pitchAdd += 0.05;
    }
  }

  const clean = raw
    .replace(MARKER_RE, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。！？,.!?])/g, '$1')
    .replace(/([，。！？,.!?])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    schema: PROSODY_MARKERS_SCHEMA,
    text: clean,
    raw,
    markers,
    overrides: {
      pauseBonusMs,
      speedMul: Number(speedMul.toFixed(3)),
      energyMul: Number(energyMul.toFixed(3)),
      pitchAdd: Number(pitchAdd.toFixed(3)),
    },
  };
}

/**
 * Apply marker overrides onto a resolveProsody() result.
 * @param {object} prosody
 * @param {ReturnType<typeof parseProsodyMarkers>} parsed
 */
export function applyProsodyMarkerOverrides(prosody, parsed) {
  const o = parsed?.overrides || {};
  const speed = Math.max(0.5, Math.min(2, (prosody.speed || 1) * (o.speedMul || 1)));
  const pauseMs = Math.round((prosody.pauseMs || 180) + (o.pauseBonusMs || 0));
  const energy = Math.max(0.15, Math.min(1.2, (prosody.energy || 0.55) * (o.energyMul || 1)));
  const pitch = (prosody.pitch || 0) + (o.pitchAdd || 0);
  let speedKey = 'normal';
  if (speed < 0.95) speedKey = 'slow';
  else if (speed > 1.05) speedKey = 'fast';
  return {
    ...prosody,
    speed: Number(speed.toFixed(3)),
    pauseMs,
    energy: Number(energy.toFixed(3)),
    pitch: Number(pitch.toFixed(3)),
    speedKey,
    markers: parsed?.markers || [],
  };
}

/**
 * Minimal default prosody pack for lab / stub TTS instruct lines.
 * @param {{ emotion?: string, language?: string }} [opts]
 */
export function resolveProsody(opts = {}) {
  const emotion = opts.emotion || 'neutral';
  const language = opts.language || 'yue';
  const happy = /happy|開心|开心/i.test(emotion);
  return {
    schema: PROSODY_MARKERS_SCHEMA,
    language,
    emotion,
    speed: happy ? 1.08 : 1,
    pauseMs: happy ? 140 : 180,
    energy: happy ? 0.7 : 0.55,
    pitch: 0,
    speedKey: happy ? 'fast' : 'normal',
    instruct:
      language === 'en'
        ? `Speak in a natural ${emotion} English voice.`
        : `用自然粤语语气说话，情绪 ${emotion}。`,
  };
}

/**
 * Parse markers and merge onto default prosody.
 * @param {string} text
 * @param {{ emotion?: string, language?: string }} [opts]
 */
export function prosodyFromMarkedText(text, opts = {}) {
  const parsed = parseProsodyMarkers(text);
  const base = resolveProsody(opts);
  const merged = applyProsodyMarkerOverrides(base, parsed);
  return { ...merged, text: parsed.text, raw: parsed.raw, markers: parsed.markers };
}
