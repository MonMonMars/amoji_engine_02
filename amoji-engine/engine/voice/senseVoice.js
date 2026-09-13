/**
 * SenseVoice transcript parsing + lightweight SER → emotion mapping.
 * Tags look like: <|yue|><|HAPPY|><|Speech|><|withitn|>今日好開心呀
 */
export const SENSE_VOICE_SCHEMA = 'amoji.senseVoice.v1';

const LANG_IDS = new Set(['yue', 'zh', 'en', 'ja', 'ko', 'auto']);

const SER_EMO_MAP = Object.freeze({
  HAPPY: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  NEUTRAL: 'neutral',
  FEARFUL: 'fear',
  DISGUSTED: 'disgust',
  SURPRISED: 'surprised',
});

const AUDIO_EVENTS = new Set([
  'SPEECH',
  'BGM',
  'APPLAUSE',
  'LAUGHTER',
  'CRY',
  'COUGH',
  'SNEEZE',
]);

/**
 * @param {string} raw
 */
export function parseSenseVoiceTranscript(raw) {
  const text = String(raw ?? '');
  const tags = [...text.matchAll(/<\|([^|>]+)\|>/g)].map((m) => m[1]);
  const clean = text.replace(/<\|[^|>]+\|>/g, '').trim();

  /** @type {string | null} */
  let language = null;
  /** @type {string | null} */
  let serEmotion = null;
  /** @type {string | null} */
  let audioEvent = null;

  for (const t of tags) {
    const lower = t.toLowerCase();
    const upper = t.toUpperCase();
    if (LANG_IDS.has(lower)) language = lower;
    else if (SER_EMO_MAP[upper]) serEmotion = SER_EMO_MAP[upper];
    else if (AUDIO_EVENTS.has(upper)) audioEvent = lower;
  }

  return {
    schema: SENSE_VOICE_SCHEMA,
    text: clean,
    raw: text,
    language,
    serEmotion,
    audioEvent,
    tags,
  };
}

/**
 * Keyword heuristics when SenseVoice SER is absent.
 * @param {string} text
 */
export function emotionFromTextHeuristics(text) {
  const t = String(text || '');
  if (/唉|唔開心|傷心|sorry|sad|慘/.test(t)) {
    return { emotion: 'sad', intensity: 0.72, confidence: 0.7, source: 'lexicon' };
  }
  if (/諗|思考|點解|why|hmm|唔知/.test(t)) {
    return { emotion: 'thinking', intensity: 0.55, confidence: 0.65, source: 'lexicon' };
  }
  if (/哈哈|開心|好呀|正|掂|thank|thanks|great|鍾意/.test(t)) {
    return { emotion: 'happy', intensity: 0.78, confidence: 0.75, source: 'lexicon' };
  }
  if (/哇|嘩|唔信|真係|嚇死/.test(t) || /!{2,}|！{2,}/.test(t)) {
    return { emotion: 'surprised', intensity: 0.8, confidence: 0.7, source: 'lexicon' };
  }
  return { emotion: 'neutral', intensity: 0.45, confidence: 0.4, source: 'default' };
}

/**
 * Blend SenseVoice SER with lexicon heuristics for face / robot emotion.
 * @param {{
 *   text?: string,
 *   serEmotion?: string | null,
 *   language?: string | null,
 * }} input
 */
export function emotionFromSenseVoice(input = {}) {
  const text = String(input.text || '').trim();
  const lexicon = emotionFromTextHeuristics(text);
  let emotion = lexicon.emotion;
  let intensity = lexicon.intensity;
  let confidence = lexicon.confidence;
  let source = lexicon.source;

  if (input.serEmotion) {
    const ser = String(input.serEmotion);
    if (lexicon.source === 'default' || lexicon.confidence < 0.55) {
      emotion = ser;
      intensity = Math.max(intensity, 0.7);
      confidence = Math.max(confidence, 0.8);
      source = 'sensevoice_ser';
    } else if (ser === lexicon.emotion) {
      confidence = Math.min(0.98, confidence + 0.15);
      intensity = Math.min(1.2, intensity + 0.05);
      source = 'lexicon+ser';
    } else {
      source = `${lexicon.source}|ser:${ser}`;
    }
  }

  return {
    schema: SENSE_VOICE_SCHEMA,
    emotion,
    intensity: Number(intensity.toFixed(3)),
    confidence: Number(confidence.toFixed(3)),
    source,
    text,
    language: input.language || null,
    serEmotion: input.serEmotion || null,
  };
}
