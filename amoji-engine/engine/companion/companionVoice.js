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
  isLearnThinkingSound,
  isLoadingLearnPhase,
  isLoadingWaitKind,
  LEARN_SPEAK_DELAY_MS,
  LEARN_SPEAK_INTERVAL_MS,
  LEARN_SPEAK_POLL_MS,
  LEARN_SPEAK_WORDS_INTERVAL_MS,
  learnPhaseForProgress,
  pickLearnPhrase,
  pickNextLearnPhrase,
  shouldSpeakLearnFill,
  shouldUseLearnWords,
} from "./companionLearnDialogue.js";
import { isIosLike, shouldPauseMicDuringTts } from "./companionPlatform.js";
import {
  buildExpressiveTtsPlan,
  clausePauseMs,
} from "./companionExpressiveTts.js";
import {
  buildSpeechExpressionTimelineCached,
  expressionAtTimelineProgress,
} from "./companionSpeechFace.js";
import { characterGender } from "./companionCharacterCatalog.js";
import { formatReplyForDisplay } from "./companionActionMotion.js";
import {
  buildCloudTtsRequestBody,
  CHATGPT_STYLE_TTS,
  enrichTtsPerformance,
  MAX_CLOUD_TTS_CHARS,
  normalizeTtsPerformance,
  resolveCompanionTtsProsody,
} from "./companionTtsProsody.js";
import {
  applyPokeVocalToSpeech,
  applyVocalPrefixToSpeech,
} from "./companionVocalizations.js";
import {
  cycleTalkSpeed,
  loadTalkSpeed,
  normalizeTalkSpeed,
  saveTalkSpeed,
} from "./companionTalkSpeed.js";

export { formatMicError, MIC_ERROR_MESSAGES, requestMicPermission };

/**
 * Browser female TTS + mic capture for the companion demo (Grok-style).
 * Uses Web Speech API: speechSynthesis (female voice + emotion tone)
 * and SpeechRecognition (or cloud STT fallback) for microphone conversation.
 *
 * Lip sync: maps spoken words/characters to mouth shapes via
 * SpeechSynthesisUtterance boundary events (with timed fallback).
 */

export const COMPANION_VOICE_SCHEMA =
  "amoji.companionVoice.v2-interrupt-all-speech";

/** Abort slow /api/tts calls so the greeting can fall back to browser voice. */
export const CLOUD_TTS_FETCH_TIMEOUT_MS = 12000;

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {number} [timeoutMs]
 */
export async function fetchCloudTts(url, init = {}, timeoutMs = CLOUD_TTS_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
    void audio
      .play()
      .then(() => {
        globalThis.window.__amojiAudioUnlocked = true;
      })
      .catch(() => {});
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
let activeCharacterId = "nova";
let talkSpeedMultiplier = loadTalkSpeed();

const resolveSpeakProsody = (text, performance, lang) =>
  resolveCompanionTtsProsody({
    ...performance,
    text,
    lang: lang || performance.lang,
    characterId: activeCharacterId,
    speedMultiplier:
      performance?.speedMultiplier ?? talkSpeedMultiplier,
  });

const withTalkSpeed = (performance = {}) => ({
  ...performance,
  speedMultiplier: performance.speedMultiplier ?? talkSpeedMultiplier,
});

import {
  buildLipSyncTimeline,
  buildLipSyncTimelineCached,
  charToViseme,
  estimateLipSyncMsPerChar,
  lipSyncCharWeight,
  visemeAtAudioProgress,
  visemeAtTimelineProgress,
} from "./companionViseme.js";

export {
  buildLipSyncTimeline,
  buildLipSyncTimelineCached,
  charToViseme,
  estimateLipSyncMsPerChar,
  lipSyncCharWeight,
  visemeAtAudioProgress,
  visemeAtTimelineProgress,
};

/**
 * 0..1 playback fraction from an HTMLAudioElement, with elapsed fallback.
 * @param {{ duration?: number, currentTime?: number } | null | undefined} audio
 * @param {number} [elapsedMs]
 * @param {number} [fallbackDurationMs]
 */
export function audioPlaybackProgress(audio, elapsedMs = 0, fallbackDurationMs = 0) {
  const duration = Number(audio?.duration);
  const current = Number(audio?.currentTime);
  if (Number.isFinite(duration) && duration > 0.05 && Number.isFinite(current)) {
    return Math.max(0, Math.min(1, current / duration));
  }
  const fb = Number(fallbackDurationMs);
  if (Number.isFinite(fb) && fb > 0) {
    return Math.max(0, Math.min(1, (Number(elapsedMs) || 0) / fb));
  }
  return 0;
}

/**
 * Generous playback budget for cloud TTS — neural voices run slower than char estimates.
 * @param {string} text
 * @param {number} [durationSec]
 */
export function cloudTtsSafetyBudgetMs(text, durationSec) {
  const clean = String(text || "");
  const charMs = estimateLipSyncMsPerChar(clean);
  const dur = Number(durationSec);
  if (Number.isFinite(dur) && dur > 0.05) {
    return Math.min(120000, dur * 1000 + 5000);
  }
  return Math.min(
    120000,
    Math.max(15000, clean.length * charMs * 3.2 + 8000),
  );
}

/**
 * Browser speechSynthesis timeout — long Cantonese replies need more than 15s.
 * @param {string} text
 */
export function browserTtsTimeoutMs(text) {
  const clean = String(text || "");
  return Math.min(
    120000,
    Math.max(20000, 800 + clean.length * estimateLipSyncMsPerChar(clean) * 2.8),
  );
}

/**
 * Time-domain RMS 0..1 from a Web Audio analyser (not used on iOS).
 * @param {AnalyserNode | null | undefined} analyser
 */
export function readAnalyserMouthLevel(analyser) {
  if (!analyser || typeof analyser.getByteTimeDomainData !== "function") {
    return 0;
  }
  const buf = new Uint8Array(analyser.fftSize || 256);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const n = (buf[i] - 128) / 128;
    sum += n * n;
  }
  return Math.min(1, Math.sqrt(sum / Math.max(1, buf.length)) * 3.4);
}

/**
 * Prefer a female / higher-pitch voice, Cantonese/Chinese when available.
 * @param {SpeechSynthesisVoice[]} voices
 */
const MALE_VOICE_RE =
  /\b(male|man|boy|david|daniel|ravi|keda|alex|fred|bruce|tom|jorge|lee|james|mark|aaron|guy|richard|nathan|oliver|matthew|ryan|paul)\b/i;

export function pickMaleVoice(voices) {
  const list = (Array.isArray(voices) ? voices : []).filter((v) => {
    if (!v || typeof v.name !== "string") return false;
    if (v.gender === "female") return false;
    const name = `${v.name} ${v.lang || ""}`;
    if (/female|woman|girl/i.test(name) && !MALE_VOICE_RE.test(name)) return false;
    return true;
  });
  const score = (v) => {
    const name = `${v.name} ${v.lang || ""}`.toLowerCase();
    let s = 0;
    if (v.gender === "male") s += 80;
    if (/wanlung|sam|david|guy|ryan|mark|james|paul|aaron|richard/.test(name)) s += 55;
    if (/male|man|boy/.test(name)) s += 45;
    if (/zh-hk|yue|cantonese|hong kong/.test(name)) s += 20;
    if (/en-hk|en-gb|en-au|en-us/.test(name)) s += 10;
    if (v.localService) s += 5;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * @param {"female" | "male"} gender
 * @param {SpeechSynthesisVoice[]} voices
 */
export function pickVoiceForGender(gender, voices) {
  return gender === "male" ? pickMaleVoice(voices) : pickFemaleVoice(voices);
}

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
 *   onSpeakExpression?: (analysis: object) => void,
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
  let learnKind = "";
  let learnSpokenCount = 0;
  let learnLoopStartedAt = 0;
  let learnLastSpeakAt = 0;
  let learnSpeakInFlight = false;
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

  /**
   * Route cloud TTS through an analyser for RMS mouth drive.
   * Skip on iOS — Web Audio + mic sends TTS to the earpiece.
   * @param {HTMLAudioElement} audio
   */
  const bindCloudTtsAnalyser = (audio) => {
    if (!audio || typeof globalThis.window === "undefined") return null;
    if (isIosLike()) return null;
    if (audio.__amojiAnalyser) return audio.__amojiAnalyser;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    try {
      const ctx =
        globalThis.window.__amojiAudioCtx ||
        new AC({ latencyHint: "interactive" });
      globalThis.window.__amojiAudioCtx = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const source =
        audio.__amojiMediaSource || ctx.createMediaElementSource(audio);
      audio.__amojiMediaSource = source;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audio.__amojiAnalyser = analyser;
      return analyser;
    } catch {
      return null;
    }
  };

  const ttsPlaybackVolume = () => {
    if (shouldPauseMicDuringTts()) return 1;
    return keepMicDuringSpeak ? 0.92 : 1;
  };

  const mustPauseMicForTts = () =>
    !keepMicDuringSpeak || shouldPauseMicDuringTts();
  /** Serialize TTS so greeting + replies do not overlap or cut each other off. */
  let speakChain = Promise.resolve();
  /** @type {{ performance: ReturnType<typeof normalizeTtsPerformance>, closed: boolean, capturePaused: boolean } | null} */
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
        const langCode = String(opts.lang || voice?.lang || "zh-HK").startsWith("en")
          ? "en"
          : "yue";
        const gender = characterGender(activeCharacterId, langCode);
        voice = pickVoiceForGender(gender, synth.getVoices());
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
  const playCloudAudioBlob = async (
    blob,
    clean,
    emotion,
    { holdSpeaking = false, nuance = "none" } = {},
  ) => {
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
    if (!holdSpeaking) {
      speaking = true;
      syncAssistantOutput();
    }
    const preset = cloudVoicePreset();

    return await new Promise((resolve) => {
      const audio = configureCompanionAudioElement(getSharedAudio());
      currentCloudAudio = audio;
      audio.volume = ttsPlaybackVolume();
      audio.src = objectUrl;
      let settled = false;
      let mouthStarted = false;
      let safetyTimer = null;
      let lastPlaybackSec = 0;
      let lastProgressAt = performance.now();
      let safetyBudgetMs = cloudTtsSafetyBudgetMs(clean, audio.duration);
      const beginMouth = () => {
        if (mouthStarted) return;
        mouthStarted = true;
        const startedAt = performance.now();
        const fallbackMs =
          Number.isFinite(audio.duration) && audio.duration > 0
            ? audio.duration * 1000
            : clean.length * estimateLipSyncMsPerChar(clean);
        const analyser = bindCloudTtsAnalyser(audio);
        startLipSync(clean, null, {
          durationMs: fallbackMs,
          speedMultiplier: talkSpeedMultiplier,
          audioLevel: analyser
            ? () => readAnalyserMouthLevel(analyser)
            : undefined,
          speakFace: { emotion: emotion || "neutral", nuance: nuance || "none" },
          getProgress: () => {
            const liveMs =
              Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration * 1000
                : fallbackMs;
            return audioPlaybackProgress(
              audio,
              performance.now() - startedAt,
              liveMs,
            );
          },
        });
      };
      const finish = (result, { pauseAudio = true } = {}) => {
        if (settled) return;
        settled = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        safetyTimer = null;
        if (currentCloudAudio === audio) currentCloudAudio = null;
        if (pauseAudio) {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
        }
        URL.revokeObjectURL(objectUrl);
        if (!holdSpeaking) {
          speaking = false;
        }
        syncAssistantOutput();
        stopMouth({ keepTalking: holdSpeaking, keepMouth: holdSpeaking });
        resolve(result);
      };
      const scheduleSafety = (budgetMs = safetyBudgetMs) => {
        if (safetyTimer) clearTimeout(safetyTimer);
        safetyBudgetMs = Math.min(120000, Math.max(15000, budgetMs));
        safetyTimer = setTimeout(onSafety, safetyBudgetMs);
      };
      const bumpSafetyFromMetadata = () => {
        const dur = Number(audio.duration);
        if (!Number.isFinite(dur) || dur <= 0.05) return;
        scheduleSafety(cloudTtsSafetyBudgetMs(clean, dur));
      };
      const onSafety = () => {
        if (settled) return;
        const dur = Number(audio.duration);
        const stalledMs = performance.now() - lastProgressAt;
        const nearEnd =
          Number.isFinite(dur) && dur > 0 && audio.currentTime >= dur - 0.35;
        if (audio.ended || nearEnd) {
          finish({
            ok: true,
            voice: preset.name,
            emotion,
            cloud: true,
          });
          return;
        }
        // Playback still advancing — extend instead of cutting mid-sentence.
        if (!audio.paused && stalledMs < 5000) {
          scheduleSafety(Math.max(8000, stalledMs + 8000));
          return;
        }
        finish(
          { ok: true, voice: preset.name, emotion, cloud: true, timedOut: true },
          { pauseAudio: true },
        );
      };
      scheduleSafety();
      audio.onloadedmetadata = bumpSafetyFromMetadata;
      audio.ondurationchange = bumpSafetyFromMetadata;
      audio.onplaying = () => beginMouth();
      audio.ontimeupdate = () => {
        if (!mouthStarted && audio.currentTime > 0) beginMouth();
        if (audio.currentTime > lastPlaybackSec + 0.02) {
          lastPlaybackSec = audio.currentTime;
          lastProgressAt = performance.now();
        }
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
      void audio.play()
        .then(() => beginMouth())
        .catch((err) => {
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
    stopThinkingAudio();
    stopCloudAudio();
    synth?.cancel();

    const preset = cloudVoicePreset();
    const perf = enrichTtsPerformance(withTalkSpeed(performance), clean);
    const parts = chunkTextForCloudTts(clean);
    if (!parts.length) return { ok: false, reason: "empty" };

    speaking = true;
    syncAssistantOutput();

    /** @type {{ ok: boolean, reason?: string, voice?: string, emotion?: string, cloud?: boolean }} */
    let last = { ok: false, reason: "empty" };
    try {
      for (const part of parts) {
        const plan = buildExpressiveTtsPlan(
          part,
          { ...perf, lang: preset.lang, voiceId: preset.name },
          activeCharacterId,
          preset.lang,
          preset.name,
        );
        const useClauses =
          perf.singleUtterance === false &&
          perf.expressiveClauses === true &&
          plan.clauses.length > 0;
        const clauses = useClauses
          ? plan.clauses
          : [{ text: part, ...perf }];
        for (let i = 0; i < clauses.length; i += 1) {
          const clause = clauses[i];
          opts.onSpeakExpression?.({
            unit: clause.text,
            emotion: clause.emotion || perf.emotion,
            nuance: clause.nuance || perf.nuance,
            talkStyle: clause.talkStyle || perf.talkStyle,
            speechEnergy: clause.speechEnergy ?? perf.speechEnergy,
          });
          let res;
          try {
            res = await fetchCloudTts(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                buildCloudTtsRequestBody({
                text: clause.text,
                performance: {
                  ...perf,
                  emotion: clause.emotion || perf.emotion,
                  nuance: clause.nuance || perf.nuance,
                  talkStyle: clause.talkStyle || perf.talkStyle,
                  speechEnergy: clause.speechEnergy ?? perf.speechEnergy,
                },
                voice: preset.name,
                lang: preset.lang,
                  characterId: activeCharacterId,
                }),
              ),
            });
          } catch (err) {
            const reason =
              err?.name === "AbortError"
                ? "cloud-tts-timeout"
                : err?.message || "cloud-tts-fetch-failed";
            return { ok: false, reason };
          }
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
            {
              holdSpeaking: true,
              nuance: clause.nuance || perf.nuance,
            },
          );
          if (!last.ok) return last;
          if (i < clauses.length - 1) {
            await sleep(clause.pauseMs ?? clausePauseMs(clause.text));
          }
        }
      }
      return last;
    } finally {
      const streamActive = isStreamPlaybackActive();
      if (!streamActive) {
        speaking = false;
        stopMouth();
      } else {
        stopMouth({ keepTalking: true, keepMouth: false });
      }
      syncAssistantOutput();
    }
  };

  const emitViseme = (ch) => {
    const { shape, open } = charToViseme(ch);
    opts.onMouth?.(open, shape);
  };

  const isStreamPlaybackActive = () =>
    Boolean(streamSession && !streamSession.closed);

  const stopMouth = ({ keepTalking = false, keepMouth = false } = {}) => {
    if (mouthTimer) {
      clearInterval(mouthTimer);
      mouthTimer = null;
    }
    for (const t of mouthTimeouts) clearTimeout(t);
    mouthTimeouts = [];
    const holdTalk = keepTalking || isStreamPlaybackActive();
    const holdMouth = keepMouth || holdTalk;
    if (!holdMouth) {
      opts.onMouth?.(0, null);
    }
    if (!holdTalk) {
      opts.onTalking?.(false);
    }
  };

  /**
   * Drive mouth shapes locked to audio progress (cloud TTS) or elapsed estimate.
   * @param {string} text
   * @param {SpeechSynthesisUtterance} [utter]
   * @param {{ durationMs?: number, audioLevel?: () => number, getProgress?: () => number, speedMultiplier?: number, speakFace?: object }} [timing]
   */
  const startLipSync = (text, utter, timing = {}) => {
    stopMouth({ keepTalking: true, keepMouth: true });
    opts.onTalking?.(true);
    const clean = String(text || "");
    if (!clean) return;
    const speakFace = timing.speakFace || { emotion: "neutral", nuance: "none" };
    const lipTimeline = buildLipSyncTimelineCached(clean);
    const faceTimeline = buildSpeechExpressionTimelineCached(clean, speakFace);
    const speedMult = normalizeTalkSpeed(
      timing.speedMultiplier ?? talkSpeedMultiplier,
    );
    let lastSpeakUnit = "";
    let lastSpeakIndex = -1;

    const emitSpeakFace = (progress) => {
      const face = expressionAtTimelineProgress(faceTimeline, progress);
      if (!face.unit) return;
      const sameUnit = face.unit === lastSpeakUnit;
      const sameIndex = face.index === lastSpeakIndex;
      if (sameUnit && sameIndex) return;
      lastSpeakUnit = face.unit;
      lastSpeakIndex = face.index ?? -1;
      opts.onSpeakExpression?.(face);
      opts.onSpeakChunk?.(face.unit, face.index ?? 0);
    };

    let boundaryWorks = false;
    if (utter && "onboundary" in utter) {
      utter.onboundary = (ev) => {
        boundaryWorks = true;
        const idx = ev.charIndex ?? 0;
        const len = ev.charLength || 1;
        const slice = clean.slice(idx, idx + len);
        const ch = slice[0] || clean[idx] || " ";
        emitViseme(ch);
        if (slice.trim()) {
          const progress =
            clean.length > 1 ? Math.min(1, idx / Math.max(1, clean.length - 1)) : 0;
          emitSpeakFace(progress);
        }
      };
    }

    const rate = Number(utter?.rate);
    const durationMs =
      Number(timing.durationMs) > 0
        ? Number(timing.durationMs)
        : Number.isFinite(rate) && rate > 0
          ? (clean.length * estimateLipSyncMsPerChar(clean)) / rate
          : clean.length * estimateLipSyncMsPerChar(clean, 0, speedMult);
    const audioLevel = timing.audioLevel;
    const startedAt = performance.now();
    const getProgress =
      typeof timing.getProgress === "function"
        ? timing.getProgress
        : () =>
            audioPlaybackProgress(
              null,
              performance.now() - startedAt,
              durationMs,
            );
    let lastIndex = -1;
    mouthTimer = setInterval(() => {
      if (boundaryWorks) return;
      const progress = getProgress();
      const level = audioLevel?.() ?? 0;
      const sample = visemeAtTimelineProgress(lipTimeline, progress, level);
      opts.onMouth?.(sample.open, sample.shape);
      if (sample.index !== lastIndex) {
        emitSpeakFace(progress);
        lastIndex = sample.index;
      } else if (level > 0.12) {
        opts.onMouth?.(sample.open, sample.shape);
      }
    }, 28);

    if (!timing.getProgress) {
      mouthTimeouts.push(
        setTimeout(() => {
          if (!boundaryWorks && !isStreamPlaybackActive()) {
            opts.onMouth?.(0, null);
          }
        }, Math.min(20000, durationMs + 400)),
      );
    }
  };

  const pauseCapture = () => {
    micCapture.pause();
  };

  const resumeCapture = () => {
    micCapture.resume();
  };

  const cleanSpeakText = (text) =>
    formatReplyForDisplay(String(text || ""))
      .replace(/[*_`#>/\\]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

    const rawPerf =
      typeof performance === "object" && performance !== null
        ? performance.singleUtterance === true
          ? { ...performance, speedMultiplier: performance.speedMultiplier ?? talkSpeedMultiplier }
          : {
              ...CHATGPT_STYLE_TTS,
              ...performance,
              speedMultiplier: performance.speedMultiplier ?? talkSpeedMultiplier,
            }
        : {
            ...CHATGPT_STYLE_TTS,
            emotion: performance || "neutral",
            speedMultiplier: talkSpeedMultiplier,
          };
    let perf = enrichTtsPerformance(rawPerf, clean);
    const langCode = String(voice?.lang || opts.lang || "zh-HK");
    const isEnglish = langCode.startsWith("en");

    stopThinkingAudio();

    let speakText = clean;
    const streamActive = Boolean(streamSession && !streamSession.closed);
    const allowVocal =
      !rawPerf.skipVocalization &&
      !(streamActive && streamSession.vocalizationApplied);
    if (allowVocal && speakerOn) {
      const merged = applyVocalPrefixToSpeech(clean, perf, { isEnglish });
      if (merged.merged) {
        speakText = merged.text;
        perf = enrichTtsPerformance(merged.performance, speakText);
        if (streamActive) streamSession.vocalizationApplied = true;
        opts.onSpeakExpression?.({
          unit: merged.performance.vocalPrefix,
          emotion: perf.emotion,
          nuance: perf.nuance,
          talkStyle: perf.talkStyle,
          speechEnergy: perf.speechEnergy,
          vocalization: merged.performance.vocalization,
        });
      }
    }

    const prosody = resolveSpeakProsody(speakText, perf, langCode);
    opts.onSpeakProsody?.({
      emotion: prosody.emotion,
      nuance: prosody.nuance,
      talkStyle: prosody.talkStyle,
      speechEnergy: prosody.speechEnergy,
      browser: prosody.browser,
      instruct: prosody.instruct,
    });

    try {
      if (!speakerOn) {
        startLipSync(speakText, null, {
          speakFace: { emotion: perf.emotion, nuance: perf.nuance },
          speedMultiplier: talkSpeedMultiplier,
        });
        await sleep(
          Math.min(
            5200,
            400 + speakText.length * estimateLipSyncMsPerChar(speakText, 0, talkSpeedMultiplier),
          ),
        );
        const holdGap = isStreamPlaybackActive();
        stopMouth({ keepTalking: holdGap, keepMouth: holdGap });
        return { ok: true, muted: true };
      }
      await ensureVoices();

      const tryCloud =
        Boolean(opts.cloudTtsUrl) &&
        (usingCloudTts || opts.preferCloudTts !== false);
      if (tryCloud) {
        const cloudResult = await speakCloud(speakText, {
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
        startLipSync(speakText, null, {
          speakFace: { emotion: perf.emotion, nuance: perf.nuance },
          speedMultiplier: talkSpeedMultiplier,
        });
        await sleep(
          Math.min(
            5600,
            450 + speakText.length * estimateLipSyncMsPerChar(speakText, 0, talkSpeedMultiplier),
          ),
        );
        const holdGap = isStreamPlaybackActive();
        stopMouth({ keepTalking: holdGap, keepMouth: holdGap });
        return {
          ok: false,
          reason: tryCloud ? "cloud-and-browser-tts-unavailable" : "no-speech-synthesis",
        };
      }

      synth.cancel();
      speaking = true;
      syncAssistantOutput();

      const browserProsody = prosody.browser;
      const utter = new SpeechSynthesisUtterance(speakText);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || opts.lang || "zh-HK";
      utter.rate = browserProsody.rate;
      utter.pitch = browserProsody.pitch;
      utter.volume = shouldPauseMicDuringTts()
        ? browserProsody.volume
        : keepMicDuringSpeak
          ? browserProsody.volume * 0.92
          : browserProsody.volume;

      startLipSync(speakText, utter, {
        speakFace: { emotion: perf.emotion, nuance: perf.nuance },
        speedMultiplier: talkSpeedMultiplier,
      });

      const maxMs = browserTtsTimeoutMs(speakText);
      let settled = false;
      const finishSpeak = (result) => {
        if (settled) return result;
        settled = true;
        const holdGap = isStreamPlaybackActive();
        if (!holdGap) {
          speaking = false;
        }
        stopMouth({ keepTalking: holdGap, keepMouth: holdGap });
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

  /** Poke/tap: quick blip then follow-up phrase — two TTS clips, same voice chain. */
  const speakPokeSequence = (blip, followUp, performance = "neutral") => {
    const next = speakChain.then(async () => {
      const pauseMic = mustPauseMicForTts();
      if (pauseMic) pauseCapture();
      try {
        const basePerf =
          typeof performance === "object" && performance !== null
            ? performance
            : { emotion: performance || "happy" };
        const blipText = String(blip || "").trim();
        const followText = String(followUp || "").trim();
        if (!blipText && !followText) return { ok: false, reason: "empty-poke" };
        if (blipText) {
          await speakOnceCore(blipText, {
            ...basePerf,
            pokeBlip: true,
            pokeReaction: true,
            skipVocalization: true,
            speechEnergy: 0.88,
            talkStyle: "celebrate",
          });
        }
        if (followText) {
          await new Promise((r) => setTimeout(r, blipText ? 220 : 0));
          return speakOnceCore(followText, {
            ...basePerf,
            pokeFollowUp: true,
            pokeReaction: true,
            skipVocalization: true,
            nuance: "shy",
            speechEnergy: 0.8,
            talkStyle: "soft",
          });
        }
        return { ok: true };
      } finally {
        if (pauseMic) resumeCapture();
      }
    });
    speakChain = next.catch(() => {});
    return next;
  };

  /** Poke/tap: playful vocal merged into tap line — one voice, one TTS clip. */
  const speakPoke = (text, performance = "neutral") => {
    const next = speakChain.then(async () => {
      const pauseMic = mustPauseMicForTts();
      if (pauseMic) pauseCapture();
      try {
        const langCode = String(voice?.lang || opts.lang || "zh-HK");
        const isEnglish = langCode.startsWith("en");
        const clean = cleanSpeakText(text);
        const basePerf =
          typeof performance === "object" && performance !== null
            ? performance
            : { emotion: performance || "happy" };
        const merged = applyPokeVocalToSpeech(clean, basePerf, isEnglish);
        return speakOnceCore(merged.text, merged.performance);
      } finally {
        if (pauseMic) resumeCapture();
      }
    });
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
  const beginStreamSpeak = (defaultPerformance = "neutral", sessionOpts = {}) => {
    if (streamSession) {
      streamSession.closed = true;
      streamSession = null;
    }
    stopTtsPlayback();
    speakChain = Promise.resolve();
    const pauseMic =
      sessionOpts.pauseCapture !== false || shouldPauseMicDuringTts();
    const perf = normalizeTtsPerformance(defaultPerformance);
    streamSession = {
      performance: { ...CHATGPT_STYLE_TTS, ...perf },
      closed: false,
      capturePaused: pauseMic,
      vocalizationApplied: false,
    };
    if (pauseMic) pauseCapture();
    speaking = true;
    opts.onTalking?.(true);
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
    const base = streamSession.performance || { emotion: "neutral" };
    const perf = enrichTtsPerformance(
      {
        ...base,
        ...normalizeTtsPerformance(performance, base.emotion || "neutral"),
      },
      clean,
    );
    const next = speakChain.then(() => {
      if (!streamSession) {
        return { ok: false, reason: "stream-closed" };
      }
      return speakOnceCore(clean, {
        ...CHATGPT_STYLE_TTS,
        ...perf,
        text: clean,
      });
    });
    speakChain = next.catch(() => {});
    return next;
  };

  /**
   * Refresh stream session performance when [mood:…] arrives late in the token stream.
   * @param {string | ReturnType<typeof normalizeTtsPerformance>} performance
   */
  const updateStreamSpeakPerformance = (performance) => {
    if (!streamSession || streamSession.closed) return false;
    const perf = normalizeTtsPerformance(performance);
    streamSession.performance = { ...CHATGPT_STYLE_TTS, ...streamSession.performance, ...perf };
    return true;
  };

  /** Wait for queued stream segments to finish and end the session. */
  const finishStreamSpeak = async () => {
    const session = streamSession;
    if (!session) return { ok: true };
    session.closed = true;
    syncAssistantOutput();
    try {
      await speakChain;
      return { ok: true };
    } finally {
      streamSession = null;
      speaking = false;
      syncAssistantOutput();
      stopMouth();
      if (session.capturePaused) resumeCapture();
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
        const res = await fetchCloudTts(opts.cloudTtsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildCloudTtsRequestBody({
              text: phrase,
              performance: withTalkSpeed({
                emotion: "thinking",
                nuance: "curious",
                talkStyle: "thinking",
                speechEnergy: 0.32,
                skipVocalization: true,
                thinkingFiller: true,
              }),
              voice: voiceName,
              lang,
              characterId: activeCharacterId,
            }),
          ),
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
    stopLearnLoop();
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
    useWords = false,
  } = {}) => {
    const ctx = { pct: Math.round(progress * 100), useWords };
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
    const wordMode = Boolean(useWords) && !isLearnThinkingSound(phrase);
    const learnEmotion = phase === "failed" ? "sad" : wordMode ? "happy" : "thinking";
    const learnEnergy = phase === "failed" ? 0.4 : wordMode ? 0.44 : 0.32;

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
        const res = await fetchCloudTts(opts.cloudTtsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildCloudTtsRequestBody({
              text: phrase,
              performance: withTalkSpeed({
                emotion: learnEmotion,
                nuance: phase === "failed" ? "none" : "curious",
                talkStyle: "soft",
                speechEnergy: learnEnergy,
                skipVocalization: true,
              }),
              voice: voiceName,
              lang,
              characterId: activeCharacterId,
            }),
          ),
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
      emotion: learnEmotion,
      nuance: phase === "failed" ? "none" : "curious",
      talkStyle: "soft",
      speechEnergy: phase === "failed" ? 0.4 : wordMode ? 0.4 : 0.28,
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
      setTimeout(resolve, wordMode ? 5600 : 2400);
    });

    return { ok: true, phrase, phase };
  };

  const resolveLearnSpeakPhase = () => {
    if (learnPhase === "failed" || learnPhase === "idle") return learnPhase;
    if (isLoadingWaitKind(learnKind) || isLoadingLearnPhase(learnPhase)) {
      return learnPhaseForProgress(learnProgress) || learnPhase;
    }
    return learnPhase;
  };

  const tryLearnSpeak = async () => {
    if (!learnLoopActive || learnSpeakInFlight) return false;
    const elapsedMs = Date.now() - learnLoopStartedAt;
    const sinceLastSpeakMs = learnLastSpeakAt
      ? Date.now() - learnLastSpeakAt
      : Number.POSITIVE_INFINITY;
    const activePhase = resolveLearnSpeakPhase();
    if (
      !shouldSpeakLearnFill({
        elapsedMs,
        progress: learnProgress,
        spokenCount: learnSpokenCount,
        phase: activePhase,
        kind: learnKind,
        sinceLastSpeakMs,
      })
    ) {
      return false;
    }
    learnSpeakInFlight = true;
    try {
      await speakLearn({
        isEnglish: learnLoopIsEnglish,
        phase: activePhase,
        progress: learnProgress,
        useWords: shouldUseLearnWords({
          elapsedMs,
          phase: activePhase,
          kind: learnKind,
        }),
      });
      learnSpokenCount += 1;
      learnLastSpeakAt = Date.now();
      learnAnnouncedPct = Math.round(learnProgress * 100);
      return true;
    } finally {
      learnSpeakInFlight = false;
    }
  };

  const startLearnLoop = ({
    isEnglish = false,
    phase = "learning",
    progress = 0,
    intervalMs = 2600,
    kind = "",
  } = {}) => {
    stopThinkingLoop();
    stopLearnAudio();
    learnLoopActive = true;
    learnLoopIsEnglish = isEnglish;
    learnActive = true;
    learnPhase = phase;
    learnProgress = progress;
    learnKind = kind;
    learnAnnouncedPct = -1;
    learnSpokenCount = 0;
    learnLoopStartedAt = Date.now();
    learnLastSpeakAt = 0;
    learnSpeakInFlight = false;
    syncAssistantOutput();

    const loading = isLoadingWaitKind(kind) || isLoadingLearnPhase(phase);
    const delay = loading ? LEARN_SPEAK_DELAY_MS : 0;

    const tick = async () => {
      if (!learnLoopActive) return;
      const elapsedMs = Date.now() - learnLoopStartedAt;
      const wordMode = shouldUseLearnWords({
        elapsedMs,
        phase: resolveLearnSpeakPhase(),
        kind: learnKind,
      });
      const spoke = await tryLearnSpeak();
      if (!learnLoopActive) return;
      let interval = intervalMs;
      if (loading) {
        if (wordMode) {
          interval =
            intervalMs === 2600
              ? LEARN_SPEAK_WORDS_INTERVAL_MS
              : Math.max(intervalMs, LEARN_SPEAK_WORDS_INTERVAL_MS);
        } else if (intervalMs === 2600) {
          interval = LEARN_SPEAK_INTERVAL_MS;
        }
      }
      const wait = spoke ? interval : LEARN_SPEAK_POLL_MS;
      learnLoopTimer = setTimeout(() => {
        void tick();
      }, wait);
    };

    if (delay > 0) {
      learnLoopTimer = setTimeout(() => {
        void tick();
      }, delay);
    } else {
      void tick();
    }
    return true;
  };

  const updateLearnLoop = ({ phase, progress } = {}) => {
    if (phase) learnPhase = phase;
    if (progress != null) learnProgress = progress;
    if (learnLoopActive && phase !== "failed") {
      void tryLearnSpeak();
    }
    return { phase: learnPhase, progress: learnProgress };
  };

  const stopLearnLoop = () => {
    learnLoopActive = false;
    learnActive = false;
    learnSpeakInFlight = false;
    if (learnLoopTimer) {
      clearTimeout(learnLoopTimer);
      learnLoopTimer = null;
    }
    syncAssistantOutput();
  };

  const interruptAssistantOutput = () => {
    if (streamSession) {
      streamSession.closed = true;
      streamSession = null;
    }
    stopThinkingLoop();
    stopLearnLoop();
    stopSpeak();
    syncAssistantOutput();
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
        let res;
        try {
          res = await fetchCloudTts(opts.cloudTtsUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: primeWord,
              emotion: "neutral",
              voice: preset.name,
              lang: preset.lang,
            }),
          });
        } catch {
          res = null;
        }
        if (res?.ok) {
          const blob = await res.blob();
          if (blob.size > 0) {
            if (speaking) {
              usingCloudTts = true;
              voice = cloudVoicePreset();
              return true;
            }
            const objectUrl = URL.createObjectURL(blob);
            const audio = configureCompanionAudioElement(getSharedAudio());
            audio.volume = 0.12;
            audio.src = objectUrl;
            const played = await audio
              .play()
              .then(() => {
                globalThis.window.__amojiAudioUnlocked = true;
                return true;
              })
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

  const setTalkSpeed = (multiplier) => {
    talkSpeedMultiplier = normalizeTalkSpeed(multiplier);
    saveTalkSpeed(talkSpeedMultiplier);
    return talkSpeedMultiplier;
  };

  const getTalkSpeed = () => talkSpeedMultiplier;

  const cycleTalkSpeedSetting = () => {
    talkSpeedMultiplier = cycleTalkSpeed(talkSpeedMultiplier);
    saveTalkSpeed(talkSpeedMultiplier);
    return talkSpeedMultiplier;
  };

  const setCharacterId = (nextId) => {
    activeCharacterId = String(nextId || "nova").toLowerCase();
    if (!usingCloudTts && synth) {
      const langCode = String(opts.lang || voice?.lang || "zh-HK").startsWith("en")
        ? "en"
        : "yue";
      voice = pickVoiceForGender(
        characterGender(activeCharacterId, langCode),
        synth.getVoices(),
      );
    }
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
    speakPoke,
    speakPokeSequence,
    getTalkSpeed,
    setTalkSpeed,
    cycleTalkSpeed: cycleTalkSpeedSetting,
    speakThinking,
    startThinkingLoop,
    stopThinkingLoop,
    speakLearn,
    startLearnLoop,
    updateLearnLoop,
    stopLearnLoop,
    setKeepMicDuringSpeak,
    beginStreamSpeak,
    updateStreamSpeakPerformance,
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
