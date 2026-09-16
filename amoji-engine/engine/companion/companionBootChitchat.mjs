/**
 * Instant offline replies while the 3D avatar is still loading.
 */
import { localCompanionReply } from "./companionLocalReply.mjs";

/**
 * @param {{ avatarKind?: string, liteMode?: boolean }} opts
 */
export function isBootChitchatPhase({ avatarKind = "loading", liteMode = false } = {}) {
  if (liteMode) return false;
  return avatarKind === "loading";
}

/** @type {Record<string, string>} */
const EN_BOOT_SNIPPETS = {
  hello: "Hi! I'm still loading my 3D body — you can chat while I get ready. [action:wave] [mood:happy]",
  howareyou:
    "Doing great! My 3D model is still loading, but I'm here to chat. [mood:happy]",
  who: "I'm Amoji — your anime companion. Still booting my 3D avatar. [action:wave] [mood:happy]",
  bye: "Bye for now! [action:wave] [mood:happy]",
  thanks: "You're welcome! [mood:happy]",
  default:
    "Got it — I'm still loading my 3D body, but I'm listening. [mood:thinking]",
};

/**
 * @param {string} message
 * @param {{ isEnglish?: boolean, history?: { role: string, content: string }[], webContext?: string }} [opts]
 */
export function buildBootChitchatReply(
  message,
  { isEnglish = false, history = [], webContext = "" } = {},
) {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();

  if (isEnglish) {
    if (/^hello|^hi\b|^hey\b/.test(lower)) return EN_BOOT_SNIPPETS.hello;
    if (/how are you|how's it going|what's up/.test(lower)) {
      return EN_BOOT_SNIPPETS.howareyou;
    }
    if (/who are you|what are you/.test(lower)) return EN_BOOT_SNIPPETS.who;
    if (/^bye\b|^goodbye|see you/.test(lower)) return EN_BOOT_SNIPPETS.bye;
    if (/thank/.test(lower)) return EN_BOOT_SNIPPETS.thanks;
    if (webContext) {
      return localCompanionReply(text, history, webContext);
    }
    return EN_BOOT_SNIPPETS.default;
  }

  return localCompanionReply(text, history, webContext);
}
