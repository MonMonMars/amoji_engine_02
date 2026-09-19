/**
 * When VRM lookAt.autoUpdate stays on during calm idle, it locks the head to the
 * camera and cancels procedural idle sway — the avatar looks frozen in portrait.
 */
export const COMPANION_VRM_LOOKAT_SCHEMA = "amoji.companionVrmLookAt.v1";

/**
 * @param {{
 *   talking?: boolean,
 *   listening?: boolean,
 *   thinking?: boolean,
 *   activeMotion?: string | null,
 *   currentAction?: string | null,
 * }} opts
 */
export function resolveVrmLookAtAutoUpdate(opts = {}) {
  const talking = Boolean(opts.talking);
  const listening = Boolean(opts.listening);
  const thinking = Boolean(opts.thinking);
  const activeMotion = opts.activeMotion
    ? String(opts.activeMotion)
    : opts.currentAction
      ? String(opts.currentAction)
      : "";
  if (talking || listening) return true;
  if (activeMotion) return false;
  if (thinking) return false;
  return false;
}
