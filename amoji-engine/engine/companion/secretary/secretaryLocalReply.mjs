/**
 * Offline secretary replies with structured [task:]/[memory:]/[ui:] tags for local lab.
 */
import { inferUiIntentFromUserText } from "../companionUiIntent.js";
import { extractMemoryFromMessage } from "./memoryExtract.js";
import { extractTaskFromMessage } from "./taskExtract.js";

export const SECRETARY_LOCAL_REPLY_SCHEMA = "amoji.secretary.localReply.v1";

/**
 * @param {string | null | undefined} system
 */
export function isSecretarySystemPrompt(system) {
  const s = String(system || "").toLowerCase();
  return (
    s.includes("secretary") ||
    s.includes("秘書") ||
    s.includes("[task:") ||
    s.includes("[ui:tab:") ||
    s.includes("amoji secretary")
  );
}

/**
 * @param {string} message
 * @param {string} system
 */
function detectSecretaryLang(message, system) {
  if (/reply in english/i.test(system)) return true;
  if (/用粵語|粵語口語/.test(system)) return false;
  return /[a-z]/i.test(message) && !/[\u4e00-\u9fff]/.test(message);
}

/**
 * @param {import("../companionUiIntent.js").UiIntent} intent
 */
function uiIntentToTag(intent) {
  if (intent.type === "settings") return "[ui:settings]";
  if (intent.type === "voice") return "[ui:voice]";
  if (intent.type === "lang" && intent.value) return `[ui:lang:${intent.value}]`;
  if (intent.type === "character" && intent.value === "pick") return "[ui:character]";
  if (intent.type === "character" && intent.value) {
    return `[ui:character:${intent.value}]`;
  }
  if (intent.value) return `[ui:${intent.type}:${intent.value}]`;
  return "";
}

/**
 * @param {string} message
 * @param {{ isEn?: boolean, now?: number }} [opts]
 */
export function secretaryLocalReply(message, opts = {}) {
  const text = String(message || "").trim();
  const isEn = opts.isEn ?? detectSecretaryLang(text, "");
  const now = opts.now ?? Date.now();

  const taskEx = extractTaskFromMessage(text, { isEn, now });
  if (taskEx.confidence >= 0.75 && taskEx.task?.title) {
    const dueTag = taskEx.task.dueAt
      ? isEn
        ? "|due:tonight"
        : "|due:今晚"
      : "";
    return isEn
      ? `Got it — I'll track that. [task:${taskEx.task.title}${dueTag}] [mood:happy]`
      : `好，我幫你記低。 [task:${taskEx.task.title}${dueTag}] [mood:happy]`;
  }

  const memEx = extractMemoryFromMessage(text, { isEn });
  if (memEx.confidence >= 0.75 && memEx.memory?.text) {
    return isEn
      ? `I'll remember that. [memory:${memEx.memory.text}] [mood:happy]`
      : `記低啦。 [memory:${memEx.memory.text}] [mood:happy]`;
  }

  const doneMatch = isEn
    ? text.match(/\b(?:mark|complete|finish|done with)\s+(?:task[:\s]+)?(.+)/i)
    : text.match(/(?:完成|搞掂|做完)(?:任務)?[：:\s]*(.+)/);
  if (doneMatch?.[1]) {
    const title = doneMatch[1].trim();
    if (title.length >= 2) {
      return isEn
        ? `Done! [task:done:${title}] [mood:happy]`
        : `搞掂！ [task:done:${title}] [mood:happy]`;
    }
  }

  const intents = inferUiIntentFromUserText(text, isEn).filter((i) =>
    ["tab", "mode", "filter", "settings", "voice", "lang", "character"].includes(
      i.type,
    ),
  );
  if (intents.length) {
    const tags = intents.map(uiIntentToTag).filter(Boolean).join("");
    return isEn
      ? `Sure. ${tags} [mood:happy]`
      : `好。${tags} [mood:happy]`;
  }

  return isEn
    ? "I'm here — ask about tasks, memory, or say show my tasks. [mood:happy]"
    : "我喺度 — 可以講任務、記憶，或者話「睇下任務」。 [mood:happy]";
}

/**
 * Pick companion vs secretary offline reply.
 * @param {string} message
 * @param {{ role: string, content: string }[]} history
 * @param {string} webContext
 * @param {string} system
 * @param {(message: string, history?: unknown[], webContext?: string) => string} companionReply
 */
export function pickLocalChatReply(
  message,
  history,
  webContext,
  system,
  companionReply,
) {
  if (isSecretarySystemPrompt(system)) {
    return secretaryLocalReply(message, {
      isEn: detectSecretaryLang(message, system),
    });
  }
  return companionReply(message, history, webContext);
}
