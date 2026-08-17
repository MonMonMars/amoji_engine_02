import type { FaceLiveParameter } from "../types.js";
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
  morphs?: {
    jawOpen?: number;
    eyeBlink?: number;
    browInnerUp?: number;
  };
};

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
