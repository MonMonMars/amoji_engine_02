/** @typedef {{ speaking?: boolean, assistantOutputActive?: boolean, thinkingLoopOn?: boolean }} CompanionVoiceLike */

export const COMPANION_POKE_TAP_POLICY_SCHEMA =
  "amoji.companionPokeTapPolicy.v1";

/**
 * True when the companion is outputting speech or a turn is in flight — poke should not add voice/dialogue.
 * @param {{ voice?: CompanionVoiceLike | null, busy?: boolean }} ctx
 */
export function isCompanionAssistantSpeaking(ctx = {}) {
  const voice = ctx.voice;
  const busy = Boolean(ctx.busy);
  return Boolean(
    busy ||
      voice?.speaking ||
      voice?.assistantOutputActive ||
      voice?.thinkingLoopOn,
  );
}

/**
 * @param {{ voice?: CompanionVoiceLike | null, busy?: boolean }} ctx
 * @returns {"body-only" | "full"}
 */
export function resolveCompanionPokeTapMode(ctx = {}) {
  return isCompanionAssistantSpeaking(ctx) ? "body-only" : "full";
}
