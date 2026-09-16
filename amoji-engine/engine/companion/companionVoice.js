import { createMicCapture } from "./companionMicCapture.js";
import {
  formatMicError,
  MIC_ERROR_MESSAGES,
  requestMicPermission,
} from "./companionMicUtils.js";
import {
  pickNextThinkingPhrase,
  pickThinkingPhrase,
} from "./companionContentMotion.js";
import {
  dialogueTtsCacheKey,
  getCachedDialogueTts,
} from "./companionDialoguePreload.js";
import {
  learnPhaseForProgress,
  pickLearnPhrase,
  pickNextLearnPhrase,
} from "./companionLearnDialogue.js";
import { isIosLike, shouldPauseMicDuringTts } from "./companionPlatform.js";
import {
  buildExpressiveTtsPlan,
  clausePauseMs,
} from "./companionExpressiveTts.js";
import {
  normalizeTtsPerformance,
  resolveCompanionTtsProsody,
} from "./companionTtsProsody.js";

export { formatMicError, MIC_ERROR_MESSAGES, requestMicPermission };

/**
 * Browser female TTS + mic capture for the companion demo (Grok-style).
 * Uses Web Speech API: speechSynthesis (female voice + emotion tone)
 * and SpeechRecognition (or cloud STT fallback) for microphone conversation.
 *
 * Lip sync: maps spoken words/characters to mouth shapes via
 * SpeechSynthesisUtterance boundary events (with timed fallback).
 */

export const COMPANION_VOICE_SCHEMA = "amoji.companionVoice.v1";

/** Tiny silent WAV — unlocks iOS/Safari audio in the same user-gesture turn. */
const SILENT_AUDIO_DATA_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==";

/**
 * Configure an HTMLAudioElement for mobile Safari + desktop autoplay policies.
 * @param {HTMLAudioElement} audio
 */
export function configureCompanionAudioElement(audio) {
  if (!audio) return audio;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");
  audio.playsInline = true;
  return audio;
}

/**
 * Synchronous audio unlock — call directly inside click/touch handlers before any await.
 * Safe to call multiple times.
 * @returns {boolean}
 */
export function unlockAudioSync() {
  if (typeof globalThis.window === "undefined") return false;
  if (globalThis.window.__amojiAudioUnlocked) return true;
  try {
    // iOS routes TTS to the earpiece when Web Audio + mic run together — unlock via <audio> only.
    if (!isIosLike()) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (AC) {
        const ctx =
          globalThis.window.__amojiAudioCtx ||
          new AC({ latencyHint: "interactive" });
        globalThis.window.__amojiAudioCtx = ctx;
        if (ctx.state === "suspended") void ctx.resume();
      }
    }
    const audio =
      globalThis.window.__amojiPrimeAudio ||
      configureCompanionAudioElement(new Audio());
    globalThis.window.__amojiPrimeAudio = audio;
    audio.volume = 0.001;
    if (!audio.src || audio.src === "") audio.src = SILENT_AUDIO_DATA_URI;
    void audio.play().catch(() => {});
    globalThis.window.__amojiAudioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Legacy table — use resolveCompanionTtsProsody() */
const EMOTION_PROSODY = {
  neutral: { rate: 1.04, pitch: 1.18, volume: 1 },
  happy: { rate: 1.16, pitch: 1.38, volume: 1 },
  thinking: { rate: 0.9, pitch: 1.04, volume: 0.92 },
  sad: { rate: 0.84, pitch: 0.9, volume: 0.88 },
  surprised: { rate: 1.22, pitch: 1.48, volume: 1 },
  angry: { rate: 1.1, pitch: 0.94, volume: 1 },
};

/**
 * @param {string} text
 * @param {ReturnType<typeof normalizeTtsPerformance>} performance
 * @param {string} [lang]
 */
let activeCharacterId = "amoji";

const resolveSpeakProsody = (text, performance, lang) =>
  resolveCompanionTtsProsody({
    ...performance,
    text,
    lang: lang || performance.lang,
    characterId: activeCharacterId,
  });

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
const MALE_VOICE_RE =
  /\b(male|man|boy|david|daniel|ravi|keda|alex|fred|bruce|tom|jorge|lee|james|mark|aaron|guy|richard|nathan|oliver|matthew|ryan|paul)\b/i;

export function pickFemaleVoice(voices) {
  const list = (Array.isArray(voices) ? voices : []).filter((v) => {
    if (!v || typeof v.name !== "string") return false;
    if (v.gender === "male") return false;
    const name = `${v.name} ${v.lang || ""}`;
    if (MALE_VOICE_RE.test(name) && !/female|woman|girl/i.test(name)) return false;
    return true;
  });
  const score = (v) => {
    const name = `${v.name} ${v.lang || ""}`.toLowerCase();
    let s = 0;
    if (v.gender === "female") s += 80;
    if (/zh-hk|yue|cantonese|hong kong/.test(name)) s += 55;
    if (/zh-tw|zh-cn|cmn|chinese|mandarin/.test(name)) s += 40;
    if (/female|woman|girl/.test(name)) s += 45;
    if (/samantha|karen|moira|tingting|ting-ting|meijia|sinji|xiaoxiao|xiaoyi|hsiao|sin-ji|yuna|mei-jia/.test(name)) {
      s += 50;
    }
    if (/en-hk|en-gb|en-au/.test(name)) s += 10;
    if (v.localService) s += 5;
    return s;
  };
  const picked = [...list].sort((a, b) => score(b) - score(a))[0] || null;
  return picked;
}

/** Human label for the voice pill. */
export function femaleVoiceLabel(voice) {
  if (voice?.cloud && /wanlung/i.test(String(voice.name || ""))) {
    return "男聲·粵·雲龍";
  }
  if (voice?.cloud && /hiugaai/i.test(String(voice.name || ""))) {
    return "女聲·粵·曉佳";
  }
  if (voice?.cloud && /hiumaan/i.test(String(voice.name || ""))) {
    return "女聲·粵·曉曼";
  }
  if (voice?.cloud && /yan/i.test(String(voice.name || ""))) {
    return "Female·EN·Yan";
  }
  if (voice?.cloud && /sam/i.test(String(voice.name || ""))) {
    return "Male·EN·Sam";
  }
  if (voice?.cloud && /jenny/i.test(String(voice.name || ""))) {
    return "Female·EN·Jenny";
  }
  if (voice?.cloud && /aria|en-us/i.test(String(voice.name || ""))) {
    return "Female·EN·Aria";
  }
  if (voice?.cloud && /idol/i.test(String(voice.name || ""))) {
    return "女聲·粵·曉佳·元氣";
  }
  if (voice?.cloud && /cool/i.test(String(voice.name || ""))) {
    return /aria/i.test(String(voice.name || ""))
      ? "Female·EN·Aria·cool"
      : "女聲·粵·曉曼·酷";
  }
  if (voice?.cloud && /zh-hk|yue|cantonese/i.test(String(voice.lang || ""))) {
    return "女聲·粵";
  }
  if (!voice?.name) return "女聲·粵";
  const n = voice.name.toLowerCase();
  if (/xiaoxiao|hsiao|sin-?ji|ting-?ting|meijia|yuna|hiumaan|hiugaai/.test(n)) {
    return "女聲·粵";
  }
  if (/zh-hk|yue|cantonese/.test(`${n} ${voice.lang || ""}`)) return "女聲·粵";
  if (/female|woman|girl|samantha|karen|moira/.test(n)) return "女聲";
  return "女聲·粵";
}

/** @type {Record<string, { rate: string, pitch: string }>} */
export const CLOUD_CANTONESE_VOICE = Object.freeze({
  name: "zh-HK-HiuMaanNeural",
  lang: "zh-HK",
  cloud: true,
});

export const CLOUD_ENGLISH_VOICE = Object.freeze({
  name: "en-US-AriaNeural",
  lang: "en-US",
  cloud: true,
});

/**
 * @param {{
 *   onMouth?: (open: number, shape?: string) => void,
 *   onTalking?: (on: boolean) => void,
 *   onMicText?: (text: string, isFinal: boolean) => void,
 *   onSpeechDetected?: (info: { source: string, text?: string, rms?: number }) => void,
 *   onMicLevel?: (info: { level: number, rms: number }) => void,
 *   onMicState?: (on: boolean) => void,
 *   onError?: (msg: string) => void,
 *   onSpeakChunk?: (chunk: string, charIndex: number) => void,
 *   onAssistantOutputChange?: (active: boolean) => void,
 *   lang?: string,
 *   cloudTtsUrl?: string | null,
 *   cloudSttUrl?: string | null,
 *   preferCloudTts?: boolean,
 *   cloudVoice?: { name: string, lang: string, cloud?: boolean },
 * }} [opts]
 */
export function createCompanionVoice(opts = {}) {
  const synth =
    typeof globalThis.speechSynthesis !== "undefined"
      ? globalThis.speechSynthesis
      : null;

  let voice = null;
  let usingCloudTts = Boolean(opts.preferCloudTts && opts.cloudTtsUrl);
  let speakerOn = true;
  let speaking = false;
  let keepMicDuringSpeak = false;

  const isAssistantOutputActive = () =>
    speaking ||
    thinkingLoopActive ||
    learnLoopActive ||
    thinkingActive ||
    learnActive ||
    Boolean(streamSession);

  const syncAssistantOutput = () => {
    opts.onAssistantOutputChange?.(isAssistantOutputActive());
  };

  const micCapture = createMicCapture({
    lang: opts.lang || "zh-HK",
    cloudSttUrl: opts.cloudSttUrl || null,
    bargeWhilePaused: true,
    shouldDetectBarge: () => isAssistantOutputActive() || keepMicDuringSpeak,
    onText: (text, isFinal) => opts.onMicText?.(text, isFinal),
    onSpeechDetected: (info) => opts.onSpeechDetected?.(info),
    onMicLevel: (info) => opts.onMicLevel?.(info),
    onState: (on) => opts.onMicState?.(on),
    onError: (code) => opts.onError?.(code),
  });
  /** @type {HTMLAudioElement | null} */
  let currentCloudAudio = null;
  /** @type {HTMLAudioElement | null} */
  let thinkingCloudAudio = null;
  let thinkingActive = false;
  let thinkingLoopActive = false;
  let thinkingPhraseIndex = -1;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let thinkingLoopTimer = null;
  let learnLoopActive = false;
  let learnLoopIsEnglish = false;
  let learnActive = false;
  let learnPhraseIndex = -1;
  /** @type {import('./companionLearnDialogue.js').LearnPhase} */
  let learnPhase = "learning";
  let learnProgress = 0;
  let learnAnnouncedPct = -1;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let learnLoopTimer = null;

  const getSharedAudio = () => {
    if (typeof globalThis.window === "undefined") {
      return configureCompanionAudioElement(new Audio());
    }
    if (!globalThis.window.__amojiTtsAudio) {
      globalThis.window.__amojiTtsAudio = configureCompanionAudioElement(
        new Audio(),
      );
    }
    return globalThis.window.__amojiTtsAudio;
  };

  const ttsPlaybackVolume = () => {
    if (shouldPauseMicDuringTts()) return 1;
    return keepMicDuringSpeak ? 0.38 : 1;
  };

  const mustPauseMicForTts = () =>
    !keepMicDuringSpeak || shouldPauseMicDuringTts();
  /** Serialize TTS so greeting + replies do not overlap or cut each other off. */
  let speakChain = Promise.resolve();
  /** @type {{ emotion: string, closed: boolean, capturePaused: boolean } | null} */
  let streamSession = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let mouthTimer = null;
  /** @type {ReturnType<typeof setTimeout>[]} */
  let mouthTimeouts = [];

  const cloudVoicePreset = () => opts.cloudVoice || CLOUD_CANTONESE_VOICE;

  const ensureVoices = () =>
    new Promise((resolve) => {
      if (usingCloudTts && opts.cloudTtsUrl) {
        voice = cloudVoicePreset();
        return resolve(voice);
      }
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

  const stopCloudAudio = () => {
    if (!currentCloudAudio) return;
    try {
      currentCloudAudio.pause();
    } catch {
      /* ignore */
    }
    currentCloudAudio = null;
  };

  const stopLearnAudio = () => {
    learnActive = false;
    learnLoopActive = false;
    if (learnLoopTimer) {
      clearTimeout(learnLoopTimer);
      learnLoopTimer = null;
    }
  };

  const stopThinkingAudio = () => {
    thinkingActive = false;
    thinkingLoopActive = false;
    stopLearnAudio();
    if (thinkingLoopTimer) {
      clearTimeout(thinkingLoopTimer);
      thinkingLoopTimer = null;
    }
    if (!thinkingCloudAudio) return;
    try {
      thinkingCloudAudio.pause();
    } catch {
      /* ignore */
    }
    thinkingCloudAudio = null;
  };

  /**
   * Play MP3 from cloud TTS (Cantonese neural female).
   * @param {string} clean
   * @param {string} emotion
   */
  const playCloudAudioBlob = async (blob, clean, emotion) => {
    if (!blob.size) return { ok: false, reason: "cloud-tts-empty" };
    const mime = blob.type || "";
    if (mime && !mime.includes("audio") && !mime.includes("mpeg")) {
      const preview = await blob.text().catch(() => "");
      return {
        ok: false,
        reason: `cloud-tts-bad-mime:${mime || "unknown"}:${preview.slice(0, 60)}`,
      };
    }

    const objectUrl = URL.createObjectURL(blob);
    startLipSync(clean);
    speaking = true;
    syncAssistantOutput();
    const preset = cloudVoicePreset();

    return await new Promise((resolve) => {
      const audio = configureCompanionAudioElement(getSharedAudio());
      currentCloudAudio = audio;
      audio.volume = ttsPlaybackVolume();
      audio.src = objectUrl;
      const finish = (result) => {
        if (currentCloudAudio === audio) currentCloudAudio = null;
        URL.revokeObjectURL(objectUrl);
        speaking = false;
        stopMouth();
        syncAssistantOutput();
        resolve(result);
      };
      audio.onended = () => {
        finish({
          ok: true,
          voice: preset.name,
          emotion,
          cloud: true,
        });
      };
      audio.onerror = () => {
        finish({ ok: false, reason: "cloud-audio-play-failed" });
      };
      void audio.play().catch((err) => {
        finish({
          ok: false,
          reason: err?.message || "cloud-audio-play-blocked",
        });
      });
    });
  };

  const speakCloud = async (clean, performance) => {
    const url = opts.cloudTtsUrl;
    if (!url) return { ok: false, reason: "no-cloud-tts-url" };

    unlockAudioSync();
    stopCloudAudio();
    synth?.cancel();

    const preset = cloudVoicePreset();
    const perf = normalizeTtsPerformance(performance);
    const parts = chunkTextForCloudTts(clean);
    if (!parts.length) return { ok: false, reason: "empty" };

    /** @type {{ ok: boolean, reason?: string, voice?: string, emotion?: string, cloud?: boolean }} */
    let last = { ok: false, reason: "empty" };
    for (const part of parts) {
      const plan = buildExpressiveTtsPlan(
        part,
        { ...perf, lang: preset.lang, voiceId: preset.name },
        activeCharacterId,
        preset.lang,
        preset.name,
      );
      const clauses = plan.clauses.length ? plan.clauses : [{ text: part, ...perf }];
      for (let i = 0; i < clauses.length; i += 1) {
        const clause = clauses[i];
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: clause.text,
            emotion: clause.emotion || perf.emotion,
            nuance: clause.nuance || perf.nuance,
            talkStyle: clause.talkStyle || perf.talkStyle,
            speechEnergy: clause.speechEnergy ?? perf.speechEnergy,
            voice: preset.name,
            lang: preset.lang,
            characterId: activeCharacterId,
          }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return {
            ok: false,
            reason: `cloud-tts-${res.status}${errText ? `: ${errText.slice(0, 80)}` : ""}`,
          };
        }
        const blob = await res.blob();
        last = await playCloudAudioBlob(
          blob,
          clause.text,
          clause.emotion || perf.emotion,
        );
        if (!last.ok) return last;
        if (i < clauses.length - 1) {
          await sleep(clause.pauseMs ?? clausePauseMs(clause.text));
        }
      }
    }
    return last;
  };

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
        const len = ev.charLength || 1;
        const slice = clean.slice(idx, idx + len);
        const ch = slice[0] || clean[idx] || " ";
        emitViseme(ch);
        if (slice.trim()) opts.onSpeakChunk?.(slice, idx);
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
      const ch = clean[i];
      emitViseme(ch);
      if (i % 2 === 0 && ch.trim()) {
        const chunk = clean.slice(Math.max(0, i - 2), i + 6);
        opts.onSpeakChunk?.(chunk, i);
      }
      i += 1;
    }, msPerChar);

    const totalMs = Math.min(12000, clean.length * msPerChar + 400);
    mouthTimeouts.push(
      setTimeout(() => {
        if (!boundaryWorks) opts.onMouth?.(0, null);
      }, totalMs),
    );
  };

  const pauseCapture = () => {
    micCapture.pause();
  };

  const resumeCapture = () => {
    micCapture.resume();
  };

  const cleanSpeakText = (text) =>
    String(text || "")
      .replace(/\s*\[action:\w+\]\s*/gi, " ")
      .replace(/\s*\[mood:\w+\]\s*/gi, " ")
      .replace(/[*_`#>/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const MAX_CLOUD_TTS_CHARS = 480;

  /**
   * @param {string} text
   * @returns {string[]}
   */
  const chunkTextForCloudTts = (text) => {
    const clean = String(text || "").trim();
    if (!clean || clean.length <= MAX_CLOUD_TTS_CHARS) return clean ? [clean] : [];
    /** @type {string[]} */
    const chunks = [];
    let buf = "";
    for (const ch of clean) {
      buf += ch;
      const trimmed = buf.trim();
      const boundary = /[.!?。！？\n]/.test(ch);
      if (trimmed && boundary && trimmed.length >= 8) {
        chunks.push(trimmed);
        buf = "";
      } else if (trimmed.length >= MAX_CLOUD_TTS_CHARS) {
        chunks.push(trimmed);
        buf = "";
      }
    }
    const tail = buf.trim();
    if (tail) chunks.push(tail);
    return chunks.length ? chunks : [clean.slice(0, MAX_CLOUD_TTS_CHARS)];
  };

  /**
   * Core TTS playback (no mic pause/resume — used by stream queue).
   * @param {string} text
   * @param {string | ReturnType<typeof normalizeTtsPerformance>} [performance]
   */
  const speakOnceCore = async (text, performance = "neutral") => {
    const clean = cleanSpeakText(text);
    if (!clean) return { ok: false, reason: "empty" };

    const perf = normalizeTtsPerformance(performance);
    const prosody = resolveSpeakProsody(
      clean,
      perf,
      voice?.lang || opts.lang || "zh-HK",
    );

    stopThinkingAudio();
    try {
      if (!speakerOn) {
        startLipSync(clean);
        await sleep(Math.min(2200, 400 + clean.length * 28));
        stopMouth();
        return { ok: true, muted: true };
      }
      await ensureVoices();

      const tryCloud =
        Boolean(opts.cloudTtsUrl) &&
        (usingCloudTts || opts.preferCloudTts !== false);
      if (tryCloud) {
        const cloudResult = await speakCloud(clean, {
          ...perf,
          speechEnergy: prosody.speechEnergy ?? perf.speechEnergy,
        });
        if (cloudResult.ok) {
          usingCloudTts = true;
          voice = cloudVoicePreset();
          return cloudResult;
        }
        usingCloudTts = false;
        const cloudReason = cloudResult.reason || "cloud-tts-failed";
        opts.onError?.(cloudReason);
        if (/cloud-audio-play-blocked|notallowed/i.test(cloudReason)) {
          unlockAudioSync();
        }
      }

      if (!synth) {
        startLipSync(clean);
        await sleep(Math.min(2800, 450 + clean.length * 36));
        stopMouth();
        return {
          ok: false,
          reason: tryCloud ? "cloud-and-browser-tts-unavailable" : "no-speech-synthesis",
        };
      }

      synth.cancel();
      speaking = true;
      syncAssistantOutput();

      const browserProsody = prosody.browser;
      const utter = new SpeechSynthesisUtterance(clean);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || opts.lang || "zh-HK";
      utter.rate = browserProsody.rate;
      utter.pitch = browserProsody.pitch;
      utter.volume = shouldPauseMicDuringTts()
        ? browserProsody.volume
        : keepMicDuringSpeak
          ? browserProsody.volume * 0.4
          : browserProsody.volume;

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
                emotion: perf.emotion,
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
          if (settled) {
            return { ok: true, voice: voice?.name || null, emotion: perf.emotion };
          }
          synth?.cancel();
          return finishSpeak({ ok: false, reason: "tts-timeout" });
        }),
      ]);
      return spoken;
    } catch (err) {
      return { ok: false, reason: err?.message || "speak-failed" };
    }
  };

  /**
   * Speak reply with female voice + emotion tone. Resolves when finished.
   * @param {string} text
   * @param {string | ReturnType<typeof normalizeTtsPerformance>} [performance]
   */
  const speakOnce = async (text, performance = "neutral") => {
    const pauseMic = mustPauseMicForTts();
    if (pauseMic) pauseCapture();
    try {
      return await speakOnceCore(text, performance);
    } finally {
      if (pauseMic) resumeCapture();
    }
  };

  const setKeepMicDuringSpeak = (on) => {
    keepMicDuringSpeak = Boolean(on);
    return keepMicDuringSpeak;
  };

  const speak = (text, performance = "neutral") => {
    const next = speakChain.then(() => speakOnce(text, performance));
    speakChain = next.catch(() => {});
    return next;
  };

  const stopTtsPlayback = () => {
    stopCloudAudio();
    synth?.cancel();
    speaking = false;
    stopMouth();
    syncAssistantOutput();
  };

  const stopSpeak = () => {
    if (streamSession) {
      streamSession.closed = true;
      streamSession = null;
    }
    stopThinkingAudio();
    stopTtsPlayback();
    speakChain = Promise.resolve();
  };

  /**
   * Phase A — begin streaming TTS session (sentence chunks while LLM streams).
   * @param {string} [defaultEmotion]
   * @param {{ pauseCapture?: boolean }} [sessionOpts]
   */
  const beginStreamSpeak = (defaultEmotion = "neutral", sessionOpts = {}) => {
    if (streamSession) {
      streamSession.closed = true;
      streamSession = null;
    }
    stopTtsPlayback();
    speakChain = Promise.resolve();
    const pauseMic =
      sessionOpts.pauseCapture !== false || shouldPauseMicDuringTts();
    streamSession = {
      emotion: defaultEmotion,
      closed: false,
      capturePaused: pauseMic,
    };
    if (pauseMic) pauseCapture();
    syncAssistantOutput();
    return streamSession;
  };

  /**
   * Queue one speakable segment during a stream session.
   * @param {string} text
   * @param {string | ReturnType<typeof normalizeTtsPerformance>} [performance]
   */
  const pushStreamSpeak = (text, performance) => {
    if (!streamSession || streamSession.closed) {
      return Promise.resolve({ ok: false, reason: "no-stream-session" });
    }
    const clean = cleanSpeakText(text);
    if (!clean) return Promise.resolve({ ok: false, reason: "empty" });
    const perf = normalizeTtsPerformance(
      performance,
      streamSession.emotion || "neutral",
    );
    const next = speakChain.then(() => {
      if (!streamSession || streamSession.closed) {
        return { ok: false, reason: "stream-closed" };
      }
      return speakOnceCore(clean, { ...perf, text: clean });
    });
    speakChain = next.catch(() => {});
    return next;
  };

  /** Wait for queued stream segments to finish and end the session. */
  const finishStreamSpeak = async () => {
    const session = streamSession;
    if (!session) return { ok: true };
    session.closed = true;
    streamSession = null;
    syncAssistantOutput();
    try {
      await speakChain;
      return { ok: true };
    } finally {
      if (session.capturePaused) resumeCapture();
      syncAssistantOutput();
    }
  };

  /** Barge-in: cancel stream session + flush TTS immediately. */
  const cancelStreamSpeak = () => {
    const session = streamSession;
    stopSpeak();
    if (session?.capturePaused) resumeCapture();
    return true;
  };

  /** Soft thinking phrase while LLM loads — parallel to reply queue; cancel with stopSpeak(). */
  const speakThinking = async ({ isEnglish = false, phrase: forcedPhrase } = {}) => {
    const picked = forcedPhrase
      ? { phrase: forcedPhrase, index: thinkingPhraseIndex }
      : pickNextThinkingPhrase(isEnglish, thinkingPhraseIndex);
    const phrase = picked.phrase || pickThinkingPhrase(isEnglish);
    thinkingPhraseIndex = picked.index;
    if (!phrase || !speakerOn) return { ok: false, reason: "muted-or-empty" };

    if (!thinkingLoopActive) stopThinkingAudio();
    thinkingActive = true;
    unlockAudioSync();
    await ensureVoices();

    const preset = cloudVoicePreset();
    const lang = isEnglish ? "en-US" : preset.lang || "zh-HK";
    const voiceName = preset.name;

    const playCachedBlob = async (blob) => {
      if (!blob?.size || !thinkingActive) return false;
      const objectUrl = URL.createObjectURL(blob);
      const audio = configureCompanionAudioElement(getSharedAudio());
      thinkingCloudAudio = audio;
      audio.volume = 0.58;
      audio.src = objectUrl;
      await new Promise((resolve) => {
        const finish = () => {
          if (thinkingCloudAudio === audio) thinkingCloudAudio = null;
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        audio.onended = finish;
        audio.onerror = finish;
        void audio.play().catch(finish);
      });
      return true;
    };

    const cachedThinking = getCachedDialogueTts(dialogueTtsCacheKey(lang, phrase));
    if (cachedThinking && (await playCachedBlob(cachedThinking))) {
      return { ok: true, cloud: true, phrase, cached: true };
    }

    if (opts.cloudTtsUrl) {
      try {
        const thinkingProsody = resolveSpeakProsody(phrase, {
          emotion: "thinking",
          nuance: "curious",
          talkStyle: "thinking",
          speechEnergy: 0.32,
        }, lang);
        const res = await fetch(opts.cloudTtsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: phrase,
            emotion: "thinking",
            nuance: "curious",
            talkStyle: "thinking",
            speechEnergy: thinkingProsody.speechEnergy ?? 0.32,
            voice: voiceName,
            lang,
          }),
        });
        if (!thinkingActive) return { ok: false, reason: "cancelled" };
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0 && thinkingActive && (await playCachedBlob(blob))) {
            return { ok: true, cloud: true, phrase };
          }
        }
      } catch {
        /* fall through */
      }
    }

    if (!thinkingActive || !synth) {
      return { ok: false, reason: "cancelled-or-no-tts" };
    }

    const prosody = resolveSpeakProsody(phrase, {
      emotion: "thinking",
      nuance: "curious",
      talkStyle: "thinking",
      speechEnergy: 0.32,
    }, lang).browser;
    const utter = new SpeechSynthesisUtterance(phrase);
    if (voice && !voice.cloud) utter.voice = voice;
    utter.lang = lang;
    utter.rate = prosody.rate;
    utter.pitch = prosody.pitch;
    utter.volume = prosody.volume * 0.85;

    await new Promise((resolve) => {
      utter.onend = resolve;
      utter.onerror = resolve;
      try {
        synth.speak(utter);
      } catch {
        resolve();
      }
      setTimeout(resolve, 2200);
    });

    return { ok: true, phrase };
  };

  const startThinkingLoop = ({ isEnglish = false, intervalMs = 5200 } = {}) => {
    stopThinkingLoop();
    thinkingLoopActive = true;
    thinkingActive = true;
    syncAssistantOutput();

    const tick = async () => {
      if (!thinkingLoopActive) return;
      await speakThinking({ isEnglish });
      if (!thinkingLoopActive) return;
      thinkingLoopTimer = setTimeout(() => {
        void tick();
      }, intervalMs);
    };

    void tick();
    return true;
  };

  const stopThinkingLoop = () => {
    thinkingLoopActive = false;
    stopThinkingAudio();
    syncAssistantOutput();
  };

  /** Spoken filler while a motion downloads / installs from the cloud. */
  const speakLearn = async ({
    isEnglish = false,
    phase = learnPhase,
    progress = learnProgress,
    phrase: forcedPhrase,
  } = {}) => {
    const ctx = { pct: Math.round(progress * 100) };
    const picked = forcedPhrase
      ? { phrase: forcedPhrase, index: learnPhraseIndex }
      : pickNextLearnPhrase(phase, isEnglish, learnPhraseIndex, ctx);
    const phrase = picked.phrase || pickLearnPhrase(phase, isEnglish, ctx);
    learnPhraseIndex = picked.index;
    if (!phrase || !speakerOn) return { ok: false, reason: "muted-or-empty" };

    if (!learnLoopActive) stopThinkingAudio();
    learnActive = true;
    unlockAudioSync();
    await ensureVoices();

    const preset = cloudVoicePreset();
    const lang = isEnglish ? "en-US" : preset.lang || "zh-HK";
    const voiceName = preset.name;

    const playLearnBlob = async (blob) => {
      if (!blob?.size || !learnActive) return false;
      const objectUrl = URL.createObjectURL(blob);
      const audio = configureCompanionAudioElement(getSharedAudio());
      thinkingCloudAudio = audio;
      audio.volume = 0.62;
      audio.src = objectUrl;
      await new Promise((resolve) => {
        const finish = () => {
          if (thinkingCloudAudio === audio) thinkingCloudAudio = null;
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        audio.onended = finish;
        audio.onerror = finish;
        void audio.play().catch(finish);
      });
      return true;
    };

    const cachedLearn = getCachedDialogueTts(dialogueTtsCacheKey(lang, phrase));
    if (cachedLearn && (await playLearnBlob(cachedLearn))) {
      return { ok: true, cloud: true, phrase, phase, cached: true };
    }

    if (opts.cloudTtsUrl) {
      try {
        const learnProsody = resolveSpeakProsody(phrase, {
          emotion: phase === "failed" ? "sad" : "happy",
          nuance: phase === "progress" ? "excited" : "curious",
          talkStyle: phase === "progress" ? "celebrate" : "soft",
          speechEnergy: phase === "progress" ? 0.62 : 0.45,
        }, lang);
        const res = await fetch(opts.cloudTtsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: phrase,
            emotion: phase === "failed" ? "sad" : "thinking",
            nuance: learnProsody.nuance,
            talkStyle: learnProsody.talkStyle,
            speechEnergy: learnProsody.speechEnergy,
            voice: voiceName,
            lang,
          }),
        });
        if (!learnActive) return { ok: false, reason: "cancelled" };
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0 && learnActive && (await playLearnBlob(blob))) {
            return { ok: true, cloud: true, phrase, phase };
          }
        }
      } catch {
        /* fall through */
      }
    }

    if (!learnActive || !synth) {
      return { ok: false, reason: "cancelled-or-no-tts" };
    }

    const prosody = resolveSpeakProsody(phrase, {
      emotion: phase === "failed" ? "sad" : "thinking",
      nuance: phase === "progress" ? "excited" : "curious",
      talkStyle: phase === "progress" ? "celebrate" : "soft",
      speechEnergy: phase === "progress" ? 0.62 : 0.45,
    }, lang).browser;
    const utter = new SpeechSynthesisUtterance(phrase);
    if (voice && !voice.cloud) utter.voice = voice;
    utter.lang = lang;
    utter.rate = prosody.rate;
    utter.pitch = prosody.pitch;
    utter.volume = prosody.volume * 0.85;

    await new Promise((resolve) => {
      utter.onend = resolve;
      utter.onerror = resolve;
      try {
        synth.speak(utter);
      } catch {
        resolve();
      }
      setTimeout(resolve, 2400);
    });

    return { ok: true, phrase, phase };
  };

  const startLearnLoop = ({
    isEnglish = false,
    phase = "learning",
    progress = 0,
    intervalMs = 2600,
  } = {}) => {
    stopThinkingLoop();
    stopLearnAudio();
    learnLoopActive = true;
    learnLoopIsEnglish = isEnglish;
    learnActive = true;
    learnPhase = phase;
    learnProgress = progress;
    learnAnnouncedPct = -1;
    syncAssistantOutput();

    const tick = async () => {
      if (!learnLoopActive) return;
      const activePhase = learnPhaseForProgress(learnProgress) || learnPhase;
      await speakLearn({
        isEnglish: learnLoopIsEnglish,
        phase: activePhase,
        progress: learnProgress,
      });
      if (!learnLoopActive) return;
      learnLoopTimer = setTimeout(() => {
        void tick();
      }, intervalMs);
    };

    void tick();
    return true;
  };

  const updateLearnLoop = ({ phase, progress } = {}) => {
    if (phase) learnPhase = phase;
    if (progress != null) learnProgress = progress;
    const pct = Math.round(learnProgress * 100);
    if (
      learnLoopActive &&
      pct >= 8 &&
      pct - learnAnnouncedPct >= 15 &&
      phase !== "failed"
    ) {
      learnAnnouncedPct = pct;
      const activePhase =
        phase === "progress"
          ? "progress"
          : learnPhaseForProgress(learnProgress) || learnPhase;
      void speakLearn({
        isEnglish: learnLoopIsEnglish,
        phase: activePhase,
        progress: learnProgress,
      });
    }
    return { phase: learnPhase, progress: learnProgress };
  };

  const stopLearnLoop = () => {
    learnLoopActive = false;
    learnActive = false;
    if (learnLoopTimer) {
      clearTimeout(learnLoopTimer);
      learnLoopTimer = null;
    }
    syncAssistantOutput();
  };

  const interruptAssistantOutput = () => {
    stopSpeak();
    return true;
  };

  const setSpeakerOn = (on) => {
    speakerOn = Boolean(on);
    if (!speakerOn) stopSpeak();
    return speakerOn;
  };

  const stopMic = () => micCapture.stop();

  /** Unlock TTS after a user gesture (required by Chrome/Safari autoplay policy). */
  const primeAudio = async () => {
    unlockAudioSync();
    await ensureVoices();
    if (speaking) return true;
    if (opts.cloudTtsUrl) {
      try {
        const preset = cloudVoicePreset();
        const primeWord = preset.lang?.startsWith("en") ? "Hi" : "好";
        const res = await fetch(opts.cloudTtsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: primeWord,
            emotion: "neutral",
            voice: preset.name,
            lang: preset.lang,
          }),
        });
        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0) {
            if (speaking) {
              usingCloudTts = true;
              voice = cloudVoicePreset();
              return true;
            }
            const objectUrl = URL.createObjectURL(blob);
            const audio = configureCompanionAudioElement(new Audio());
            audio.volume = 0.12;
            audio.src = objectUrl;
            const played = await audio
              .play()
              .then(() => true)
              .catch(() => false);
            URL.revokeObjectURL(objectUrl);
            if (played) {
              usingCloudTts = true;
              voice = cloudVoicePreset();
              return true;
            }
          }
        }
      } catch {
        /* fall through to browser TTS */
      }
    }
    if (!synth) return false;
    if (speaking) return true;
    try {
      if (synth.paused) synth.resume();
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(" ");
      utter.volume = 0.01;
      utter.rate = 2;
      if (voice && !voice.cloud) utter.voice = voice;
      await new Promise((resolve) => {
        utter.onend = resolve;
        utter.onerror = resolve;
        synth.speak(utter);
        setTimeout(resolve, 400);
      });
      if (!speaking) synth.cancel();
      return true;
    } catch {
      return false;
    }
  };

  const primeMicPermission = () => micCapture.primePermission();

  const startMic = (startOpts = {}) => micCapture.start(startOpts);

  const toggleMic = () => (micCapture.on ? stopMic() : startMic());

  const setLang = (next) => {
    const lang = String(next || opts.lang || "zh-HK");
    opts.lang = lang;
    micCapture.setLang?.(lang);
    return lang;
  };

  const setCloudVoice = (preset) => {
    if (!preset?.name) return voice;
    opts.cloudVoice = preset;
    voice = preset;
    if (preset.lang) setLang(preset.lang);
    usingCloudTts = Boolean(opts.cloudTtsUrl);
    return voice;
  };

  const setCharacterId = (nextId) => {
    activeCharacterId = String(nextId || "amoji").toLowerCase();
    return activeCharacterId;
  };

  return {
    schema: COMPANION_VOICE_SCHEMA,
    get speakerOn() {
      return speakerOn;
    },
    get micOn() {
      return micCapture.on;
    },
    get speaking() {
      return speaking;
    },
    get thinkingLoopOn() {
      return thinkingLoopActive;
    },
    get learnLoopOn() {
      return learnLoopActive;
    },
    get assistantOutputActive() {
      return isAssistantOutputActive();
    },
    get keepMicDuringSpeak() {
      return keepMicDuringSpeak;
    },
    interruptAssistantOutput,
    get listening() {
      return micCapture.listening;
    },
    get voiceName() {
      return voice?.name || null;
    },
    get cloudTts() {
      return usingCloudTts;
    },
    get supportsMic() {
      return micCapture.supportsMic;
    },
    get usesCloudStt() {
      return micCapture.usesCloudStt;
    },
    get supportsSpeak() {
      return Boolean(synth) || Boolean(opts.cloudTtsUrl);
    },
    ensureVoices,
    unlockAudioSync,
    primeAudio,
    primeMicPermission,
    speak,
    speakThinking,
    startThinkingLoop,
    stopThinkingLoop,
    speakLearn,
    startLearnLoop,
    updateLearnLoop,
    stopLearnLoop,
    setKeepMicDuringSpeak,
    beginStreamSpeak,
    pushStreamSpeak,
    finishStreamSpeak,
    cancelStreamSpeak,
    stopSpeak,
    setSpeakerOn,
    pauseCapture,
    resumeCapture,
    startMic,
    stopMic,
    toggleMic,
    setCloudVoice,
    setCharacterId,
    setLang,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
