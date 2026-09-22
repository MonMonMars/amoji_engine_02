/**
 * Secretary productivity layer inside the unified 3D companion app.
 */
import { notifyCompanionMenuOverlayOpened } from "../companionMenuSpeechGate.js";
import { buildTodayBriefing } from "./briefing.js";
import { parseSecretaryReply } from "./replyParser.js";
import {
  applyPreferenceActions,
  applyTaskActions,
} from "./secretaryTagActions.js";
import { createTask, listActiveTasks } from "./taskStore.js";
import { addMemoryFact, readMemoryStore } from "./memoryStore.js";
import {
  modeLabel,
  persistSecretaryMode,
  readSecretaryMode,
} from "./modePresets.js";
import {
  readReminderPrefs,
  requestReminderPermission,
  startReminderLoop,
} from "./reminders.js";

export const COMPANION_SECRETARY_BRIDGE_SCHEMA = "amoji.companionSecretaryBridge.v1";

/**
 * @param {Document} doc
 */
function ensureSecretaryStyles(doc) {
  if (doc.getElementById("companion-secretary-styles")) return;
  const style = doc.createElement("style");
  style.id = "companion-secretary-styles";
  style.textContent = `
    .secretary-overlay {
      position: fixed;
      inset: 0;
      z-index: 120;
      pointer-events: none;
    }
    .secretary-overlay.is-open { pointer-events: auto; }
    .secretary-overlay__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(4, 8, 16, 0.55);
      opacity: 0;
      transition: opacity 0.22s ease;
    }
    .secretary-overlay.is-open .secretary-overlay__backdrop { opacity: 1; }
    .secretary-sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: min(72dvh, 560px);
      border-radius: 20px 20px 0 0;
      background: linear-gradient(180deg, rgba(18, 24, 38, 0.98), rgba(10, 14, 24, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.08);
      transform: translateY(105%);
      transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.45);
    }
    .secretary-overlay.is-open .secretary-sheet { transform: translateY(0); }
    .secretary-sheet__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .secretary-sheet__title {
      margin: 0;
      font: 600 15px/1.2 system-ui, sans-serif;
      color: #f7f1e8;
    }
    .secretary-sheet__close {
      border: 0;
      background: rgba(255, 255, 255, 0.08);
      color: #f7f1e8;
      border-radius: 999px;
      width: 32px;
      height: 32px;
      cursor: pointer;
    }
    .secretary-sheet__body {
      padding: 12px 16px 20px;
      overflow: auto;
      color: #e8e0d4;
      font: 14px/1.45 system-ui, sans-serif;
    }
    .secretary-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .secretary-card h3 {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
    }
    .secretary-task {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .secretary-task:last-child { border-bottom: 0; }
    .secretary-task__title { flex: 1; }
    .secretary-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .secretary-chip {
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.05);
      color: #f7f1e8;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    .secretary-chip.is-active {
      background: rgba(120, 180, 255, 0.18);
      border-color: rgba(120, 180, 255, 0.45);
    }
    .settings-secretary-section {
      display: grid;
      gap: 8px;
      margin-bottom: 4px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .settings-secretary-section[hidden] {
      display: none !important;
    }
    .settings-secretary-nav .btn-secondary {
      flex: 1 1 calc(33.333% - 0.35rem);
      min-width: 0;
      font-size: 0.72rem;
      padding: 0.5rem 0.45rem;
    }
    .settings-secretary-mode-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .settings-role-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .settings-role-btn.is-active {
      border-color: rgba(120, 180, 255, 0.55);
      background: rgba(120, 180, 255, 0.16);
    }
  `;
  doc.head.appendChild(style);
}

/**
 * @param {{
 *   doc?: Document,
 *   isEnglish?: boolean,
 *   storage?: Storage | null,
 *   activityRail?: { startTaskProcess?: () => void, advanceProcess?: (id: string) => void, pulse?: (icon: string, label: string) => void },
 *   onToast?: (msg: string, kind?: string) => void,
 *   onModeChange?: () => void,
 *   enabled?: boolean,
 * }} [opts]
 */
export function createCompanionSecretaryBridge(opts = {}) {
  const doc = opts.doc || document;
  const isEnglish = Boolean(opts.isEnglish);
  const storage = opts.storage ?? globalThis.localStorage ?? null;
  const activityRail = opts.activityRail || {};
  const onToast = opts.onToast || (() => {});
  const onModeChange = opts.onModeChange || (() => {});
  let active = opts.enabled !== false;

  ensureSecretaryStyles(doc);

  let activePanel = "today";
  let taskFilter = "all";
  let mode = readSecretaryMode(storage);

  const overlay = doc.createElement("div");
  overlay.className = "secretary-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="secretary-overlay__backdrop" data-secretary-close></div>
    <div class="secretary-sheet" role="dialog" aria-modal="true">
      <header class="secretary-sheet__head">
        <h2 class="secretary-sheet__title" id="secretary-sheet-title"></h2>
        <button type="button" class="secretary-sheet__close" data-secretary-close aria-label="Close">✕</button>
      </header>
      <div class="secretary-sheet__body" id="secretary-sheet-body"></div>
    </div>
  `;
  doc.body.appendChild(overlay);

  const titleEl = overlay.querySelector("#secretary-sheet-title");
  const bodyEl = overlay.querySelector("#secretary-sheet-body");

  const strings = isEnglish
    ? {
        today: "Today",
        tasks: "Tasks",
        chat: "Chat",
        noTasks: "No open tasks",
        top3: "Today's Top 3",
        all: "All",
        work: "Work",
        life: "Life",
        personal: "Personal",
        taskAdded: "Task saved",
        memorySaved: "Saved to memory",
        draftCopied: "Draft copied",
        memoryTitle: "Saved memories",
        memoryEmpty: "No saved memories yet — tell me what to remember.",
        chatHint: "Talk or type below — I will capture tasks and memories automatically.",
        me: "Me",
      }
    : {
        today: "今日",
        tasks: "任務",
        chat: "傾計",
        noTasks: "暫時未有任務",
        top3: "今日 Top 3",
        all: "全部",
        work: "工作",
        life: "生活",
        personal: "個人",
        taskAdded: "已加入任務",
        memorySaved: "已加入記憶",
        draftCopied: "草稿已複製",
        memoryTitle: "已記住嘅資料",
        memoryEmpty: "暫時未有記憶 — 同我講想記住咩。",
        chatHint: "下面講或者打字 — 我會自動記任務同記憶。",
        me: "我",
      };

  const renderTasksList = () => {
    const tasks = listActiveTasks({ storage }).filter((task) => {
      if (taskFilter === "all") return true;
      return String(task.category || "personal").toLowerCase() === taskFilter;
    });
    if (!tasks.length) {
      return `<p>${strings.noTasks}</p>`;
    }
    return tasks
      .map(
        (task) =>
          `<div class="secretary-task"><span class="secretary-task__title">${escapeHtml(task.title)}</span></div>`,
      )
      .join("");
  };

  const renderToday = () => {
    const briefing = buildTodayBriefing({ isEn: isEnglish, storage });
    const top3 =
      briefing.priorityTasks?.length > 0
        ? briefing.priorityTasks
            .map((t) => `<div class="secretary-task"><span>${escapeHtml(t.title)}</span></div>`)
            .join("")
        : `<p>${isEnglish ? "Pin up to 3 priorities from Tasks." : "喺任務度 pin 最多 3 項重點。"}</p>`;
    return `
      <div class="secretary-card">
        <h3>${escapeHtml(briefing.headline || strings.today)}</h3>
        <p>${escapeHtml(briefing.summary || "")}</p>
        ${renderModeRow()}
      </div>
      <div class="secretary-card">
        <h3>${strings.top3}</h3>
        ${top3}
      </div>
      <div class="secretary-card">
        <h3>${isEnglish ? "Due today" : "今日到期"}</h3>
        ${
          briefing.dueToday?.length
            ? briefing.dueToday
                .map((t) => `<div class="secretary-task"><span>${escapeHtml(t.title)}</span></div>`)
                .join("")
            : `<p>${isEnglish ? "Nothing due today." : "今日冇到期任務。"}</p>`
        }
      </div>
    `;
  };

  const renderTasks = () => {
    const filters = ["all", "work", "life", "personal"];
    const chips = filters
      .map(
        (id) =>
          `<button type="button" class="secretary-chip${taskFilter === id ? " is-active" : ""}" data-task-filter="${id}">${strings[id] || id}</button>`,
      )
      .join("");
    return `
      <div class="secretary-chip-row">${chips}</div>
      <div class="secretary-card" style="margin-top:12px">${renderTasksList()}</div>
    `;
  };

  const renderPanel = () => {
    if (!bodyEl || !titleEl) return;
    if (activePanel === "tasks") {
      titleEl.textContent = strings.tasks;
      bodyEl.innerHTML = renderTasks();
    } else if (activePanel === "chat") {
      titleEl.textContent = strings.chat;
      bodyEl.innerHTML = `<p>${strings.chatHint}</p>`;
    } else if (activePanel === "me") {
      titleEl.textContent = strings.me;
      const facts = readMemoryStore(storage).facts || [];
      bodyEl.innerHTML = `
        <div class="secretary-card">
          <h3>${strings.memoryTitle}</h3>
          ${
            facts.length
              ? facts
                  .slice(0, 12)
                  .map((f) => `<div class="secretary-task"><span>${escapeHtml(f.text || f)}</span></div>`)
                  .join("")
              : `<p>${strings.memoryEmpty}</p>`
          }
        </div>`;
    } else {
      titleEl.textContent = strings.today;
      bodyEl.innerHTML = renderToday();
    }
    bodyEl.querySelectorAll("[data-task-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        taskFilter = btn.getAttribute("data-task-filter") || "all";
        renderPanel();
      });
    });
    bodyEl.querySelectorAll("[data-secretary-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-secretary-mode");
        if (!next) return;
        mode = next;
        persistSecretaryMode(mode, storage);
        renderPanel();
        syncSettingsModeRow();
        onModeChange();
      });
    });
  };

  const openPanel = (panelId = "today") => {
    if (!active) return;
    activePanel = panelId;
    renderPanel();
    overlay.hidden = false;
    notifyCompanionMenuOverlayOpened();
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    doc.body?.classList?.add("secretary-panel-open");
  };

  const closePanel = () => {
    overlay.classList.remove("is-open");
    doc.body?.classList?.remove("secretary-panel-open");
    setTimeout(() => {
      if (!overlay.classList.contains("is-open")) overlay.hidden = true;
    }, 280);
  };

  overlay.querySelectorAll("[data-secretary-close]").forEach((el) => {
    el.addEventListener("click", closePanel);
  });

  const renderModeRow = () => {
    const modes = ["work", "life", "chill"];
    const chips = modes
      .map(
        (id) =>
          `<button type="button" class="secretary-chip${mode === id ? " is-active" : ""}" data-secretary-mode="${id}">${modeLabel(id, isEnglish)}</button>`,
      )
      .join("");
    return `<div class="secretary-chip-row">${chips}</div>`;
  };

  const syncSettingsModeRow = () => {
    const modeRow = doc.getElementById("settings-secretary-mode-row");
    if (!modeRow) return;
    const modes = ["work", "life", "chill"];
    modeRow.innerHTML = modes
      .map(
        (id) =>
          `<button type="button" class="secretary-chip${mode === id ? " is-active" : ""}" data-settings-secretary-mode="${id}">${modeLabel(id, isEnglish)}</button>`,
      )
      .join("");
    modeRow.querySelectorAll("[data-settings-secretary-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-settings-secretary-mode");
        if (!next || next === mode) return;
        mode = next;
        persistSecretaryMode(mode, storage);
        syncSettingsModeRow();
        if (activePanel === "today") renderPanel();
        onModeChange();
      });
    });
  };

  const syncSettingsMenu = () => {
    const section = doc.getElementById("settings-secretary-section");
    const modeLabel = doc.getElementById("settings-secretary-mode-label");
    const title = doc.getElementById("settings-secretary-title");
    if (section) section.hidden = !active;
    if (title) {
      title.textContent = isEnglish ? "Today & tasks" : "今日同任務";
    }
    if (modeLabel) {
      modeLabel.textContent = isEnglish ? "Focus mode" : "專注模式";
    }
    const btnToday = doc.getElementById("settings-btn-secretary-today");
    const btnTasks = doc.getElementById("settings-btn-secretary-tasks");
    const btnMemory = doc.getElementById("settings-btn-secretary-memory");
    if (btnToday) btnToday.textContent = isEnglish ? "Today" : "今日";
    if (btnTasks) btnTasks.textContent = isEnglish ? "Tasks" : "任務";
    if (btnMemory) btnMemory.textContent = isEnglish ? "Memories" : "記憶";
    syncSettingsModeRow();
  };

  if (active) {
    syncSettingsMenu();
    if (readReminderPrefs(storage).enabled) {
      void requestReminderPermission().then(() => {
        startReminderLoop({
          storage,
          isEn: isEnglish,
          onFire: (count) => {
            if (count > 0) {
              onToast(
                isEnglish ? `${count} task reminder(s)` : `${count} 個任務提醒`,
                "info",
              );
            }
          },
        });
      });
    }
  }

  const applyReplyTags = async (rawReply) => {
    if (!active || !rawReply) return null;
    const parsed = parseSecretaryReply(rawReply, { isEn: isEnglish });
    if (parsed.tasks?.length) {
      activityRail.startTaskProcess?.();
      activityRail.advanceProcess?.("hear");
      activityRail.advanceProcess?.("think");
      for (const task of parsed.tasks) {
        createTask(task, { storage });
      }
      activityRail.advanceProcess?.("task");
      activityRail.advanceProcess?.("save");
      onToast(strings.taskAdded, "info");
      renderPanel();
    }
    if (parsed.taskActions?.length) {
      const { results } = applyTaskActions(parsed.taskActions, { storage, isEn: isEnglish });
      if (results.some((r) => r.ok)) renderPanel();
    }
    if (parsed.memories?.length) {
      for (const fact of parsed.memories) {
        addMemoryFact(fact, { storage });
      }
      onToast(strings.memorySaved, "info");
      if (activePanel === "me") renderPanel();
    }
    if (parsed.preferences?.length) {
      applyPreferenceActions(parsed.preferences, { storage });
    }
    if (parsed.drafts?.length) {
      const draft = parsed.drafts[0];
      try {
        await navigator.clipboard?.writeText?.(draft);
        onToast(strings.draftCopied, "info");
      } catch {
        /* ignore */
      }
    }
    return parsed;
  };

  const uiHandlers = {
    switchTab: (tabId) => {
      if (tabId === "chat") {
        closePanel();
        return;
      }
      if (tabId === "today" || tabId === "tasks" || tabId === "me") {
        openPanel(tabId);
      }
    },
    setMode: (nextMode) => {
      if (!["work", "life", "chill"].includes(nextMode)) return;
      mode = nextMode;
      persistSecretaryMode(mode, storage);
      renderPanel();
      syncSettingsModeRow();
    },
    setTaskFilter: (filterId) => {
      if (!["all", "work", "life", "personal"].includes(filterId)) return;
      taskFilter = filterId;
      openPanel("tasks");
      renderPanel();
    },
    onContextChange: (ctx) => {
      if (ctx.tab === "today" || ctx.tab === "tasks" || ctx.tab === "me") {
        openPanel(ctx.tab);
      }
    },
  };

  return {
    get enabled() {
      return active;
    },
    set enabled(next) {
      active = Boolean(next);
      syncSettingsMenu();
    },
    syncSettingsMenu,
    uiHandlers,
    applyReplyTags,
    openPanel,
    closePanel,
    renderToday: () => {
      activePanel = "today";
      renderPanel();
    },
    renderTasks: () => {
      activePanel = "tasks";
      renderPanel();
    },
    get mode() {
      return mode;
    },
  };
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
