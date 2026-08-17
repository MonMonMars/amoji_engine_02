/**
 * Idle presence — subtle listen/wait motion for Sakura while not speaking.
 * Call `sampleIdlePresence(t)` each rAF frame and push into FaceLiveDriver /
 * VoiceRobotBridge when chat is idle.
 */
export const IDLE_PRESENCE_SCHEMA = 'amoji.idlePresence.v1';

/**
 * @param {number} timeSec
 * @param {{
 *   emotion?: string,
 *   intensity?: number,
 *   breatheHz?: number,
 *   lookHz?: number,
 *   blinkEverySec?: number,
 * }} [opts]
 */
export function sampleIdlePresence(timeSec, opts = {}) {
  const t = Math.max(0, Number(timeSec) || 0);
  const breatheHz = opts.breatheHz ?? 0.22;
  const lookHz = opts.lookHz ?? 0.07;
  const blinkEvery = opts.blinkEverySec ?? 3.6;
  const emotion = opts.emotion || 'neutral';
  const baseInt = opts.intensity ?? 0.42;

  const breath = 0.5 + 0.5 * Math.sin(t * breatheHz * Math.PI * 2);
  const lookX = 0.18 * Math.sin(t * lookHz * Math.PI * 2);
  const lookY = 0.08 * Math.sin(t * lookHz * 0.7 * Math.PI * 2 + 1.2);
  const blinkPhase = (t % blinkEvery) / blinkEvery;
  const blink = blinkPhase > 0.92 ? Math.min(1, (blinkPhase - 0.92) / 0.04) : 0;

  return {
    schema: IDLE_PRESENCE_SCHEMA,
    timeSec: Number(t.toFixed(3)),
    emotion,
    intensity: Number((baseInt + breath * 0.06).toFixed(3)),
    jawOpen: Number((0.04 + breath * 0.02).toFixed(3)),
    visemeHint: 'rest',
    speechActive: false,
    lookX: Number(lookX.toFixed(3)),
    lookY: Number(lookY.toFixed(3)),
    blink: Number(blink.toFixed(3)),
    morphs: {
      jawOpen: Number((0.04 + breath * 0.02).toFixed(3)),
      eyeBlink: blink,
      browInnerUp: emotion === 'thinking' ? 0.15 : 0.05 * breath,
    },
    overrideHud: 'idle · presence',
  };
}

/**
 * Stateful idle clock for orchestrator / lab rAF loops.
 */
export class IdlePresenceClock {
  /**
   * @param {{ emotion?: string, intensity?: number }} [opts]
   */
  constructor(opts = {}) {
    this.opts = { ...opts };
    this.timeSec = 0;
    this.enabled = true;
  }

  /**
   * @param {number} dtSec
   */
  step(dtSec = 1 / 60) {
    if (!this.enabled) return sampleIdlePresence(this.timeSec, this.opts);
    this.timeSec += Math.max(0, dtSec);
    return sampleIdlePresence(this.timeSec, this.opts);
  }

  setEmotion(emotion, intensity) {
    this.opts.emotion = emotion;
    if (intensity != null) this.opts.intensity = intensity;
  }

  reset() {
    this.timeSec = 0;
  }
}

export function createIdlePresenceClock(opts = {}) {
  return new IdlePresenceClock(opts);
}
