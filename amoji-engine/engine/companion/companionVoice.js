/**
 * Browser female TTS + mic capture for the companion demo (Grok-style).
 * Uses Web Speech API: speechSynthesis (female voice + emotion tone)
 * and SpeechRecognition for continuous microphone conversation.
 *
 * Lip sync: maps spoken words/characters to mouth shapes via
 * SpeechSynthesisUtterance boundary events (with timed fallback).
 */

export const COMPANION_VOICE_SCHEMA = "amoji.companionVoice.v1";

const EMOTION_PROSODY = {
  neutral: { rate: 1.02, pitch: 1.15, volume: 1 },
  happy: { rate: 1.12, pitch: 1.35, volume: 1 },
  thinking: { rate: 0.92, pitch: 1.05, volume: 0.95 },
  sad: { rate: 0.86, pitch: 0.92, volume: 0.9 },
  surprised: { rate: 1.18, pitch: 1.45, volume: 1 },
  angry: { rate: 1.08, pitch: 0.95, volume: 1 },
};

/** Errors that should not kill continuous listening. */
const SOFT_MIC_ERRORS = new Set([
  "no-speech",
  "aborted",
  "network",
]);

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
 * Prefer a female / higher-pitch voice, Cantonese/Chinese when available.
 * @param {SpeechSynthesisVoice[]} voices
 */
export function pickFemaleVoice(voices) {
  const list = (Array.isArray(voices) ? voices : []).filter(
    (v) => v && typeof v.name === "string",
  );
  const score = (v) => {
    const name = `${v.name} ${v.lang || ""}`.toLowerCase();
    let s = 0;
    if (/zh-hk|yue|cantonese|hong kong/.test(name)) s += 50;
    if (/zh-tw|zh-cn|cmn|chinese|mandarin/.test(name)) s += 35;
    if (/en-hk|en-gb|en-us|en-au/.test(name)) s += 15;
    if (/female|woman|girl|samantha|karen|moira|tingting|ting-ting|meijia|sinji|xiaoxiao|xiaoyi|hana|google uk english female|microsoft xiaoxiao|microsoft hsiao/.test(name)) {
      s += 40;
    }
    if (/male|man|david|daniel|ravi|keda/.test(name) && !/female/.test(name)) s -= 30;
    if (v.localService) s += 5;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * @param {{
 *   onMouth?: (open: number, shape?: string) => void,
 *   onTalking?: (on: boolean) => void,
 *   onMicText?: (text: string, isFinal: boolean) => void,
 *   onMicState?: (on: boolean) => void,
 *   onError?: (msg: string) => void,
 *   lang?: string,
 * }} [opts]
 */
export function createCompanionVoice(opts = {}) {
  const synth =
    typeof globalThis.speechSynthesis !== "undefined"
      ? globalThis.speechSynthesis
      : null;
  const Rec =
    globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;

  let voice = null;
  let speakerOn = true;
  /** User wants continuous listen mode on. */
  let micDesired = false;
  /** Nested pause while LLM/TTS runs so the mic does not hear itself. */
  let pauseDepth = 0;
  /** @type {SpeechRecognition | null} */
  let recognition = null;
  let recognitionActive = false;
  let restartTimer = null;
  let speaking = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let mouthTimer = null;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let mouthTimeouts = [];

  const ensureVoices = () =>
    new Promise((resolve) => {
      if (!synth) return resolve(null);
      const pick = () => {
        voice = pickFemaleVoice(synth.getVoices());
        resolve(voice);
      };
      const existing = synth.getVoices();
      if (existing?.length) return pick();
      synth.addEventListener("voiceschanged", pick, { once: true });
      setTimeout(pick, 400);
    });

  void ensureVoices();

  const emitViseme = (ch) => {
    const { shape, open } = charToViseme(ch);
    opts.onMouth?.(open, shape);
  };

  const stopMouth = () => {
    if (mouthTimer) {
      clearInterval(mouthTimer);
      mouthTimer = null;
    }
    for (const t of mouthTimeouts) clearTimeout(t);
    mouthTimeouts = [];
    opts.onMouth?.(0, null);
    opts.onTalking?.(false);
  };

  /**
   * Drive mouth shapes from text — boundary events when available, else timed walk.
   * @param {string} text
   * @param {SpeechSynthesisUtterance} [utter]
   */
  const startLipSync = (text, utter) => {
    stopMouth();
    opts.onTalking?.(true);
    const clean = String(text || "");
    if (!clean) return;

    let boundaryWorks = false;
    if (utter && "onboundary" in utter) {
      utter.onboundary = (ev) => {
        boundaryWorks = true;
        const idx = ev.charIndex ?? 0;
        const slice = clean.slice(idx, idx + (ev.charLength || 1));
        const ch = slice[0] || clean[idx] || " ";
        emitViseme(ch);
      };
    }

    // Timed fallback — also backs muted speaker / browsers without boundary
    const msPerChar = 48;
    let i = 0;
    mouthTimer = setInterval(() => {
      if (boundaryWorks) return;
      if (i >= clean.length) {
        opts.onMouth?.(0.06, "ee");
        return;
      }
      emitViseme(clean[i]);
      i += 1;
    }, msPerChar);

    const totalMs = Math.min(12000, clean.length * msPerChar + 400);
    mouthTimeouts.push(
      setTimeout(() => {
        if (!boundaryWorks) opts.onMouth?.(0, null);
      }, totalMs),
    );
  };

  const clearRestart = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const haltRecognition = () => {
    clearRestart();
    const rec = recognition;
    recognition = null;
    recognitionActive = false;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
    } catch {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
    }
  };

  const shouldListen = () => micDesired && pauseDepth === 0 && Boolean(Rec);

  const beginRecognition = () => {
    if (!shouldListen()) return;
    if (recognitionActive) return;

    clearRestart();
    const rec = new Rec();
    recognition = rec;
    rec.lang = opts.lang || "zh-HK";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const chunk = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (interim) opts.onMicText?.(interim, false);
      const trimmed = finalText.trim();
      if (trimmed) {
        opts.onMicText?.(trimmed, true);
      }
    };

    rec.onerror = (ev) => {
      const code = ev?.error || "mic-error";
      if (SOFT_MIC_ERRORS.has(code)) return;
      opts.onError?.(code);
      if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
        micDesired = false;
        haltRecognition();
        opts.onMicState?.(false);
      }
    };

    rec.onend = () => {
      recognitionActive = false;
      if (recognition === rec) recognition = null;
      if (shouldListen()) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          beginRecognition();
        }, 140);
      }
    };

    try {
      rec.start();
      recognitionActive = true;
    } catch (err) {
      recognitionActive = false;
      recognition = null;
      if (shouldListen()) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          beginRecognition();
        }, 280);
      } else {
        opts.onError?.(err?.message || String(err));
      }
    }
  };

  const pauseCapture = () => {
    pauseDepth += 1;
    if (pauseDepth === 1) haltRecognition();
  };

  const resumeCapture = () => {
    pauseDepth = Math.max(0, pauseDepth - 1);
    if (pauseDepth === 0 && micDesired) beginRecognition();
  };

  /**
   * Speak reply with female voice + emotion tone. Resolves when finished.
   * @param {string} text
   * @param {string} [emotion]
   */
  const speak = async (text, emotion = "neutral") => {
    const clean = String(text || "")
      .replace(/[*_`#>/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return { ok: false, reason: "empty" };

    pauseCapture();
    try {
      if (!speakerOn) {
        startLipSync(clean);
        await sleep(Math.min(2200, 400 + clean.length * 28));
        stopMouth();
        return { ok: true, muted: true };
      }
      if (!synth) {
        startLipSync(clean);
        await sleep(Math.min(2800, 450 + clean.length * 36));
        stopMouth();
        return { ok: false, reason: "no-speech-synthesis" };
      }

      await ensureVoices();
      synth.cancel();
      speaking = true;

      const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
      const utter = new SpeechSynthesisUtterance(clean);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || opts.lang || "zh-HK";
      utter.rate = prosody.rate;
      utter.pitch = prosody.pitch;
      utter.volume = prosody.volume;

      startLipSync(clean, utter);

      const maxMs = Math.min(15000, 700 + clean.length * 55);
      let settled = false;
      const finishSpeak = (result) => {
        if (settled) return result;
        settled = true;
        speaking = false;
        stopMouth();
        return result;
      };
      const spoken = await Promise.race([
        new Promise((resolve) => {
          utter.onend = () => {
            resolve(
              finishSpeak({
                ok: true,
                voice: voice?.name || null,
                emotion,
              }),
            );
          };
          utter.onerror = (ev) => {
            const reason = ev?.error || "tts-error";
            if (reason !== "interrupted" && reason !== "canceled") {
              opts.onError?.(reason);
            }
            resolve(finishSpeak({ ok: false, reason }));
          };
          try {
            synth.speak(utter);
          } catch (err) {
            resolve(
              finishSpeak({ ok: false, reason: err?.message || "tts-speak-failed" }),
            );
          }
        }),
        sleep(maxMs).then(() => {
          if (settled) return { ok: true, voice: voice?.name || null, emotion };
          synth?.cancel();
          return finishSpeak({ ok: false, reason: "tts-timeout" });
        }),
      ]);
      return spoken;
    } finally {
      resumeCapture();
    }
  };

  const stopSpeak = () => {
    synth?.cancel();
    speaking = false;
    stopMouth();
  };

  const setSpeakerOn = (on) => {
    speakerOn = Boolean(on);
    if (!speakerOn) stopSpeak();
    return speakerOn;
  };

  const stopMic = () => {
    micDesired = false;
    clearRestart();
    haltRecognition();
    opts.onMicState?.(false);
    return false;
  };

  const startMic = () => {
    if (!Rec) {
      opts.onError?.("Speech recognition not supported in this browser");
      return false;
    }
    if (micDesired) {
      if (!recognitionActive && pauseDepth === 0) beginRecognition();
      return true;
    }
    micDesired = true;
    opts.onMicState?.(true);
    if (pauseDepth === 0) beginRecognition();
    return true;
  };

  const toggleMic = () => (micDesired ? stopMic() : startMic());

  return {
    schema: COMPANION_VOICE_SCHEMA,
    get speakerOn() {
      return speakerOn;
    },
    get micOn() {
      return micDesired;
    },
    get speaking() {
      return speaking;
    },
    get listening() {
      return recognitionActive && pauseDepth === 0;
    },
    get voiceName() {
      return voice?.name || null;
    },
    get supportsMic() {
      return Boolean(Rec);
    },
    get supportsSpeak() {
      return Boolean(synth);
    },
    ensureVoices,
    speak,
    stopSpeak,
    setSpeakerOn,
    pauseCapture,
    resumeCapture,
    startMic,
    stopMic,
    toggleMic,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
