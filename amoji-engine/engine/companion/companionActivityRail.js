/**
 * LLM-driven activity rail — simple icons for functions + task process steps.
 */
import { uiIntentLabel } from "./companionUiIntent.js";

export const COMPANION_ACTIVITY_RAIL_SCHEMA = "amoji.companionActivityRail.v1";

/** @typedef {{ id: string, icon: string, label: string }} ActivityStep */

const TAB_ICONS = Object.freeze({
  today: "📅",
  chat: "💬",
  tasks: "✅",
  me: "👤",
});

const MODE_ICONS = Object.freeze({
  work: "💼",
  life: "🏠",
  chill: "😌",
});

const INTENT_ICONS = Object.freeze({
  tab: TAB_ICONS,
  mode: MODE_ICONS,
  character: "🎭",
  settings: "⚙️",
  voice: "🔊",
  lang: "🌐",
  mic: "🎤",
  close: "✕",
  task: "📋",
  memory: "🧠",
  draft: "📝",
  hear: "🎤",
  think: "💭",
  save: "✅",
  show: "👀",
  speak: "🔈",
});

/**
 * @param {import("./companionUiIntentTags.js").UiIntent} intent
 */
export function uiIntentIcon(intent) {
  if (!intent) return "•";
  if (intent.type === "tab") {
    return TAB_ICONS[intent.value || ""] || "📄";
  }
  if (intent.type === "mode") {
    return MODE_ICONS[intent.value || ""] || "🎛️";
  }
  if (intent.type === "lang") {
    return intent.value === "en" ? "🇬🇧" : "🇭🇰";
  }
  return INTENT_ICONS[intent.type] || "•";
}

/**
 * @param {import("./companionUiIntentTags.js").UiIntent} intent
 * @param {boolean} [isEnglish]
 */
export function activityFromIntent(intent, isEnglish = false) {
  if (intent.type === "memory") {
    return {
      icon: INTENT_ICONS.memory,
      label: isEnglish ? "Memory" : "記憶",
      kind: "memory",
    };
  }
  if (intent.type === "task") {
    return {
      icon: INTENT_ICONS.task,
      label: isEnglish ? "Task" : "任務",
      kind: "task",
    };
  }
  const label = uiIntentLabel(intent, isEnglish);
  if (!label && intent.type !== "settings" && intent.type !== "voice") {
    return null;
  }
  const fallback = isEnglish
    ? {
        settings: "Settings",
        voice: "Voice",
        character: "Character",
        mic: "Mic",
        close: "Close",
        lang: "Language",
      }
    : {
        settings: "設定",
        voice: "語音",
        character: "角色",
        mic: "麥克風",
        close: "關閉",
        lang: "語言",
      };
  return {
    icon: uiIntentIcon(intent),
    label: label || fallback[intent.type] || intent.type,
    kind: intent.type,
  };
}

/**
 * @param {boolean} [isEnglish]
 * @returns {ActivityStep[]}
 */
export function buildTaskProcessTemplate(isEnglish = false) {
  return isEnglish
    ? [
        { id: "hear", icon: "🎤", label: "Heard" },
        { id: "think", icon: "💭", label: "Thinking" },
        { id: "task", icon: "📋", label: "Task" },
        { id: "save", icon: "✅", label: "Saved" },
        { id: "show", icon: "👀", label: "Tasks" },
      ]
    : [
        { id: "hear", icon: "🎤", label: "聽到" },
        { id: "think", icon: "💭", label: "諗緊" },
        { id: "task", icon: "📋", label: "任務" },
        { id: "save", icon: "✅", label: "已存" },
        { id: "show", icon: "👀", label: "任務頁" },
      ];
}

/**
 * @param {Document} doc
 * @param {{ isEnglish?: boolean, mount?: HTMLElement | null }} [opts]
 */
export function createCompanionActivityRail(doc = document, opts = {}) {
  const isEnglish = Boolean(opts.isEnglish);
  const mount =
    opts.mount ||
    doc.getElementById("activity-rail-mount") ||
    doc.querySelector("header");

  const root = doc.createElement("div");
  root.className = "activity-rail";
  root.id = "activity-rail";
  root.hidden = true;

  const functionsRow = doc.createElement("div");
  functionsRow.className = "activity-rail__functions";
  functionsRow.setAttribute("aria-label", isEnglish ? "Active functions" : "目前功能");

  const processRow = doc.createElement("div");
  processRow.className = "activity-rail__process";
  processRow.hidden = true;

  const feedRow = doc.createElement("div");
  feedRow.className = "activity-rail__feed";

  root.append(functionsRow, processRow, feedRow);

  if (mount?.parentElement) {
    mount.insertAdjacentElement("afterend", root);
  } else {
    doc.body.prepend(root);
  }

  /** @type {Map<string, HTMLElement>} */
  const functionChips = new Map();
  /** @type {ActivityStep[]} */
  let processSteps = [];
  let processIndex = -1;
  /** @type {{ icon: string, label: string }[]} */
  let feedItems = [];

  const renderFunctions = () => {
    functionsRow.replaceChildren(...functionChips.values());
    root.hidden = functionChips.size === 0 && processRow.hidden && !feedItems.length;
  };

  const makeChip = (className, icon, label) => {
    const chip = doc.createElement("span");
    chip.className = className;
    const iconEl = doc.createElement("span");
    iconEl.className = "activity-chip__icon";
    iconEl.setAttribute("aria-hidden", "true");
    iconEl.textContent = icon;
    const labelEl = doc.createElement("span");
    labelEl.className = "activity-chip__label";
    labelEl.textContent = label;
    chip.append(iconEl, labelEl);
    return chip;
  };

  const renderFeed = () => {
    feedRow.replaceChildren(
      ...feedItems.map((item) =>
        makeChip("activity-chip activity-chip--feed", item.icon, item.label),
      ),
    );
    root.hidden = functionChips.size === 0 && processRow.hidden && !feedItems.length;
  };

  const renderProcess = () => {
    if (!processSteps.length) {
      processRow.hidden = true;
      processRow.replaceChildren();
      renderFunctions();
      return;
    }
    processRow.hidden = false;
    processRow.replaceChildren(
      ...processSteps.map((step, idx) => {
        const el = doc.createElement("span");
        const state =
          idx < processIndex
            ? "done"
            : idx === processIndex
              ? "active"
              : "pending";
        el.className = `activity-step activity-step--${state}`;
        el.dataset.stepId = step.id;
        const iconEl = doc.createElement("span");
        iconEl.className = "activity-step__icon";
        iconEl.setAttribute("aria-hidden", "true");
        iconEl.textContent = step.icon;
        const labelEl = doc.createElement("span");
        labelEl.className = "activity-step__label";
        labelEl.textContent = step.label;
        el.append(iconEl, labelEl);
        if (idx < processSteps.length - 1) {
          const arrow = doc.createElement("span");
          arrow.className = "activity-step__arrow";
          arrow.textContent = "→";
          arrow.setAttribute("aria-hidden", "true");
          const wrap = doc.createElement("span");
          wrap.className = "activity-step-wrap";
          wrap.append(el, arrow);
          return wrap;
        }
        return el;
      }),
    );
    root.hidden = false;
  };

  /**
   * @param {import("./companionUiIntentTags.js").UiIntent[]} intents
   */
  const showFunctions = (intents = []) => {
    for (const intent of intents) {
      const activity = activityFromIntent(intent, isEnglish);
      if (!activity) continue;
      const key = `${intent.type}:${intent.value || ""}`;
      const chip = makeChip(
        "activity-chip activity-chip--function",
        activity.icon,
        activity.label,
      );
      chip.dataset.kind = intent.type;
      chip.dataset.value = intent.value || "";
      functionChips.set(key, chip);
    }
    renderFunctions();
  };

  /**
   * @param {string} stepId
   * @param {{ detail?: string }} [opts2]
   */
  const advanceProcess = (stepId, opts2 = {}) => {
    const idx = processSteps.findIndex((s) => s.id === stepId);
    if (idx >= 0) processIndex = idx;
    if (opts2.detail && idx >= 0) {
      const step = processSteps[idx];
      processSteps[idx] = { ...step, label: opts2.detail };
    }
    renderProcess();
  };

  const startTaskProcess = () => {
    processSteps = buildTaskProcessTemplate(isEnglish);
    processIndex = 0;
    renderProcess();
  };

  const clearProcess = () => {
    processSteps = [];
    processIndex = -1;
    renderProcess();
  };

  /**
   * @param {string} icon
   * @param {string} label
   */
  const pulse = (icon, label) => {
    feedItems = [{ icon, label }, ...feedItems].slice(0, 3);
    renderFeed();
    window.setTimeout(() => {
      feedItems = feedItems.filter((f) => f.label !== label || f.icon !== icon);
      renderFeed();
    }, 4200);
  };

  return {
    root,
    showFunctions,
    startTaskProcess,
    advanceProcess,
    clearProcess,
    pulse,
    showTaskFlow: (title) => {
      startTaskProcess();
      advanceProcess("hear");
      advanceProcess("think");
      advanceProcess("task", { detail: title });
    },
    completeTaskFlow: (title) => {
      advanceProcess("save", { detail: isEnglish ? "Saved" : "已存" });
      advanceProcess("show");
      pulse("✅", title);
      window.setTimeout(() => clearProcess(), 5000);
    },
  };
}
