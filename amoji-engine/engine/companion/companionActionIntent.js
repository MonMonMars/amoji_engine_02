/**
 * LLM-linked action intent — closest-match suggestions + honest decline.
 */
import {
  PLAYABLE_ACTIONS,
  getActionDef,
  inferActionFromCatalogText,
  resolveAction,
} from "./companionActionCatalog.js";

/** @type {Record<string, string[]>} */
export const ACTION_SIMILARITY = Object.freeze({
  backflip: ["spin", "jump", "dab"],
  flip: ["spin", "jump"],
  fly: ["jump", "stretch", "cheer"],
  swimming: ["wave", "stretch"],
  swim: ["wave", "stretch"],
  cartwheel: ["spin", "dance"],
  handstand: ["yoga", "stretch"],
  pushup: ["squat", "punch"],
  pushups: ["squat", "punch"],
  plank: ["yoga", "stretch"],
  taiji: ["kungfu", "yoga"],
  taichi: ["kungfu", "yoga"],
  breakdance: ["dance", "moonwalk", "spin"],
  ballet: ["dance", "bow"],
  tpose: ["stretch", "peace"],
  superhero: ["cheer", "celebrate"],
  superman: ["cheer", "jump"],
  cat: ["shy", "stretch"],
  dog: ["sit", "wave"],
  bird: ["wave", "stretch"],
  monkey: ["jump", "dance"],
});

const ACTION_REQUEST_RE =
  /做|表演|動作|姿势|pose|move|do a|show me|俾我睇|畀我睇|來個|來個|play|模仿|學|像.*一樣|動一下|擺|跳|舞|拳|踢|跑|走|坐|睡|哭|笑|揮|鞠躬|敬禮|拍手|飛吻|瑜伽|功夫/i;

const IMPOSSIBLE_ACTION_RE =
  /後空翻|空翻|翻筋斗|飛起|飛天|飛翔|潛水|游泳|水底|上天|隱形|穿牆|瞬移|teleport|fly away|fly up|underwater|invisible/i;

/**
 * @param {string | null | undefined} text
 */
export function isActionRequest(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (inferActionFromCatalogText(raw)) return true;
  return ACTION_REQUEST_RE.test(raw);
}

/**
 * @param {string | null | undefined} text
 */
export function isLikelyImpossibleAction(text) {
  return IMPOSSIBLE_ACTION_RE.test(String(text || ""));
}

/**
 * @param {string | null | undefined} text
 * @param {number} [limit]
 */
export function suggestClosestActions(text, limit = 3) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  const direct = resolveAction(raw);
  if (direct && direct !== "stop") {
    return [{ id: direct, score: 1, reason: "direct" }];
  }

  const token = raw.toLowerCase().replace(/[\s_-]+/g, "");
  /** @type {Map<string, number>} */
  const scores = new Map();

  for (const [hint, ids] of Object.entries(ACTION_SIMILARITY)) {
    if (token.includes(hint) || raw.toLowerCase().includes(hint)) {
      ids.forEach((id, idx) => {
        scores.set(id, Math.max(scores.get(id) || 0, 0.9 - idx * 0.15));
      });
    }
  }

  for (const id of PLAYABLE_ACTIONS) {
    if (raw.toLowerCase().includes(id)) {
      scores.set(id, Math.max(scores.get(id) || 0, 0.85));
    }
    const def = getActionDef(id);
    for (const re of def?.keywords || []) {
      const m = raw.match(re);
      if (m) {
        scores.set(id, Math.max(scores.get(id) || 0, 0.5 + m[0].length / 40));
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score, reason: "similarity" }));
}

/**
 * Hidden system hint for the LLM on action turns.
 * @param {string | null | undefined} text
 * @param {boolean} [isEnglish]
 */
export function buildActionLlmContext(text, isEnglish = false) {
  if (!isActionRequest(text)) return "";

  const suggestions = suggestClosestActions(text, 4);
  const impossible = isLikelyImpossibleAction(text);
  const list = suggestions.map((s) => s.id).join(", ") || PLAYABLE_ACTIONS.slice(0, 8).join(", ");

  if (isEnglish) {
    return [
      "Action request detected in the latest user message.",
      impossible
        ? "The requested move may be impossible for this avatar (no flight/teleport/backflip rig)."
        : "Pick the closest supported motion if possible.",
      `Closest supported actions: ${list}.`,
      "Rules: (1) If you can approximate, say so briefly and use the closest [action:…] tag.",
      "(2) If you truly cannot, say honestly that you cannot do it and use [action:none] with NO other action tag.",
      "(3) Never invent action names outside the supported list.",
    ].join(" ");
  }

  return [
    "用家最新訊息係動作/表演要求。",
    impossible
      ? "呢個動作可能超出角色能力（例如飛行、潛水、真正後空翻）。"
      : "請盡量揀最接近嘅支援動作。",
    `建議近似動作：${list}。`,
    "規則：(1) 做得到近似效果就簡短說明，再加最接近嘅 [action:…]。",
    "(2) 真係做不到就坦白講做不到，用 [action:none]，唔好加其他 action tag。",
    "(3) 唔好自創列表以外嘅 action 名。",
  ].join(" ");
}
