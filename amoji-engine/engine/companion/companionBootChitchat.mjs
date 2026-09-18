/**
 * Instant offline replies while the 3D avatar is still loading.
 */
import { buildDemoBootReplyEn } from "./companionDemoDialogue.mjs";
import { localCompanionReply } from "./companionLocalReply.mjs";

export const BOOT_CHITCHAT_SCHEMA = "amoji.companionBootChitchat.v2";

/**
 * @param {{ avatarKind?: string, liteMode?: boolean }} opts
 */
export function isBootChitchatPhase({ avatarKind = "loading", liteMode = false } = {}) {
  if (liteMode) return false;
  return avatarKind === "loading";
}

/**
 * @param {string} message
 * @param {{ isEnglish?: boolean, history?: { role: string, content: string }[], webContext?: string }} [opts]
 */
export function buildBootChitchatReply(
  message,
  { isEnglish = false, history = [], webContext = "" } = {},
) {
  const text = String(message || "").trim();

  if (isEnglish) {
    const demo = buildDemoBootReplyEn(text);
    if (demo) return demo;
    if (webContext) {
      return localCompanionReply(text, history, webContext);
    }
    return buildDemoBootReplyEn("");
  }

  return localCompanionReply(text, history, webContext);
}
