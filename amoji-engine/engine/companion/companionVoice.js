/**
 * Browser female TTS + mic capture for the companion demo (Grok-style).
 * Uses Web Speech API: speechSynthesis (female voice + emotion tone)
 * and SpeechRecognition for microphone input.
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

/**
 * Prefer a female / higher-pitch voice, Cantonese/Chinese when available.
 * @param {SpeechSynthesisVoice[]} voices
 */
export function pickFemaleVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  const score = (v) => {
    const name = `${v.name} ${v.lang}`.toLowerCase();
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
 *   onMouth?: (open: number) => void,
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
  let micOn = false;
  /** @type {SpeechRecognition | null} */
  let recognition = null;
  let speaking = false;
  let mouthTimer = null;

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

  const stopMouth = () => {
    if (mouthTimer) {
      clearInterval(mouthTimer);
      mouthTimer = null;
    }
    opts.onMouth?.(0);
    opts.onTalking?.(false);
  };

  const startMouthPulse = () => {
    stopMouth();
    opts.onTalking?.(true);
    const t0 = performance.now();
    mouthTimer = setInterval(() => {
      const pulse =
        0.22 + Math.abs(Math.sin((performance.now() - t0) * 0.028)) * 0.78;
      opts.onMouth?.(pulse);
    }, 40);
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
    if (!speakerOn) {
      // Still animate mouth briefly so UI feels alive when muted
      startMouthPulse();
      await sleep(Math.min(2200, 400 + clean.length * 28));
      stopMouth();
      return { ok: true, muted: true };
    }
    if (!synth) {
      startMouthPulse();
      await sleep(Math.min(2800, 450 + clean.length * 36));
      stopMouth();
      return { ok: false, reason: "no-speech-synthesis" };
    }

    await ensureVoices();
    synth.cancel();
    speaking = true;
    startMouthPulse();

    const prosody = EMOTION_PROSODY[emotion] || EMOTION_PROSODY.neutral;
    const utter = new SpeechSynthesisUtterance(clean);
    if (voice) utter.voice = voice;
    // Prefer zh-HK when voice supports it; otherwise keep voice default lang
    utter.lang = voice?.lang || opts.lang || "zh-HK";
    utter.rate = prosody.rate;
    utter.pitch = prosody.pitch;
    utter.volume = prosody.volume;

    return new Promise((resolve) => {
      utter.onend = () => {
        speaking = false;
        stopMouth();
        resolve({
          ok: true,
          voice: voice?.name || null,
          emotion,
        });
      };
      utter.onerror = (ev) => {
        speaking = false;
        stopMouth();
        opts.onError?.(ev?.error || "tts-error");
        resolve({ ok: false, reason: ev?.error || "tts-error" });
      };
      synth.speak(utter);
    });
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
    micOn = false;
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
    opts.onMicState?.(false);
    return false;
  };

  const startMic = () => {
    if (!Rec) {
      opts.onError?.("Speech recognition not supported in this browser");
      return false;
    }
    if (micOn) return true;
    stopSpeak();
    recognition = new Rec();
    recognition.lang = opts.lang || "zh-HK";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (ev) => {
      let interim = "";
      let finalText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const chunk = ev.results[i][0]?.transcript || "";
        if (ev.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (interim) opts.onMicText?.(interim, false);
      if (finalText) {
        opts.onMicText?.(finalText.trim(), true);
        stopMic();
      }
    };
    recognition.onerror = (ev) => {
      opts.onError?.(ev?.error || "mic-error");
      stopMic();
    };
    recognition.onend = () => {
      if (micOn) {
        // Chrome sometimes ends early — keep state honest
        micOn = false;
        opts.onMicState?.(false);
      }
    };
    try {
      recognition.start();
      micOn = true;
      opts.onMicState?.(true);
      return true;
    } catch (err) {
      opts.onError?.(err?.message || String(err));
      micOn = false;
      opts.onMicState?.(false);
      return false;
    }
  };

  const toggleMic = () => (micOn ? stopMic() : startMic());

  return {
    schema: COMPANION_VOICE_SCHEMA,
    get speakerOn() {
      return speakerOn;
    },
    get micOn() {
      return micOn;
    },
    get speaking() {
      return speaking;
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
    startMic,
    stopMic,
    toggleMic,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
