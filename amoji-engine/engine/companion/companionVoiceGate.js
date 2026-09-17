/**
 * Voice gate — decide whether detected audio is the local user speaking
 * vs ambient TV / other voices / brief noise / assistant TTS echo before barge-in.
 */

export const COMPANION_VOICE_GATE_SCHEMA = "amoji.companionVoiceGate.v2";

/**
 * @param {string} text
 */
export function normalizeSpeechForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/[\s.,!?;:'"…—\-~、。！？]/g, "");
}

/**
 * @param {string} text
 */
export function meaningfulSpeechLength(text) {
  return normalizeSpeechForCompare(text).length;
}

/**
 * True when STT text likely picked up the assistant's own voice from the speaker.
 * @param {string} sttText
 * @param {string[]} assistantContexts
 */
export function isLikelyAssistantEcho(sttText, assistantContexts = []) {
  const stt = normalizeSpeechForCompare(sttText);
  if (!stt || stt.length < 2) return false;

  for (const raw of assistantContexts) {
    const assistant = normalizeSpeechForCompare(raw);
    if (!assistant || assistant.length < 4) continue;

    if (stt.length >= 3 && assistant.includes(stt)) return true;

    const tailWindow = assistant.slice(-Math.max(56, stt.length * 3));
    if (stt.length >= 3 && tailWindow.includes(stt)) return true;

    if (stt.length >= 6) {
      const assistantTail = assistant.slice(-Math.min(assistant.length, 36));
      if (assistantTail.length >= 4 && stt.includes(assistantTail)) return true;
    }

    for (let len = Math.min(stt.length, 18); len >= 3; len -= 1) {
      const fragment = stt.slice(0, len);
      if (tailWindow.includes(fragment)) return true;
    }
  }

  return false;
}

/**
 * @param {{
 *   minInterimChars?: number,
 *   minFinalChars?: number,
 *   energyMultiplier?: number,
 *   minSpeechMs?: number,
 *   cooldownMs?: number,
 *   minEnergyFloor?: number,
 *   allowEnergyBarge?: boolean,
 *   maxEchoContexts?: number,
 *   maxEchoChars?: number,
 * }} [opts]
 */
export function createCompanionVoiceGate(opts = {}) {
  const minInterimChars = opts.minInterimChars ?? 1;
  const minFinalChars = opts.minFinalChars ?? 3;
  const energyMultiplier = opts.energyMultiplier ?? 2.8;
  const minSpeechMs = opts.minSpeechMs ?? 220;
  const cooldownMs = opts.cooldownMs ?? 520;
  const minEnergyFloor = opts.minEnergyFloor ?? 0.028;
  const allowEnergyBarge = opts.allowEnergyBarge === true;
  const maxEchoContexts = opts.maxEchoContexts ?? 8;
  const maxEchoChars = opts.maxEchoChars ?? 480;

  let baselineRms = 0.0075;
  /** @type {number[]} */
  let recentRms = [];
  let lastBargeAt = 0;
  /** @type {string[]} */
  let assistantEchoContexts = [];

  const trimEchoContexts = () => {
    while (assistantEchoContexts.length > maxEchoContexts) {
      assistantEchoContexts.shift();
    }
    let total = assistantEchoContexts.reduce((sum, chunk) => sum + chunk.length, 0);
    while (total > maxEchoChars && assistantEchoContexts.length > 1) {
      total -= assistantEchoContexts.shift()?.length || 0;
    }
  };

  const setAssistantEchoContext = (texts) => {
    assistantEchoContexts = (Array.isArray(texts) ? texts : [texts])
      .map((chunk) => String(chunk || "").trim())
      .filter(Boolean);
    trimEchoContexts();
  };

  const appendAssistantEcho = (text) => {
    const chunk = String(text || "").trim();
    if (!chunk) return;
    assistantEchoContexts.push(chunk);
    trimEchoContexts();
  };

  const resetEchoContext = () => {
    assistantEchoContexts = [];
  };

  const observeEnergy = (rms) => {
    const v = Math.max(0, Number(rms) || 0);
    recentRms.push(v);
    if (recentRms.length > 48) recentRms.shift();
    if (v < baselineRms * 1.55) {
      baselineRms = baselineRms * 0.9 + v * 0.1;
    }
    return baselineRms;
  };

  const energyThreshold = () =>
    Math.max(minEnergyFloor, baselineRms * energyMultiplier);

  const isMeaningfulInterim = (text) => {
    const stripped = String(text || "").replace(/[\s.,!?;:'"…—\-~、。！？]/g, "");
    return stripped.length >= minInterimChars;
  };

  const isEnergySource = (source) =>
    source === "mic-energy" ||
    source === "cloud-energy" ||
    source === "energy-barge" ||
    source === "energy";

  /**
   * @param {{
   *   source?: string,
   *   text?: string,
   *   rms?: number,
   *   speechMs?: number,
   * }} info
   */
  const shouldBarge = (info = {}) => {
    const source = String(info.source || "");
    const now = Date.now();
    if (now - lastBargeAt < cooldownMs) {
      return { allow: false, confidence: 0, reason: "cooldown" };
    }

    if (source === "interim-speech" || source === "interim") {
      return { allow: false, confidence: 0.08, reason: "ignore-interim" };
    }

    if (source === "final-speech" || source === "user-speech") {
      const text = String(info.text || "").trim();
      const meaningful = meaningfulSpeechLength(text);
      if (meaningful < minFinalChars) {
        return { allow: false, confidence: 0.1, reason: "final-too-short" };
      }
      if (isLikelyAssistantEcho(text, assistantEchoContexts)) {
        return { allow: false, confidence: 0.06, reason: "assistant-echo" };
      }
      lastBargeAt = now;
      return { allow: true, confidence: 0.94, reason: "stt-final" };
    }

    if (isEnergySource(source) && !allowEnergyBarge) {
      return { allow: false, confidence: 0, reason: "energy-barge-disabled" };
    }

    const rms = Number(info.rms) || 0;
    if (info.rms != null) observeEnergy(rms);
    const speechMs = Number(info.speechMs) || 0;
    const threshold = energyThreshold();

    if (isEnergySource(source)) {
      if (speechMs < minSpeechMs) {
        return { allow: false, confidence: 0.12, reason: "too-brief" };
      }

      const window = recentRms.slice(-10);
      const peak = window.length ? Math.max(...window) : rms;
      const avg =
        window.length
          ? window.reduce((sum, n) => sum + n, 0) / window.length
          : rms;
      const above = rms >= threshold;
      const sustained = speechMs >= minSpeechMs * 1.45 || peak >= threshold * 1.35;
      const userLike =
        above &&
        sustained &&
        (rms >= threshold * 1.45 || peak >= threshold * 1.65 || avg >= threshold * 1.18);

      if (userLike) {
        lastBargeAt = now;
        return {
          allow: true,
          confidence: Math.min(0.88, 0.55 + (rms / threshold) * 0.12),
          reason: "energy-user-like",
        };
      }

      return {
        allow: false,
        confidence: 0.32,
        reason: "ambient-or-other-voice",
      };
    }

    return { allow: false, confidence: 0, reason: "unknown-source" };
  };

  const reset = () => {
    recentRms = [];
    baselineRms = 0.0075;
    lastBargeAt = 0;
    resetEchoContext();
  };

  return {
    schema: COMPANION_VOICE_GATE_SCHEMA,
    observeEnergy,
    shouldBarge,
    reset,
    setAssistantEchoContext,
    appendAssistantEcho,
    resetEchoContext,
    get baselineRms() {
      return baselineRms;
    },
    get threshold() {
      return energyThreshold();
    },
    get echoContexts() {
      return assistantEchoContexts.slice();
    },
    isMeaningfulInterim,
  };
}
