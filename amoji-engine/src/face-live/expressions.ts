import type { FaceLiveParameter, SakuraExpression } from "../types.js";

/** Sakura Face Live parameter ids (Live2D / VTube Studio compatible). */
export const SAKURA_PARAMETER_IDS = {
  mouthOpen: "ParamMouthOpenY",
  mouthSmile: "ParamMouthSmile",
  eyeOpenLeft: "ParamEyeLOpen",
  eyeOpenRight: "ParamEyeROpen",
  browLeftY: "ParamBrowLY",
  browRightY: "ParamBrowRY",
  cheek: "ParamCheek",
  angleX: "ParamAngleX",
  angleY: "ParamAngleY",
  angleZ: "ParamAngleZ",
} as const;

/** Expression presets mapped to injectable face parameters. */
export const SAKURA_EXPRESSION_PRESETS: Record<
  SakuraExpression,
  FaceLiveParameter[]
> = {
  neutral: [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: 0 },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: 0.15 },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: 0 },
    { id: SAKURA_PARAMETER_IDS.browRightY, value: 0 },
    { id: SAKURA_PARAMETER_IDS.cheek, value: 0 },
  ],
  happy: [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: 0.35 },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: 0.85 },
    { id: SAKURA_PARAMETER_IDS.cheek, value: 0.6 },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: 0.1 },
    { id: SAKURA_PARAMETER_IDS.browRightY, value: 0.1 },
  ],
  surprised: [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: 0.7 },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: 0 },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: 0.8 },
    { id: SAKURA_PARAMETER_IDS.browRightY, value: 0.8 },
    { id: SAKURA_PARAMETER_IDS.eyeOpenLeft, value: 1 },
    { id: SAKURA_PARAMETER_IDS.eyeOpenRight, value: 1 },
  ],
  thinking: [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: 0.05 },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: 0 },
    { id: SAKURA_PARAMETER_IDS.angleY, value: -0.15 },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: 0.35 },
    { id: SAKURA_PARAMETER_IDS.browRightY, value: 0.1 },
  ],
  sad: [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: 0.1 },
    { id: SAKURA_PARAMETER_IDS.mouthSmile, value: -0.4 },
    { id: SAKURA_PARAMETER_IDS.browLeftY, value: -0.5 },
    { id: SAKURA_PARAMETER_IDS.browRightY, value: -0.5 },
    { id: SAKURA_PARAMETER_IDS.angleY, value: 0.1 },
  ],
  blink: [
    { id: SAKURA_PARAMETER_IDS.eyeOpenLeft, value: 0 },
    { id: SAKURA_PARAMETER_IDS.eyeOpenRight, value: 0 },
  ],
};

/** Derive mouth openness from PCM16 RMS for lip-sync. */
export function mouthOpenFromPcm16(
  pcm16: Int16Array,
  sensitivity = 1.5,
): number {
  if (pcm16.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < pcm16.length; i++) {
    const sample = pcm16[i]! / 32768;
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / pcm16.length);
  return Math.min(1, rms * sensitivity);
}

/**
 * Exponential smoothing for lip-sync to avoid jittery mouth motion.
 * `previous` is the last emitted mouth-open value; `alpha` weights the new sample.
 */
export function smoothMouthOpen(
  next: number,
  previous: number,
  alpha = 0.45,
): number {
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return previous * (1 - clampedAlpha) + next * clampedAlpha;
}

/** Build lip-sync parameters from assistant audio (optionally smoothed). */
export function lipSyncParameters(
  pcm16: Int16Array,
  options: { previousMouthOpen?: number; sensitivity?: number; alpha?: number } = {},
): FaceLiveParameter[] {
  const raw = mouthOpenFromPcm16(pcm16, options.sensitivity ?? 1.5);
  const mouthOpen =
    options.previousMouthOpen === undefined
      ? raw
      : smoothMouthOpen(raw, options.previousMouthOpen, options.alpha ?? 0.45);
  return [
    { id: SAKURA_PARAMETER_IDS.mouthOpen, value: mouthOpen },
    {
      id: SAKURA_PARAMETER_IDS.mouthSmile,
      value: mouthOpen > 0.1 ? 0.25 : 0.1,
    },
  ];
}

/** Keyword heuristics for Cantonese/English emotion cues in transcripts. */
export function inferExpressionFromText(text: string): SakuraExpression {
  const lower = text.toLowerCase();
  // Order matters: check sad/thinking before generic punctuation surprises.
  if (/唉|唔開心|傷心|sorry|sad|慘/.test(lower)) return "sad";
  if (/諗|思考|點解|why|hmm|唔知/.test(lower)) return "thinking";
  if (/哈哈|開心|好呀|正|掂|thank|thanks|great|鍾意/.test(lower)) return "happy";
  if (/哇|嘩|唔信|真係|嚇死/.test(text) || /!{2,}|！{2,}/.test(text)) {
    return "surprised";
  }
  return "neutral";
}
