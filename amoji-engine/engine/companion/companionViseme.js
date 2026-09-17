/**
 * Lip-sync viseme mapping — shared by companionVoice and face test pages.
 */

/**
 * Map a character to a viseme shape + openness for lip sync.
 * @param {string} ch
 * @returns {{ shape: string, open: number }}
 */
export function charToViseme(ch) {
  const c = String(ch || " ").toLowerCase();
  if (/[\s.,!?;:'"()\-—…]/.test(c)) return { shape: "ee", open: 0.08 };
  if (/[aeæəàáâãäå]/.test(c)) return { shape: "aa", open: 0.82 };
  if (/[iɪyìíîï]/.test(c)) return { shape: "ih", open: 0.58 };
  if (/[oɔòóôõö]/.test(c)) return { shape: "oh", open: 0.72 };
  if (/[uʊwùúûü]/.test(c)) return { shape: "ou", open: 0.68 };
  if (/[eɛèéêë]/.test(c)) return { shape: "ee", open: 0.62 };
  if (/[mbp]/.test(c)) return { shape: "ee", open: 0.12 };
  if (/[fv]/.test(c)) return { shape: "ih", open: 0.22 };
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(c)) {
    const mod = c.charCodeAt(0) % 5;
    const shapes = ["aa", "ih", "oh", "ou", "ee"];
    const opens = [0.78, 0.55, 0.7, 0.65, 0.6];
    return { shape: shapes[mod], open: opens[mod] };
  }
  return { shape: "aa", open: 0.45 };
}

/**
 * Match mouth-walk speed to real audio (or CJK vs Latin speech rate).
 * @param {string} text
 * @param {number} [durationMs]
 */
export function estimateLipSyncMsPerChar(text, durationMs) {
  const clean = String(text || "");
  const len = Math.max(1, clean.length);
  const ms = Number(durationMs);
  if (Number.isFinite(ms) && ms > 0) {
    return Math.max(24, Math.min(280, ms / len));
  }
  const cjk = (clean.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  return cjk / len > 0.3 ? 160 : 52;
}

/**
 * Spoken duration weight for one character.
 * @param {string} ch
 */
export function lipSyncCharWeight(ch) {
  const c = String(ch || "");
  if (!c || /[\s.,!?;:'"()\-—…，。！？、；：～~]/.test(c)) return 0.22;
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(c)) return 1;
  return 0.48;
}

/**
 * @param {string} text
 * @returns {{ chars: string[], starts: number[], total: number }}
 */
export function buildLipSyncTimeline(text) {
  const chars = Array.from(String(text || ""));
  const weights = chars.map((ch) => lipSyncCharWeight(ch));
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  let acc = 0;
  const starts = weights.map((w) => {
    const start = acc / total;
    acc += w;
    return start;
  });
  return { chars, starts, total };
}

/**
 * Map 0..1 playback progress to a viseme.
 * @param {string} text
 * @param {number} progress
 * @param {number} [audioLevel]
 */
export function visemeAtAudioProgress(text, progress, audioLevel = 0) {
  const clean = String(text || "");
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const level = Math.max(0, Math.min(1, Number(audioLevel) || 0));
  if (!clean.length || p >= 0.995) {
    return {
      shape: "ee",
      open: Math.min(0.08, level * 0.25),
      index: clean.length,
      char: "",
    };
  }
  const { chars, starts } = buildLipSyncTimeline(clean);
  let idx = 0;
  for (let i = 0; i < starts.length; i += 1) {
    if (starts[i] <= p) idx = i;
    else break;
  }
  const ch = chars[idx] || " ";
  const viseme = charToViseme(ch);
  const open = Math.min(
    1,
    viseme.open * 0.92 + Math.max(viseme.open * 0.12, level * 0.55),
  );
  return { shape: viseme.shape, open, index: idx, char: ch };
}
