/**
 * Lightweight dialect / language detection from SenseVoice-style tags + heuristics.
 */
export const DIALECT_DETECT_SCHEMA = 'amoji.dialectDetect.v1';

/**
 * @param {{ language?: string, text?: string, asrRaw?: string }} input
 * @param {{ preferred?: string, sticky?: string, force?: string | null }} [opts]
 */
export function detectLanguage(input = {}, opts = {}) {
  const force = opts.force ? String(opts.force).toLowerCase() : '';
  if (force) {
    return {
      schema: DIALECT_DETECT_SCHEMA,
      id: force,
      source: 'forced',
      switched: false,
      confidence: 1,
    };
  }

  const raw = String(input.asrRaw || input.text || '');
  const preferred = opts.preferred || 'yue';
  const sticky = opts.sticky || preferred;

  const NON_LANG = new Set([
    'speech',
    'happy',
    'neutral',
    'sad',
    'angry',
    'fearful',
    'disgusted',
    'surprised',
    'laughter',
    'applause',
    'cry',
    'sneeze',
    'cough',
    'breath',
    'bgm',
    'event',
    'withitn',
    'woitn',
  ]);
  const tagRe = /<\|([a-z]{2,8}(?:_[a-z]+)?)\|>/gi;
  let tagMatch;
  while ((tagMatch = tagRe.exec(raw)) !== null) {
    const id = tagMatch[1].toLowerCase();
    if (NON_LANG.has(id)) continue;
    return {
      schema: DIALECT_DETECT_SCHEMA,
      id,
      source: 'sensevoice_tag',
      switched: id !== sticky,
      confidence: 0.95,
    };
  }

  if (input.language) {
    const id = String(input.language).toLowerCase();
    return {
      schema: DIALECT_DETECT_SCHEMA,
      id,
      source: 'explicit',
      switched: id !== sticky,
      confidence: 0.9,
    };
  }

  const text = raw.replace(/<\|[^|]+\|>/g, '').trim();
  if (/[a-z]{3,}/i.test(text) && !/[\u4e00-\u9fff]/.test(text)) {
    return {
      schema: DIALECT_DETECT_SCHEMA,
      id: 'en',
      source: 'latin_heuristic',
      switched: sticky !== 'en',
      confidence: 0.7,
    };
  }
  if (/[嘅唔哋係咗喺嚟]/.test(text)) {
    return {
      schema: DIALECT_DETECT_SCHEMA,
      id: 'yue',
      source: 'cantonese_chars',
      switched: sticky !== 'yue',
      confidence: 0.75,
    };
  }

  return {
    schema: DIALECT_DETECT_SCHEMA,
    id: sticky,
    source: 'sticky',
    switched: false,
    confidence: 0.4,
  };
}

/**
 * Strip SenseVoice / control tags for display / stub replies.
 * @param {string} text
 */
export function stripAsrTags(text) {
  return String(text || '')
    .replace(/<\|[^|]+\|>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
