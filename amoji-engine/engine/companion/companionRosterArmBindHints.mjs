/**
 * Flagship roster slots where measured bind mis-classifies the authored mesh.
 * Slot #1 Nova and #3 Alicia are photoreal / Alicia Solid A-pose rigs.
 */
export const COMPANION_ROSTER_ARM_BIND_HINTS_SCHEMA =
  "amoji.companionRosterArmBindHints.v1";

/** @type {Readonly<Record<string, "apose" | "tpose">>} */
export const ROSTER_ARM_BIND_OVERRIDES = Object.freeze({
  nova: "apose",
  alicia: "apose",
  shino: "apose",
});

/**
 * @param {string | null | undefined} characterId
 * @returns {"apose" | "tpose" | null}
 */
export function rosterArmBindOverride(characterId) {
  const id = String(characterId || "")
    .trim()
    .toLowerCase();
  if (!id) return null;
  return ROSTER_ARM_BIND_OVERRIDES[id] ?? null;
}
