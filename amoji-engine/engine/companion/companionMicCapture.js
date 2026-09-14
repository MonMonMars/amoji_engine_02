/**
 * Microphone capture — Web Speech API when available, cloud STT fallback otherwise.
 */
import {
  formatMicError,
  requestMicPermission,
} from "./companionMicUtils.js";

export { formatMicError, requestMicPermission };

const SOFT_MIC_ERRORS = new Set(["no-speech", "aborted", "network"]);

/**
 * @returns {string}
 */
function pickRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * @param {{
 *   lang?: string,
 *   cloudSttUrl?: string | null,
 *   onText?: (text: string, isFinal: boolean) => void,
 *   onSpeechDetected?: (info: { source: string, text?: string, rms?: number }) => void,
 *   shouldDetectBarge?: () => boolean,
 *   bargeWhilePaused?: boolean,
 *   onState?: (on: boolean) => void,
 *   onError?: (code: string) => void,
 *   silenceMs?: number,
 *   maxUtteranceMs?: number,
 * }} opts
 */
export function createMicCapture(opts = {}) {
  const Rec =
    globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
  const cloudSttUrl = opts.cloudSttUrl || null;
  const recorderMime = pickRecorderMimeType();
  const canCloudStt =
    Boolean(cloudSttUrl) &&
    Boolean(globalThis.navigator?.mediaDevices?.getUserMedia) &&
    Boolean(recorderMime || globalThis.MediaRecorder);

  let desired = false;
  let pauseDepth = 0;
  let permissionPrimed = false;

  /** @type {SpeechRecognition | null} */
  let recognition = null;
  let recognitionActive = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let restartTimer = null;

  /** @type {MediaStream | null} */
  let recordStream = null;
  /** @type {MediaRecorder | null} */
  let mediaRecorder = null;
  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let silenceTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let maxUtteranceTimer = null;
  /** @type {BlobPart[]} */
  let recordChunks = [];
  let cloudLoopActive = false;
  let cloudTranscribing = false;
  let cloudSpeechSignalFired = false;
  let lastBargeEmitAt = 0;

  const silenceMs = opts.silenceMs ?? 1400;
  const maxUtteranceMs = opts.maxUtteranceMs ?? 12000;

  const shouldListen = () =>
    desired && pauseDepth === 0 && (Boolean(Rec) || canCloudStt);

  const clearRestart = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  };

  const haltRecognition = () => {
    clearRestart();
    recognitionActive = false;
    const rec = recognition;
    recognition = null;
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

  const stopCloudTimers = () => {
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
    if (maxUtteranceTimer) {
      clearTimeout(maxUtteranceTimer);
      maxUtteranceTimer = null;
    }
  };

  const releaseRecordStream = () => {
    stopCloudTimers();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorder = null;
    recordChunks = [];
    if (recordStream) {
      for (const track of recordStream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
    }
    recordStream = null;
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    cloudLoopActive = false;
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || "");
        const b64 = dataUrl.split(",")[1] || "";
        resolve(b64);
      };
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsDataURL(blob);
    });

  const transcribeCloudBlob = async (blob) => {
    if (!cloudSttUrl || !blob?.size) return;
    cloudTranscribing = true;
    try {
      const audio = await blobToBase64(blob);
      const res = await fetch(cloudSttUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio,
          mimeType: blob.type || recorderMime || "audio/webm",
          lang: opts.lang || "zh-HK",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        opts.onError?.(data.code || data.error || `stt-http-${res.status}`);
        return;
      }
      const text = String(data.text || "").trim();
      if (text) opts.onText?.(text, true);
    } catch (err) {
      opts.onError?.(err?.message || "stt-failed");
    } finally {
      cloudTranscribing = false;
    }
  };

  const finishCloudUtterance = async () => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;
    const rec = mediaRecorder;
    const mime = recorderMime || "audio/webm";
    await new Promise((resolve) => {
      rec.onstop = () => resolve();
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    const blob = new Blob(recordChunks, { type: mime });
    recordChunks = [];
    mediaRecorder = null;
    if (blob.size > 800) {
      await transcribeCloudBlob(blob);
    }
  };

  const beginCloudUtterance = async () => {
    if (!canCloudStt || !shouldListen() || cloudTranscribing) return;
    releaseRecordStream();
    cloudLoopActive = true;
    try {
      recordStream = await globalThis.navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        opts.onError?.("not-allowed");
      } else if (name === "NotFoundError") {
        opts.onError?.("no-mic");
      } else {
        opts.onError?.(err?.message || "mic-error");
      }
      desired = false;
      opts.onState?.(false);
      return;
    }

    recordChunks = [];
    cloudSpeechSignalFired = false;
    mediaRecorder = new MediaRecorder(
      recordStream,
      recorderMime ? { mimeType: recorderMime } : undefined,
    );
    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data?.size) recordChunks.push(ev.data);
    };
    mediaRecorder.start(250);

    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(recordStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let silentSince = Date.now();
    let heardSpeech = false;

    silenceTimer = setInterval(() => {
      if (!shouldListen() || !mediaRecorder) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i += 1) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      if (rms > 0.011) {
        heardSpeech = true;
        silentSince = Date.now();
        const bargeMode = opts.shouldDetectBarge?.() === true;
        const now = Date.now();
        if (bargeMode && now - lastBargeEmitAt > 180) {
          lastBargeEmitAt = now;
          opts.onSpeechDetected?.({ source: "cloud-energy", rms });
        } else if (!cloudSpeechSignalFired) {
          cloudSpeechSignalFired = true;
          opts.onSpeechDetected?.({ source: "cloud-energy", rms });
        }
        return;
      }
      if (heardSpeech && Date.now() - silentSince >= silenceMs) {
        void finishCloudUtterance().then(() => {
          if (shouldListen()) void beginCloudUtterance();
        });
      }
    }, 120);

    maxUtteranceTimer = setTimeout(() => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") return;
      void finishCloudUtterance().then(() => {
        if (shouldListen()) void beginCloudUtterance();
      });
    }, maxUtteranceMs);
  };

  const beginRecognition = () => {
    if (!Rec || !shouldListen()) return;
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
      if (interim) {
        opts.onSpeechDetected?.({ source: "interim", text: interim });
        opts.onText?.(interim, false);
      }
      const trimmed = finalText.trim();
      if (trimmed) opts.onText?.(trimmed, true);
    };

    rec.onerror = (ev) => {
      const code = ev?.error || "mic-error";
      if (SOFT_MIC_ERRORS.has(code)) return;
      opts.onError?.(code);
      if (
        code === "not-allowed" ||
        code === "service-not-allowed" ||
        code === "audio-capture"
      ) {
        desired = false;
        haltRecognition();
        opts.onState?.(false);
      }
    };

    rec.onend = () => {
      recognitionActive = false;
      if (recognition === rec) recognition = null;
      if (shouldListen()) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          beginRecognition();
        }, 160);
      }
    };

    try {
      rec.start();
      recognitionActive = true;
    } catch {
      recognitionActive = false;
      recognition = null;
      if (shouldListen()) {
        restartTimer = setTimeout(() => {
          restartTimer = null;
          beginRecognition();
        }, 280);
      }
    }
  };

  const beginListening = () => {
    if (!shouldListen()) return;
    if (Rec) beginRecognition();
    else if (canCloudStt) void beginCloudUtterance();
  };

  const haltListening = () => {
    haltRecognition();
    releaseRecordStream();
  };

  const setLang = (next) => {
    opts.lang = next || opts.lang || "zh-HK";
    if (recognition) recognition.lang = opts.lang;
    return opts.lang;
  };

  const primePermission = async () => {
    if (permissionPrimed) return true;
    const perm = await requestMicPermission();
    if (!perm.ok) {
      opts.onError?.(perm.reason || "not-allowed");
      return false;
    }
    permissionPrimed = true;
    return true;
  };

  const start = async (startOpts = {}) => {
    if (!Rec && !canCloudStt) {
      opts.onError?.("unsupported");
      return false;
    }
    if (!startOpts.skipPermission) {
      const ok = await primePermission();
      if (!ok) {
        desired = false;
        opts.onState?.(false);
        return false;
      }
    }
    if (desired) {
      if (pauseDepth === 0) beginListening();
      return true;
    }
    desired = true;
    opts.onState?.(true);
    if (pauseDepth === 0) beginListening();
    return true;
  };

  const stop = () => {
    desired = false;
    haltListening();
    opts.onState?.(false);
    return false;
  };

  const pause = () => {
    pauseDepth += 1;
    if (pauseDepth === 1 && !opts.bargeWhilePaused) haltListening();
  };

  const resume = () => {
    pauseDepth = Math.max(0, pauseDepth - 1);
    if (pauseDepth === 0 && desired) beginListening();
  };

  return {
    get on() {
      return desired;
    },
    get listening() {
      return (
        (recognitionActive && pauseDepth === 0) ||
        (cloudLoopActive && pauseDepth === 0)
      );
    },
    get supportsMic() {
      return (
        Boolean(Rec) ||
        canCloudStt ||
        Boolean(globalThis.navigator?.mediaDevices?.getUserMedia)
      );
    },
    get usesCloudStt() {
      return !Rec && canCloudStt;
    },
    primePermission,
    setLang,
    start,
    stop,
    pause,
    resume,
    formatMicError,
  };
}
