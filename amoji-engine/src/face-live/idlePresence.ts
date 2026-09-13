import type { FaceLiveParameter, SakuraExpression } from "../types.js";
import { SAKURA_PARAMETER_IDS } from "./expressions.js";

/** Schema id mirrored from the JS engine idle presence module. */
export const IDLE_PRESENCE_SCHEMA = "amoji.idlePresence.v1";

export type IdlePresenceSample = {
  schema?: string;
  timeSec?: number;
  emotion?: string;
  intensity?: number;
  jawOpen?: number;
  blink?: number;
  lookX?: number;
  lookY?: number;
  speechActive?: boolean;
  visemeHint?: string;
  overrideHud?: string;
  morphs?: {
    jawOpen?: number;
    eyeBlink?: number;
    browInnerUp?: number;
  };
};

export type IdlePresenceOptions = {
  emotion?: string;
  intensity?: number;
  breatheHz?: number;
  lookHz?: number;
  blinkEverySec?: number;
};

/**
 * Sample subtle listen/wait motion for Sakura while not speaking.
 * Keep in sync with `engine/face/idlePresence.js`.
 */
export function sampleIdlePresence(
  timeSec: number,
  opts: IdlePresenceOptions = {},
): IdlePresenceSample {
  const t = Math.max(0, Number(timeSec) || 0);
  const breatheHz = opts.breatheHz ?? 0.22;
  const lookHz = opts.lookHz ?? 0.07;
  const blinkEvery = opts.blinkEverySec ?? 3.6;
  const emotion = opts.emotion || "neutral";
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
    visemeHint: "rest",
    speechActive: false,
    lookX: Number(lookX.toFixed(3)),
    lookY: Number(lookY.toFixed(3)),
    blink: Number(blink.toFixed(3)),
    morphs: {
      jawOpen: Number((0.04 + breath * 0.02).toFixed(3)),
      eyeBlink: blink,
      browInnerUp: emotion === "thinking" ? 0.15 : 0.05 * breath,
    },
    overrideHud: "idle · presence",
  };
}

/** Stateful idle clock for orchestrator / rAF loops. */
export class IdlePresenceClock {
  opts: IdlePresenceOptions;
  timeSec = 0;
  enabled = true;

  constructor(opts: IdlePresenceOptions = {}) {
    this.opts = { ...opts };
  }

  step(dtSec = 1 / 60): IdlePresenceSample {
    if (!this.enabled) return sampleIdlePresence(this.timeSec, this.opts);
    this.timeSec += Math.max(0, dtSec);
    return sampleIdlePresence(this.timeSec, this.opts);
  }

  setEmotion(emotion: string, intensity?: number): void {
    this.opts.emotion = emotion;
    if (intensity != null) this.opts.intensity = intensity;
  }

  reset(): void {
    this.timeSec = 0;
  }
}

export function createIdlePresenceClock(
  opts: IdlePresenceOptions = {},
): IdlePresenceClock {
  return new IdlePresenceClock(opts);
}

/**
 * Map an idle presence sample to Face Live / VTS inject parameters.
 * Keep in sync with `engine/face/idlePresence.js` → `presenceToFaceLiveParams`.
 */
export function presenceToFaceLiveParams(
  presence: IdlePresenceSample = {},
): FaceLiveParameter[] {
  const morphs = presence.morphs ?? {};
  const jaw = Number(morphs.jawOpen ?? presence.jawOpen ?? 0.04);
  const blink = Number(morphs.eyeBlink ?? presence.blink ?? 0);
  const brow = Number(morphs.browInnerUp ?? 0.05);
  const lookX = Number(presence.lookX ?? 0);
  const lookY = Number(presence.lookY ?? 0);
  const eyeOpen = Math.max(0, Math.min(1, 1 - blink));
  const smile =
    presence.emotion === "happy"
      ? 0.45
      : presence.emotion === "sad"
        ? -0.15
        : 0.12;

  return [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: Number(jaw.toFixed(3)) },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: Number(smile.toFixed(3)) },
    { id: SAKURA_PARAMETER_IDS.eyeOpenLeft, value: Number(eyeOpen.toFixed(3)) },
    {
      id: SAKURA_PARAMETER_IDS.eyeOpenRight,
      value: Number(eyeOpen.toFixed(3)),
    },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: Number(brow.toFixed(3)) },
    {
      id: SAKURA_PARAMETER_IDS.browRightY,
      value: Number((brow * 0.85).toFixed(3)),
    },
    { id: SAKURA_PARAMETER_IDS.angleX, value: Number(lookX.toFixed(3)) },
    { id: SAKURA_PARAMETER_IDS.angleY, value: Number(lookY.toFixed(3)) },
  ];
}

/** Convenience: sample + map in one call for orchestrator ticks. */
export function idlePresenceParameters(
  timeSec: number,
  opts: IdlePresenceOptions = {},
): FaceLiveParameter[] {
  return presenceToFaceLiveParams(sampleIdlePresence(timeSec, opts));
}

export type { SakuraExpression };
