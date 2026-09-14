/**
 * Phase A — lightweight mic energy monitor for barge-in during TTS / thinking.
 */

export const COMPANION_BARGE_SCHEMA = "amoji.companionBarge.v1";

/**
 * @param {{
 *   onBargeIn?: (info: { energy: number, speechMs: number, reason?: string }) => void,
 *   energyThreshold?: number,
 *   minSpeechMs?: number,
 * }} [opts]
 */
export function createCompanionBargeMonitor(opts = {}) {
  const threshold = opts.energyThreshold ?? 0.028;
  const minSpeechMs = opts.minSpeechMs ?? 110;

  let active = false;
  let fired = false;
  let speechMs = 0;
  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {AnalyserNode | null} */
  let analyser = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;

  const stopTracks = () => {
    if (stream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
    }
    stream = null;
  };

  const stop = () => {
    active = false;
    fired = false;
    speechMs = 0;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    stopTracks();
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    analyser = null;
  };

  const reset = () => {
    fired = false;
    speechMs = 0;
  };

  const start = async () => {
    if (active) return true;
    if (
      typeof globalThis.navigator === "undefined" ||
      !globalThis.navigator.mediaDevices?.getUserMedia
    ) {
      return false;
    }

    try {
      stream = await globalThis.navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) {
        stop();
        return false;
      }
      audioCtx = new AC();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      active = true;
      fired = false;
      speechMs = 0;

      const buf = new Uint8Array(analyser.fftSize);
      timer = setInterval(() => {
        if (!active || !analyser || fired) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        if (rms >= threshold) {
          speechMs += 100;
        } else {
          speechMs = 0;
        }
        if (speechMs >= minSpeechMs) {
          fired = true;
          opts.onBargeIn?.({
            energy: rms,
            speechMs,
            reason: "energy",
          });
        }
      }, 100);

      return true;
    } catch {
      stop();
      return false;
    }
  };

  return {
    schema: COMPANION_BARGE_SCHEMA,
    get active() {
      return active;
    },
    start,
    stop,
    reset,
  };
}
