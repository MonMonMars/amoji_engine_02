/**
 * Resolve which body action to play from user text + LLM reply (with fallbacks).
 */
import { inferActionFromCatalogText } from "./companionActionCatalog.js";
import {
  inferActionFromReply,
  inferActionFromUserText,
  isUserStopCommand,
  resolveAction,
} from "./companionActionMotion.js";
import {
  isActionRequest,
  suggestClosestActions,
} from "./companionActionIntent.js";
import { analyzeCompanionReply } from "./companionContentMotion.js";
import { resolveCloudAction } from "./motionPackData.mjs";

export const COMPANION_ACTION_RESOLVE_SCHEMA = "amoji.companionActionResolve.v1";

/**
 * Pick the best action for a chat turn when the LLM omits or weakens tags.
 * @param {string | null | undefined} userText
 * @param {string | null | undefined} replyText
 * @param {string | null | undefined} [moodHint]
 */
export function resolveTurnPerformance(userText, replyText, moodHint = null) {
  const content = analyzeCompanionReply(replyText, moodHint);

  if (content.action === "stop") return content;
  if (content.action && content.action !== "none") return content;

  if (isUserStopCommand(userText)) {
    return { ...content, action: "stop" };
  }

  const replyInferred =
    inferActionFromCatalogText(content.reply) ||
    resolveCloudAction(content.reply) ||
    inferActionFromReply(content.reply);
  if (replyInferred && replyInferred !== "none") {
    return { ...content, action: replyInferred };
  }

  if (isActionRequest(userText)) {
    const userAction = inferActionFromUserText(userText);
    if (userAction && userAction !== "stop" && userAction !== "none") {
      return { ...content, action: userAction };
    }
    const closest = suggestClosestActions(userText, 1)[0];
    if (closest?.id) {
      return { ...content, action: closest.id };
    }
  }

  return content;
}

/**
 * @param {string | null | undefined} partialReply
 */
export function resolveStreamingAction(partialReply) {
  const match = String(partialReply || "").match(/\[action:(\w+)\]/i);
  if (!match) return null;
  const action = resolveAction(match[1]);
  if (!action || action === "none" || action === "stop") return null;
  return action;
}
