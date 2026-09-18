/**
 * Companion feature toggles — flip here to enable/disable whole subsystems.
 */
import { normalizeCompanionRole } from "../mobile/companionRolePresets.js";

/** Pet HUD, treat shop/feed, tap-to-pet, hunger/hearts economy. */
export const COMPANION_CARE_ENABLED = false;

/**
 * Care UI loads when globally enabled or when the user picks Pet mode.
 * @param {import("../mobile/companionRolePresets.js").CompanionRole | string | null | undefined} role
 */
export function isCompanionCareEnabledForRole(role) {
  if (COMPANION_CARE_ENABLED) return true;
  return normalizeCompanionRole(role) === "pet";
}
