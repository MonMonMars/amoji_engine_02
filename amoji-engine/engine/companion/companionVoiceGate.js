/**
 * Voice gate — decide whether detected audio is the local user speaking
 * vs ambient TV / other voices / brief noise before barge-in.
 */

export const COMPANION_VOICE_GATE_SCHEMA = "amoji.companionVoiceGate.v1";

/**
 * @param {{
 *   minInterimChars?: number,
 *   energyMultiplier?: number,
 *   minSpeechMs?: number,
 *   cooldownMs?: number,
 *   minEnergyFloor?: number,
 * }} [opts]
 */
export function createCompanionVoiceGate(opts = {}) {
  const minInterimChars = opts.minInterimChars ?? 2;
  const energyMultiplier = opts.energyMultiplier ?? 2.75;
  const minSpeechMs = opts.minSpeechMs ?? 110;
  const cooldownMs = opts.cooldownMs ?? 360;
  const minEnergyFloor = opts.minEnergyFloor ?? 0.017;

  let baselineRms = 0.0075;
  /** @type {number[]} */
  let recentRms = [];
  let lastBargeAt = 0;

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
      if (isMeaningfulInterim(info.text)) {
        lastBargeAt = now;
        return { allow: true, confidence: 0.96, reason: "stt-interim" };
      }
      return { allow: false, confidence: 0.18, reason: "interim-too-short" };
    }

    const rms = Number(info.rms) || 0;
    if (info.rms != null) observeEnergy(rms);
    const speechMs = Number(info.speechMs) || 0;
    const threshold = energyThreshold();

    if (
      source === "mic-energy" ||
      source === "cloud-energy" ||
      source === "energy-barge" ||
      source === "energy"
    ) {
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
      const sustained = speechMs >= minSpeechMs * 1.35 || peak >= threshold * 1.2;
      const userLike =
        above &&
        sustained &&
        (rms >= threshold * 1.28 || peak >= threshold * 1.45 || avg >= threshold * 1.05);

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
  };

  return {
    schema: COMPANION_VOICE_GATE_SCHEMA,
    observeEnergy,
    shouldBarge,
    reset,
    get baselineRms() {
      return baselineRms;
    },
    get threshold() {
      return energyThreshold();
    },
  };
}
