/**
 * Companion feature toggles — flip here to enable/disable whole subsystems.
 */
/** Pet HUD, treat shop/feed, tap-to-pet, hunger/hearts economy. */
export const COMPANION_CARE_ENABLED = false;

/**
 * Care UI (feed, treats, hunger HUD) — off for now; chat/voice only.
 * @param {import("../mobile/companionRolePresets.js").CompanionRole | string | null | undefined} [_role]
 */
export function isCompanionCareEnabledForRole(_role) {
  return COMPANION_CARE_ENABLED;
}
