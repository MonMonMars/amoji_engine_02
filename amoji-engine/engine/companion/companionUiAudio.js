/**
 * Procedural UI SFX + light haptics — AAA / gacha-style feedback without asset files.
 */
export const COMPANION_UI_AUDIO_SCHEMA = "amoji.companionUiAudio.v1";

const DEFAULT_VOLUME = 0.42;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {{ volume?: number, haptics?: boolean, reducedMotion?: boolean }} [opts]
 */
export function createCompanionUiAudio(opts = {}) {
  let volume = clamp(Number(opts.volume ?? DEFAULT_VOLUME), 0, 1);
  let hapticsEnabled = opts.haptics !== false;
  let reducedMotion = Boolean(opts.reducedMotion);
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let master = null;

  const ensureContext = () => {
    if (reducedMotion) return null;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  };

  const tone = (freq, durationSec, type = "sine", gainPeak = 0.08, when = 0) => {
    const audio = ensureContext();
    if (!audio || !master) return;
    const t0 = audio.currentTime + when;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.02);
  };

  const sweep = (from, to, durationSec, gainPeak = 0.06) => {
    const audio = ensureContext();
    if (!audio || !master) return;
    const t0 = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + durationSec);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.02);
  };

  const noiseBurst = (durationSec = 0.06, gainPeak = 0.04) => {
    const audio = ensureContext();
    if (!audio || !master) return;
    const bufferSize = Math.floor(audio.sampleRate * durationSec);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = audio.createBufferSource();
    const gain = audio.createGain();
    src.buffer = buffer;
    gain.gain.value = gainPeak;
    src.connect(gain);
    gain.connect(master);
    src.start();
  };

  const play = (id) => {
    if (reducedMotion || volume <= 0.001) return false;
    switch (String(id || "tap")) {
      case "tap":
        tone(880, 0.05, "triangle", 0.05);
        break;
      case "toggle-on":
        sweep(420, 920, 0.14, 0.07);
        tone(1240, 0.08, "sine", 0.04, 0.06);
        break;
      case "toggle-off":
        sweep(780, 320, 0.12, 0.06);
        break;
      case "mic-on":
        sweep(380, 1040, 0.16, 0.08);
        tone(1560, 0.1, "sine", 0.035, 0.08);
        noiseBurst(0.04, 0.025);
        break;
      case "mic-off":
        sweep(920, 280, 0.14, 0.065);
        break;
      case "send":
        sweep(520, 1180, 0.1, 0.07);
        tone(1320, 0.06, "triangle", 0.045, 0.05);
        break;
      case "sheet-open":
        sweep(240, 680, 0.18, 0.055);
        noiseBurst(0.05, 0.02);
        break;
      case "sheet-close":
        sweep(620, 220, 0.16, 0.05);
        break;
      case "select":
        tone(740, 0.06, "sine", 0.06);
        tone(988, 0.08, "sine", 0.045, 0.05);
        break;
      case "success":
        tone(660, 0.07, "sine", 0.06);
        tone(880, 0.08, "sine", 0.055, 0.06);
        tone(1174, 0.1, "sine", 0.05, 0.12);
        break;
      case "toast":
        tone(620, 0.05, "triangle", 0.04);
        break;
      case "page":
        sweep(180, 520, 0.22, 0.045);
        break;
      case "live-pulse":
        tone(520 + Math.random() * 80, 0.04, "sine", 0.025);
        break;
      default:
        tone(720, 0.05, "sine", 0.04);
    }
    return true;
  };

  const haptic = (kind = "light") => {
    if (!hapticsEnabled || reducedMotion) return false;
    const nav = globalThis.navigator;
    if (!nav?.vibrate) return false;
    const pattern =
      kind === "medium"
        ? [16, 8, 12]
        : kind === "heavy"
          ? [22, 10, 18]
          : [10];
    try {
      return Boolean(nav.vibrate(pattern));
    } catch {
      return false;
    }
  };

  return {
    schema: COMPANION_UI_AUDIO_SCHEMA,
    unlock() {
      ensureContext();
    },
    play,
    haptic,
    setVolume(next) {
      volume = clamp(Number(next) || 0, 0, 1);
      if (master) master.gain.value = volume;
      return volume;
    },
    setHaptics(on) {
      hapticsEnabled = Boolean(on);
      return hapticsEnabled;
    },
    setReducedMotion(on) {
      reducedMotion = Boolean(on);
    },
  };
}
