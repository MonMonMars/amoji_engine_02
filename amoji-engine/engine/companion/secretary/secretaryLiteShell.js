/**
 * Secretary UI shell for amoji-lite (Today / Chat / Tasks / Me).
 * Phase 2: Top 3 priorities, draft cards, memory capture, due reminders.
 */
import {
  buildCompanionHref,
  companionLangCode,
  defaultVoiceForLang,
  persistVoiceId,
  resolveVoiceId,
  syncVoiceToUrl,
  voicePickerButtonLabel,
} from "../companionVoiceCatalog.js";
import { buildExpressiveTtsPlan } from "../companionExpressiveTts.js";
import { createCompanionVoicePicker } from "../companionVoicePicker.js";
import {
  buildCloudTtsRequestBody,
  enrichTtsPerformance,
} from "../companionTtsProsody.js";
import { buildTodayBriefing } from "./briefing.js";
import { extractMemoryFromMessage } from "./memoryExtract.js";
import {
  isPriorityTask,
  removePriorityIfPresent,
  togglePriority,
} from "./prioritiesStore.js";
import { createCompanionActivityRail } from "../companionActivityRail.js";
import {
  closeUiOverlay,
  initCompanionUiEffects,
  openUiOverlay,
  switchUiTabPanel,
} from "../companionUiEffects.js";
import {
  applyUiIntents,
  buildUiIntentPromptFragment,
  inferUiIntentFromUserText,
  mergeUiIntents,
  uiIntentLabel,
} from "../companionUiIntent.js";
import { parseSecretaryReply } from "./replyParser.js";
import {
  applyPreferenceActions,
  applyTaskActions,
} from "./secretaryTagActions.js";
import {
  readReminderPrefs,
  requestReminderPermission,
  saveReminderPrefs,
  startReminderLoop,
} from "./reminders.js";
import {
  addMemoryFact,
  getPreferences,
  memoryFactsForPrompt,
  readLastChatSummary,
  removeMemoryFact,
  readMemoryStore,
  saveLastChatSummary,
  savePreferences,
} from "./memoryStore.js";
import {
  discoverPrompts,
  modeLabel,
  modePromptFragment,
  persistSecretaryMode,
  readSecretaryMode,
} from "./modePresets.js";
import { extractTaskFromMessage } from "./taskExtract.js";
import {
  completeTask,
  createTask,
  deleteTask,
  listActiveTasks,
  snoozeTask,
} from "./taskStore.js";

/**
 * @param {Document} doc
 */
export function initAmojiSecretaryLite(doc = document) {
  const params = new URLSearchParams(globalThis.location?.search || "");
  const langCode = companionLangCode(params.get("lang"));
  const isEn = langCode === "en";
  /** Secretary lite is always chat/voice-driven — no manual chrome. */
  const conversationUi = true;
  doc.body.classList.add("conversation-ui");
  initCompanionUiEffects(doc);
  let voiceId = resolveVoiceId({
    lang: langCode,
    voiceParam: params.get("voice"),
  });
  persistVoiceId(voiceId);

  const hosted =
    globalThis.location?.hostname &&
    globalThis.location.hostname !== "localhost" &&
    globalThis.location.hostname !== "127.0.0.1" &&
    !globalThis.location.hostname.startsWith("192.168.") &&
    !globalThis.location.hostname.endsWith(".local");

  const storage = globalThis.localStorage ?? null;
  let mode = readSecretaryMode(storage);
  let taskFilter = "all";
  let speakerOn = true;
  let micOn = false;
  let busy = false;
  /** @type {import("../companionMicCapture.js").MicCapture | null} */
  let micCapture = null;
  const audioEl = new Audio();
  audioEl.preload = "auto";

  const strings = isEn
    ? {
        appTitle: "Amoji Secretary",
        tabToday: "Today",
        tabChat: "Chat",
        tabTasks: "Tasks",
        tabMe: "Me",
        placeholder: "Type a message…",
        start: "Start chatting",
        statusReady: "Listening — just talk",
        statusListenHint: "Speak, pause — I'll reply and switch views for you",
        statusThinking: "Thinking…",
        statusSpeaking: "Speaking…",
        statusMic: "Listening…",
        welcome: "Hi! I'm your Amoji secretary.",
        errChat: "Chat failed",
        errTts: "TTS failed (reply still shown)",
        errMic: "Mic not available",
        errMicBlocked: "Microphone blocked",
        addTask: "Add task",
        taskPlaceholder: "What should I track?",
        save: "Save",
        memoryPlaceholder: "Add a fact I should remember…",
        morningBrief: "Morning brief",
        tone: "Tone",
        helpWith: "Help with",
        noTasks: "No open tasks",
        complete: "Done",
        snooze: "Snooze 1h",
        delete: "Delete",
        taskSaved: "Task saved",
        taskConfirm: "Add this task?",
        accept: "Add",
        dismiss: "Not now",
        openChat: "Open chat",
        top3Title: "Today's Top 3",
        top3Empty: "Pin up to 3 priorities from Tasks.",
        pinPriority: "📌 Pin to Top 3",
        unpinPriority: "★ In Top 3",
        priorityFull: "Top 3 is full — unpin one first.",
        memoryConfirm: "Save to memory?",
        memorySaved: "Saved to memory",
        draftTitle: "Draft",
        copyDraft: "Copy",
        copied: "Copied!",
        filterAll: "All",
        filterWork: "Work",
        filterLife: "Life",
        filterPersonal: "Personal",
        remindersOn: "Reminders on",
        remindersBlocked: "Notifications blocked in browser settings",
        send: "Send",
        tasksPanelTitle: "Task list",
        memorySection: "Memory",
        taskDone: "Task completed",
        taskSnoozed: "Task snoozed",
        taskRemoved: "Task removed",
        prefsUpdated: "Preferences updated",
        draftCopied: "Draft copied",
        typeFallback: "Type here if mic is unavailable",
        setup: "Setup",
        setupApp: "App",
        setupPrefs: "Preferences",
        closeSetup: "Close setup",
        setupSpeakerOn: "Speaker: on",
        setupSpeakerOff: "Speaker: off",
        setup3d: "3D companion",
        panelMeHint: "Open Setup from the header for language, voice, and preferences.",
      }
    : {
        appTitle: "Amoji 秘書",
        tabToday: "今日",
        tabChat: "傾計",
        tabTasks: "任務",
        tabMe: "我",
        placeholder: "輸入訊息…",
        start: "開始傾計",
        statusReady: "聽緊 — 直接講",
        statusListenHint: "講完停一停 — 我會答同幫你轉頁",
        statusThinking: "諗緊…",
        statusSpeaking: "講緊…",
        statusMic: "聽緊…",
        welcome: "嗨！我係你嘅 Amoji 秘書。",
        errChat: "聊天失敗",
        errTts: "語音失敗（文字回覆已顯示）",
        errMic: "麥克風不可用",
        errMicBlocked: "麥克風被封鎖",
        addTask: "加任務",
        taskPlaceholder: "想我跟進咩？",
        save: "儲存",
        memoryPlaceholder: "加一條我應該記住嘅資料…",
        morningBrief: "早晨簡報",
        tone: "語氣",
        helpWith: "幫手範圍",
        noTasks: "暫時未有任務",
        complete: "完成",
        snooze: "延後1小時",
        delete: "刪除",
        taskSaved: "已加入任務",
        taskConfirm: "加入呢項任務？",
        accept: "加入",
        dismiss: "唔使",
        openChat: "去傾計",
        top3Title: "今日 Top 3",
        top3Empty: "喺「任務」度 pin 最多 3 項重點。",
        pinPriority: "📌 加入今日 Top 3",
        unpinPriority: "★ 已 Pin",
        priorityFull: "Top 3 已滿 — 先取消一項。",
        memoryConfirm: "加入記憶？",
        memorySaved: "已加入記憶",
        draftTitle: "草稿",
        copyDraft: "複製",
        copied: "已複製！",
        filterAll: "全部",
        filterWork: "工作",
        filterLife: "生活",
        filterPersonal: "個人",
        remindersOn: "已開啟到期提醒",
        remindersBlocked: "瀏覽器封鎖咗通知",
        send: "發送",
        tasksPanelTitle: "任務清單",
        memorySection: "記憶",
        taskDone: "任務完成",
        taskSnoozed: "任務延後",
        taskRemoved: "任務已刪除",
        prefsUpdated: "已更新偏好",
        draftCopied: "草稿已複製",
        typeFallback: "麥克風不可用 — 可以打字",
        setup: "設定",
        setupApp: "應用",
        setupPrefs: "偏好",
        closeSetup: "關閉設定",
        setupSpeakerOn: "喇叭：開",
        setupSpeakerOff: "喇叭：關",
        setup3d: "3D 同伴",
        panelMeHint: "喺頂部按「設定」可以改語言、語音同偏好。",
      };

  const els = {
    status: doc.getElementById("status"),
    error: doc.getElementById("error-box"),
    messages: doc.getElementById("messages"),
    start: doc.getElementById("start-btn"),
    composer: doc.getElementById("composer"),
    input: doc.getElementById("input"),
    send: doc.getElementById("send-btn"),
    mic: doc.getElementById("mic-btn"),
    speaker: doc.getElementById("speaker-btn"),
    briefCard: doc.getElementById("brief-card"),
    top3Card: doc.getElementById("top3-card"),
    top3Title: doc.getElementById("top3-title"),
    top3List: doc.getElementById("top3-list"),
    todayTasks: doc.getElementById("today-tasks"),
    taskFilters: doc.getElementById("task-filters"),
    quickTaskInput: doc.getElementById("quick-task-input"),
    quickTaskForm: doc.getElementById("quick-task-form"),
    tasksList: doc.getElementById("tasks-list"),
    memoryList: doc.getElementById("memory-list"),
    memoryInput: doc.getElementById("memory-input"),
    memoryForm: doc.getElementById("memory-form"),
    discover: doc.getElementById("discover-chips"),
    modeRow: doc.getElementById("mode-row"),
    panels: {
      today: doc.getElementById("panel-today"),
      chat: doc.getElementById("panel-chat"),
      tasks: doc.getElementById("panel-tasks"),
      me: doc.getElementById("panel-me"),
    },
    tabs: [...doc.querySelectorAll("[data-tab]")],
    prefMorningBrief: doc.getElementById("pref-morning-brief"),
    prefHelpWith: doc.getElementById("pref-help-with"),
    prefTone: doc.getElementById("pref-tone"),
    prefReminders: doc.getElementById("pref-reminders"),
    setup: doc.getElementById("setup"),
    setupBackdrop: doc.getElementById("setup-backdrop"),
    setupClose: doc.getElementById("setup-close"),
    btnOpenSetup: doc.getElementById("btn-open-setup"),
    setupBtnLang: doc.getElementById("setup-btn-lang"),
    setupBtnVoice: doc.getElementById("setup-btn-voice"),
    setupLink3d: doc.getElementById("setup-link-3d"),
    setupBtnSpeaker: doc.getElementById("setup-btn-speaker"),
  };

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function showError(msg) {
    if (!els.error) return;
    if (!msg) {
      els.error.classList.remove("show");
      els.error.textContent = "";
      return;
    }
    els.error.textContent = String(msg);
    els.error.classList.add("show");
  }

  function addBubble(text, who, extraClass = "") {
    if (!els.messages) return null;
    const div = doc.createElement("div");
    div.className = `bubble ${who}${extraClass ? ` ${extraClass}` : ""}`;
    div.textContent = text;
    els.messages.appendChild(div);
    els.messages.scrollTop = els.messages.scrollHeight;
    return div;
  }

  function buildSystemPrompt() {
    const memory = memoryFactsForPrompt({ storage });
    const prefs = getPreferences({ storage });
    const toneLine = isEn
      ? `Tone: ${prefs.tone}. Help scope: ${prefs.helpWith}.`
      : `語氣：${prefs.tone}。幫手範圍：${prefs.helpWith}。`;
    const base = isEn
      ? "You are Amoji, a warm personal AI secretary with an anime companion personality. Reply in English. Help with work, life admin, and friendly chat. Keep replies short (1–3 sentences)."
      : "你係 Amoji，一個有動漫同伴氣質嘅個人 AI 秘書。用粵語口語回覆。幫手處理工作、生活同傾計。回覆要短（1–3句）。";
    const tagRules = isEn
      ? [
          "The user talks only — never ask them to press buttons or tap UI.",
          "You decide navigation, mode, tasks, and memory via hidden tags; the app applies them automatically.",
          "End every reply with [mood:happy|thinking|sad|surprised|angry].",
          "When the user wants a task (or you suggest one), add [task:Title|due:tonight] — it saves immediately.",
          "When they complete a task, add [task:done:Title]. Snooze: [task:snooze:Title|for:1h]. Delete: [task:delete:Title].",
          "For tone/help scope/briefing/reminders use [pref:tone:friendly], [pref:helpWith:work], [pref:morningBrief:on], [pref:reminders:off].",
          "When the user shares a preference worth remembering, add [memory:short fact] — it saves immediately.",
          "When drafting email/message text, add [draft:copyable text on one line].",
          buildUiIntentPromptFragment(true, { surface: "secretary" }),
        ].join(" ")
      : [
          "用戶只會講嘢 — 唔好叫佢撳掣或撳界面。",
          "導航、模式、任務、記憶都由你用隱藏 tag 決定，app 會自動執行。",
          "每句回覆結尾加 [mood:happy|thinking|sad|surprised|angry]。",
          "用戶要任務（或者你建議任務）時加 [task:標題|due:今晚] — 會即刻儲存。",
          "完成任務加 [task:done:標題]；延後加 [task:snooze:標題|for:1h]；刪除加 [task:delete:標題]。",
          "語氣/範圍/簡報/提醒用 [pref:tone:friendly]、[pref:helpWith:work]、[pref:morningBrief:on]、[pref:reminders:off]。",
          "用戶分享值得記住嘅偏好時加 [memory:短句] — 會即刻儲存。",
          "起草電郵/訊息時加 [draft:可複製文字，一行]。",
          buildUiIntentPromptFragment(false, { surface: "secretary" }),
        ].join(" ");
    const modeLine = modePromptFragment(mode, isEn);
    const memoryLine = memory
      ? isEn
        ? `User memory:\n${memory}`
        : `用戶記憶：\n${memory}`
      : "";
    return [base, toneLine, modeLine, tagRules, memoryLine].filter(Boolean).join("\n\n");
  }

  function bumpProbe(key) {
    const probe = globalThis.__amojiLite;
    if (probe && typeof probe[key] === "number") {
      probe[key] += 1;
    }
  }

  async function cloudReply(message) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, system: buildSystemPrompt() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    bumpProbe("chatCalls");
    const raw = String(data.reply || "");
    return parseSecretaryReply(raw, { isEn });
  }

  async function speakCloud(text, emotion) {
    if (!speakerOn || !text) return;
    setStatus(strings.statusSpeaking);
    try {
      const perf = enrichTtsPerformance(emotion || "neutral", text);
      perf.lang = isEn ? "en" : "yue";
      const plan = buildExpressiveTtsPlan(
        text,
        { ...perf, voiceId },
        "rose",
        isEn ? "en-US" : "zh-HK",
        voiceId,
      );
      const clauses = plan.clauses.length
        ? plan.clauses
        : [{ text, ...perf }];
      for (const clause of clauses) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildCloudTtsRequestBody({
              text: clause.text,
              performance: {
                ...perf,
                emotion: clause.emotion || perf.emotion,
                nuance: clause.nuance || perf.nuance,
                talkStyle: clause.talkStyle || perf.talkStyle,
                speechEnergy: clause.speechEnergy ?? perf.speechEnergy,
              },
              lang: isEn ? "en" : "yue",
              voice: voiceId,
              characterId: "rose",
            }),
          ),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        bumpProbe("ttsCalls");
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty audio");
        const url = URL.createObjectURL(blob);
        audioEl.src = url;
        await audioEl.play();
        await new Promise((resolve) => {
          audioEl.onended = resolve;
          audioEl.onerror = resolve;
          setTimeout(resolve, 30000);
        });
        URL.revokeObjectURL(url);
        if (clause.pauseMs) {
          await new Promise((resolve) => setTimeout(resolve, clause.pauseMs));
        }
      }
    } catch (err) {
      console.warn("[secretary-lite] tts", err);
      showError(`${strings.errTts}: ${err.message || err}`);
    }
    setStatus(conversationUi ? strings.statusListenHint : strings.statusReady);
  }

  function applySecretaryTagEffects(result) {
    if (!result) return;
    if (result.taskActions?.length) {
      const { results, label } = applyTaskActions(result.taskActions, {
        storage,
        isEn,
      });
      for (const r of results) {
        activityRail.pulse(r.ok ? "✅" : "⚠️", label(r));
        if (els.messages) addBubble(label(r), "bot", "receipt");
      }
      renderToday();
      renderTasks();
    }
    if (result.preferences?.length) {
      const patch = applyPreferenceActions(result.preferences, {
        storage,
        onRemindersChange: (on) => {
          if (els.prefReminders) els.prefReminders.checked = on;
        },
      });
      if (Object.keys(patch).length) {
        renderPrefs();
        activityRail.pulse("⚙️", strings.prefsUpdated);
        if (els.messages) {
          addBubble(`✓ ${strings.prefsUpdated}`, "bot", "receipt");
        }
      }
    }
  }

  const activityRail = createCompanionActivityRail(doc, {
    isEnglish: isEn,
    mount: doc.querySelector("header"),
  });

  function applyMemoryDraft(draft) {
    addMemoryFact(draft.text, { storage, category: draft.category || "general" });
    activityRail.pulse("🧠", draft.text);
    activityRail.showFunctions([{ type: "memory", value: "saved" }]);
    if (els.messages) {
      addBubble(`✓ ${strings.memorySaved}: ${draft.text}`, "bot", "receipt");
    }
    renderMemory();
  }

  function applyTaskDraft(draft) {
    activityRail.completeTaskFlow(draft.title);
    createTask(
      {
        title: draft.title,
        dueAt: draft.dueAt ?? null,
        category: draft.category || "personal",
        source: "chat",
      },
      { storage },
    );
    if (els.messages) {
      addBubble(`✓ ${strings.taskSaved}: ${draft.title}`, "bot", "receipt");
    }
    renderToday();
    renderTasks();
  }

  function showMemoryConfirmCard(draft) {
    if (conversationUi) {
      applyMemoryDraft(draft);
      return;
    }
    if (!els.messages) return;
    const card = doc.createElement("div");
    card.className = "memory-card";
    const title = doc.createElement("div");
    title.className = "memory-card-title";
    title.textContent = `${strings.memoryConfirm} “${draft.text}”`;
    const actions = doc.createElement("div");
    actions.className = "task-card-actions";
    const accept = doc.createElement("button");
    accept.type = "button";
    accept.className = "btn mini primary";
    accept.textContent = strings.accept;
    const dismiss = doc.createElement("button");
    dismiss.type = "button";
    dismiss.className = "btn mini";
    dismiss.textContent = strings.dismiss;
    accept.addEventListener("click", () => {
      addMemoryFact(draft.text, { storage, category: draft.category });
      card.replaceWith(
        Object.assign(doc.createElement("div"), {
          className: "bubble bot receipt",
          textContent: `✓ ${strings.memorySaved}`,
        }),
      );
      renderMemory();
    });
    dismiss.addEventListener("click", () => card.remove());
    actions.append(accept, dismiss);
    card.append(title, actions);
    els.messages.appendChild(card);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function showDraftCard(text) {
    if (!els.messages) return;
    const card = doc.createElement("div");
    card.className = "draft-card";
    const title = doc.createElement("div");
    title.className = "draft-card-title";
    title.textContent = strings.draftTitle;
    const body = doc.createElement("div");
    body.className = "draft-body";
    body.textContent = text;
    card.append(title, body);
    if (conversationUi) {
      void navigator.clipboard?.writeText(text).then(() => {
        activityRail.pulse("📝", strings.draftCopied);
      }).catch(() => {});
    } else {
      const actions = doc.createElement("div");
      actions.className = "draft-card-actions";
      const copy = doc.createElement("button");
      copy.type = "button";
      copy.className = "btn mini primary";
      copy.textContent = strings.copyDraft;
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = strings.copied;
          setTimeout(() => {
            copy.textContent = strings.copyDraft;
          }, 1500);
        } catch {
          showError(isEn ? "Copy failed" : "複製失敗");
        }
      });
      actions.append(copy);
      card.append(actions);
    }
    els.messages.appendChild(card);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function showTaskConfirmCard(draft) {
    if (conversationUi) {
      applyTaskDraft(draft);
      return;
    }
    if (!els.messages) return;
    const card = doc.createElement("div");
    card.className = "task-card";
    const title = doc.createElement("div");
    title.className = "task-card-title";
    title.textContent = `${strings.taskConfirm} “${draft.title}”`;
    const actions = doc.createElement("div");
    actions.className = "task-card-actions";
    const accept = doc.createElement("button");
    accept.type = "button";
    accept.className = "btn mini primary";
    accept.textContent = strings.accept;
    const dismiss = doc.createElement("button");
    dismiss.type = "button";
    dismiss.className = "btn mini";
    dismiss.textContent = strings.dismiss;
    accept.addEventListener("click", () => {
      createTask(
        {
          title: draft.title,
          dueAt: draft.dueAt ?? null,
          category: draft.category || "personal",
          source: "chat",
        },
        { storage },
      );
      card.replaceWith(
        Object.assign(doc.createElement("div"), {
          className: "bubble bot receipt",
          textContent: `✓ ${strings.taskSaved}: ${draft.title}`,
        }),
      );
      renderToday();
      renderTasks();
    });
    dismiss.addEventListener("click", () => card.remove());
    actions.append(accept, dismiss);
    card.append(title, actions);
    els.messages.appendChild(card);
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  const uiContextPill =
    doc.getElementById("ui-context-pill") ||
    (() => {
      const pill = doc.createElement("span");
      pill.id = "ui-context-pill";
      pill.className = "ui-context-pill";
      pill.hidden = true;
      doc.querySelector("header .header-actions")?.prepend(pill);
      return pill;
    })();

  const updateUiContextPill = (applied = []) => {
    if (!uiContextPill) return;
    const labels = applied.map((i) => uiIntentLabel(i, isEn)).filter(Boolean);
    if (!labels.length) return;
    uiContextPill.hidden = false;
    uiContextPill.textContent = labels.join(" · ");
    activityRail.showFunctions(applied);
  };

  const secretaryUiHandlers = {
    switchTab: (tabId) => {
      switchTab(tabId);
      if (tabId === "chat") activateChat();
    },
    setMode: (nextMode) => {
      if (!["work", "life", "chill"].includes(nextMode)) return;
      mode = nextMode;
      persistSecretaryMode(mode, storage);
      renderModeButtons();
    },
    setTaskFilter: (filterId) => {
      if (!["all", "work", "life", "personal"].includes(filterId)) return;
      taskFilter = filterId;
      renderTaskFilters();
      renderTasks();
    },
    openVoicePicker: () => {
      voicePicker.setSelectedId(voiceId);
      voicePicker.open();
    },
    switchLanguage: async (lang) => {
      const targetLang = lang === "en" ? "en" : "yue";
      window.location.href = buildCompanionHref({
        basePath: "/companion",
        lang: targetLang,
        voiceId: defaultVoiceForLang(targetLang, voiceId),
      });
    },
    openSettings: () => {
      openSetup();
    },
    onContextChange: (ctx) => {
      /** @type {import("../companionUiIntent.js").UiIntent[]} */
      const applied = [];
      if (ctx.tab) applied.push({ type: "tab", value: ctx.tab });
      if (ctx.mode) applied.push({ type: "mode", value: ctx.mode });
      updateUiContextPill(applied);
    },
  };

  async function applyConversationUi(userMsg, parsedReply = null) {
    const fromUser = inferUiIntentFromUserText(userMsg, isEn);
    const fromTags = parsedReply?.uiIntents || [];
    const intents = mergeUiIntents(fromUser, fromTags);
    const { applied } = await applyUiIntents(intents, secretaryUiHandlers);
    updateUiContextPill(applied);
  }

  async function sendMessage(text) {
    const msg = String(text || "").trim();
    if (!msg || busy) return;
    busy = true;
    if (els.send) els.send.disabled = true;
    showError("");
    addBubble(msg, "user");
    if (els.input) els.input.value = "";

    const mayTask = /\b(task|tasks|remind|todo|to-?do|follow up|任務|提醒|跟進|待辦)/i.test(
      msg,
    );
    if (mayTask) {
      activityRail.startTaskProcess();
      activityRail.advanceProcess("hear");
    } else {
      activityRail.pulse("🎤", isEn ? "Heard" : "聽到");
    }

    await applyConversationUi(msg, null);

    if (!conversationUi) {
      const extraction = extractTaskFromMessage(msg, { isEn, mode });
      if (extraction.confidence >= 0.75 && extraction.task) {
        showTaskConfirmCard(extraction.task);
      }
      const memExtract = extractMemoryFromMessage(msg, { isEn });
      if (memExtract.confidence >= 0.75 && memExtract.memory) {
        showMemoryConfirmCard(memExtract.memory);
      }
    }

    const thinking = addBubble("…", "bot", "thinking");
    try {
      setStatus(strings.statusThinking);
      if (mayTask) activityRail.advanceProcess("think");
      const result = await cloudReply(msg);
      thinking?.remove();
      await applyConversationUi(msg, result);
      applySecretaryTagEffects(result);
      addBubble(result.reply, "bot");
      saveLastChatSummary(result.reply, storage);
      for (const taskDraft of result.tasks || []) {
        if (taskDraft.title) {
          if (!mayTask) activityRail.showTaskFlow(taskDraft.title);
          else activityRail.advanceProcess("task", { detail: taskDraft.title });
          showTaskConfirmCard(taskDraft);
        }
      }
      for (const mem of result.memories || []) {
        if (mem) showMemoryConfirmCard({ text: mem, category: "general" });
      }
      for (const draft of result.drafts || []) {
        if (draft) {
          activityRail.pulse("📝", isEn ? "Draft ready" : "草稿完成");
          showDraftCard(draft);
        }
      }
      if (!result.tasks?.length && mayTask) {
        activityRail.clearProcess();
      }
      renderToday();
      await speakCloud(result.reply, result.mood);
    } catch (err) {
      thinking?.remove();
      showError(`${strings.errChat}: ${err.message || err}`);
    } finally {
      busy = false;
      if (els.send) els.send.disabled = false;
    }
  }

  function renderTop3(priorityTasks) {
    if (!els.top3Card || !els.top3List) return;
    if (els.top3Title) els.top3Title.textContent = strings.top3Title;
    els.top3List.innerHTML = "";
    if (!priorityTasks?.length) {
      els.top3Card.classList.add("hidden");
      return;
    }
    els.top3Card.classList.remove("hidden");
    priorityTasks.forEach((task, index) => {
      const row = doc.createElement("div");
      row.className = "top3-row";
      const num = doc.createElement("span");
      num.className = "top3-num";
      num.textContent = String(index + 1);
      const title = doc.createElement("span");
      title.textContent = task.title;
      row.append(num, title);
      els.top3List.appendChild(row);
    });
  }

  function renderToday() {
    const briefing = buildTodayBriefing({ isEn, storage });
    renderTop3(briefing.priorityTasks);
    if (els.briefCard) {
      els.briefCard.innerHTML = "";
      const h = doc.createElement("h2");
      h.textContent = briefing.headline;
      els.briefCard.appendChild(h);
      for (const line of briefing.lines) {
        const p = doc.createElement("p");
        p.textContent = line;
        els.briefCard.appendChild(p);
      }
      const hint = doc.createElement("p");
      hint.className = "muted";
      hint.textContent = briefing.proactive;
      els.briefCard.appendChild(hint);
    }
    if (els.todayTasks) {
      els.todayTasks.innerHTML = "";
      const items = [...briefing.overdue, ...briefing.dueToday];
      const unique = items.filter(
        (t, i, arr) => arr.findIndex((x) => x.id === t.id) === i,
      );
      if (!unique.length) {
        const empty = doc.createElement("p");
        empty.className = "muted";
        empty.textContent = strings.noTasks;
        els.todayTasks.appendChild(empty);
      } else {
        for (const task of unique.slice(0, 5)) {
          els.todayTasks.appendChild(renderTaskRow(task, { compact: true }));
        }
      }
    }
  }

  function renderTaskFilters() {
    if (!els.taskFilters || conversationUi) return;
    els.taskFilters.innerHTML = "";
    const filters = [
      { id: "all", label: strings.filterAll },
      { id: "work", label: strings.filterWork },
      { id: "life", label: strings.filterLife },
      { id: "personal", label: strings.filterPersonal },
    ];
    for (const f of filters) {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = `filter-chip${taskFilter === f.id ? " active" : ""}`;
      btn.textContent = f.label;
      btn.addEventListener("click", () => {
        taskFilter = f.id;
        renderTaskFilters();
        renderTasks();
      });
      els.taskFilters.appendChild(btn);
    }
  }

  function renderTasks() {
    if (!els.tasksList) return;
    els.tasksList.innerHTML = "";
    let tasks = listActiveTasks({ storage });
    if (taskFilter !== "all") {
      tasks = tasks.filter((t) => t.category === taskFilter);
    }
    if (!tasks.length) {
      const empty = doc.createElement("p");
      empty.className = "muted";
      empty.textContent = strings.noTasks;
      els.tasksList.appendChild(empty);
      return;
    }
    for (const task of tasks) {
      els.tasksList.appendChild(renderTaskRow(task, { compact: conversationUi }));
    }
  }

  function renderTaskRow(task, opts = {}) {
    const row = doc.createElement("div");
    row.className = "task-row";
    const title = doc.createElement("div");
    title.className = "task-row-title";
    title.textContent = task.title;
    row.appendChild(title);
    if (task.dueAt) {
      const due = doc.createElement("div");
      due.className = "task-row-due";
      due.textContent = new Date(task.dueAt).toLocaleString(
        isEn ? "en-HK" : "zh-HK",
      );
      row.appendChild(due);
    }
    if (!opts.compact) {
      const toolbar = doc.createElement("div");
      toolbar.className = "task-row-toolbar";
      const pin = doc.createElement("button");
      pin.type = "button";
      pin.className = `priority-btn${isPriorityTask(task.id, { storage }) ? " active" : ""}`;
      pin.setAttribute("data-testid", "pin-priority-btn");
      pin.textContent = isPriorityTask(task.id, { storage })
        ? strings.unpinPriority
        : strings.pinPriority;
      pin.addEventListener("click", () => {
        const result = togglePriority(task.id, { storage });
        if (!result.ok && result.reason === "full") {
          showError(strings.priorityFull);
          return;
        }
        renderToday();
        renderTasks();
      });
      toolbar.appendChild(pin);
      const actions = doc.createElement("div");
      actions.className = "task-row-actions";
      const done = doc.createElement("button");
      done.type = "button";
      done.className = "btn mini primary";
      done.textContent = strings.complete;
      done.addEventListener("click", () => {
        completeTask(task.id, { storage });
        removePriorityIfPresent(task.id, { storage });
        renderToday();
        renderTasks();
      });
      const snooze = doc.createElement("button");
      snooze.type = "button";
      snooze.className = "btn mini";
      snooze.textContent = strings.snooze;
      snooze.addEventListener("click", () => {
        snoozeTask(task.id, Date.now() + 3600_000, { storage });
        renderToday();
        renderTasks();
      });
      const del = doc.createElement("button");
      del.type = "button";
      del.className = "btn mini danger";
      del.textContent = strings.delete;
      del.addEventListener("click", () => {
        deleteTask(task.id, { storage });
        renderToday();
        renderTasks();
      });
      actions.append(done, snooze, del);
      toolbar.appendChild(actions);
      row.appendChild(toolbar);
    }
    return row;
  }

  function renderMemory() {
    if (!els.memoryList) return;
    els.memoryList.innerHTML = "";
    const store = readMemoryStore(storage);
    if (!store.facts.length) {
      const empty = doc.createElement("p");
      empty.className = "muted";
      empty.textContent = isEn
        ? "No saved facts yet."
        : "暫時未有記憶資料。";
      els.memoryList.appendChild(empty);
      return;
    }
    for (const fact of store.facts) {
      const row = doc.createElement("div");
      row.className = "memory-row";
      const text = doc.createElement("span");
      text.textContent = fact.text;
      row.appendChild(text);
      if (!conversationUi) {
        const del = doc.createElement("button");
        del.type = "button";
        del.className = "btn mini danger";
        del.textContent = "×";
        del.addEventListener("click", () => {
          removeMemoryFact(fact.id, { storage });
          renderMemory();
        });
        row.appendChild(del);
      }
      els.memoryList.appendChild(row);
    }
  }

  function renderPrefs() {
    const prefs = getPreferences({ storage });
    if (els.prefMorningBrief) {
      els.prefMorningBrief.checked = Boolean(prefs.morningBrief);
    }
    if (els.prefHelpWith) els.prefHelpWith.value = prefs.helpWith;
    if (els.prefTone) els.prefTone.value = prefs.tone;
    if (els.prefReminders) {
      els.prefReminders.checked = readReminderPrefs(storage).enabled;
    }
  }

  function renderModeButtons() {
    if (!els.modeRow) return;
    els.modeRow.innerHTML = "";
    for (const m of ["work", "life", "chill"]) {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.dataset.mode = m;
      btn.className = `mode-chip${mode === m ? " active" : ""}`;
      btn.textContent = modeLabel(m, isEn);
      btn.addEventListener("click", () => {
        mode = m;
        persistSecretaryMode(mode, storage);
        renderModeButtons();
      });
      els.modeRow.appendChild(btn);
    }
  }

  function renderDiscover() {
    if (!els.discover) return;
    els.discover.innerHTML = "";
    for (const prompt of discoverPrompts(isEn)) {
      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "discover-chip";
      chip.textContent = prompt;
      chip.addEventListener("click", () => {
        switchTab("chat");
        activateChat();
        void sendMessage(prompt);
      });
      els.discover.appendChild(chip);
    }
  }

  function switchTab(tabId) {
    if (conversationUi && tabId === "me") {
      openSetup();
      return;
    }
    switchUiTabPanel(doc, {
      panels: els.panels,
      tabs: els.tabs,
      nextId: tabId,
    });
    if (tabId === "today") renderToday();
    if (tabId === "tasks") {
      renderTaskFilters();
      renderTasks();
    }
    if (tabId === "me") {
      renderMemory();
      renderPrefs();
    }
  }

  function openSetup() {
    if (!els.setup) return;
    renderPrefs();
    renderMemory();
    syncSetupChrome();
    openUiOverlay(doc, {
      panel: els.setup,
      backdrop: els.setupBackdrop,
      bodyClass: "setup-open",
    });
  }

  function closeSetup() {
    if (!els.setup) return;
    closeUiOverlay(doc, {
      panel: els.setup,
      backdrop: els.setupBackdrop,
      bodyClass: "setup-open",
    });
  }

  function syncSetupSpeakerBtn() {
    if (!els.setupBtnSpeaker) return;
    els.setupBtnSpeaker.textContent = speakerOn
      ? strings.setupSpeakerOn
      : strings.setupSpeakerOff;
    els.setupBtnSpeaker.setAttribute("aria-pressed", speakerOn ? "true" : "false");
  }

  async function startConversationMic() {
    const mic = await ensureMicCapture();
    if (!mic?.supportsMic) {
      doc.body.classList.add("mic-blocked");
      setStatus(strings.typeFallback);
      return;
    }
    const ok = await mic.start();
    if (ok) {
      doc.body.classList.remove("mic-blocked");
      setStatus(strings.statusListenHint);
    } else {
      doc.body.classList.add("mic-blocked");
      setStatus(strings.typeFallback);
    }
  }

  function activateChat() {
    els.start?.classList.add("hidden");
    els.composer?.classList.remove("hidden");
    if (conversationUi) {
      els.composer?.classList.add("voice-only");
    }
    if (els.messages && !els.messages.childElementCount) {
      addBubble(strings.welcome, "bot");
      addBubble(
        isEn
          ? "Just talk — I'll switch views, modes, tasks, and memory for you. Try “show my tasks”, “let's chill”, or “remind me to call mom tomorrow”."
          : "直接講就得 — 我會幫你轉頁、轉語氣、加任務同記憶。試下「睇下任務」、「閒聊模式」或者「提醒我今晚打電話俾媽咪」。",
        "bot",
      );
    }
    if (conversationUi) {
      void startConversationMic();
    } else {
      setStatus(strings.statusReady);
      els.input?.focus();
    }
  }

  async function ensureMicCapture() {
    if (micCapture) return micCapture;
    const mod = await import("../companionMicCapture.js");
    micCapture = mod.createMicCapture({
      lang: isEn ? "en-US" : "zh-HK",
      cloudSttUrl: hosted ? "/api/stt" : null,
      onText: (text, isFinal) => {
        if (isFinal && text) void sendMessage(text);
      },
      onState: (on) => {
        micOn = on;
        els.mic?.classList.toggle("active", on);
        const listenHint = doc.getElementById("listen-hint");
        listenHint?.classList.toggle("mic-active", on);
        if (listenHint) {
          listenHint.textContent = on
            ? strings.statusMic
            : busy
              ? strings.statusThinking
              : strings.statusListenHint;
        }
        if (!busy) setStatus(on ? strings.statusMic : strings.statusListenHint);
      },
      onError: (code) => {
        showError(
          code === "not-allowed" ? strings.errMicBlocked : mod.formatMicError(code),
        );
        micOn = false;
        els.mic?.classList.remove("active");
      },
    });
    return micCapture;
  }

  const voicePicker = createCompanionVoicePicker({
    root: doc.body,
    langCode,
    selectedId: voiceId,
    onSelect: (id) => {
      voiceId = id;
      persistVoiceId(voiceId);
      syncVoiceToUrl(voiceId);
      syncSetupChrome();
      setStatus(
        isEn
          ? `Voice: ${voicePickerButtonLabel(voiceId, langCode, true)}`
          : `語音：${voicePickerButtonLabel(voiceId, langCode, false)}`,
      );
    },
  });

  function syncSetupChrome() {
    if (els.btnOpenSetup) {
      els.btnOpenSetup.textContent = strings.setup;
      els.btnOpenSetup.title = isEn
        ? "Language, voice, preferences"
        : "語言、語音、偏好";
    }
    const setupTitle = doc.getElementById("setup-title");
    if (setupTitle) setupTitle.textContent = strings.setup;
    if (els.setupClose) {
      els.setupClose.setAttribute("aria-label", strings.closeSetup);
    }
    const appTitle = doc.getElementById("setup-app-title");
    if (appTitle) appTitle.textContent = strings.setupApp;
    const prefsTitle = doc.getElementById("setup-prefs-title");
    if (prefsTitle) prefsTitle.textContent = strings.setupPrefs;
    const memTitle = doc.getElementById("setup-memory-title");
    if (memTitle) memTitle.textContent = strings.memorySection;
    if (els.setupBtnLang) {
      els.setupBtnLang.textContent = isEn ? "Language: English" : "語言：粵語";
      els.setupBtnLang.title = isEn
        ? "Switch to Cantonese (粵語)"
        : "Switch to English";
    }
    if (els.setupBtnVoice) {
      els.setupBtnVoice.textContent = isEn
        ? `Voice: ${voicePickerButtonLabel(voiceId, langCode, true)}`
        : `語音：${voicePickerButtonLabel(voiceId, langCode, false)}`;
      els.setupBtnVoice.title = isEn ? "Tap to switch voice" : "按一下切換語音";
    }
    if (els.setupLink3d) {
      els.setupLink3d.textContent = strings.setup3d;
      els.setupLink3d.href = buildCompanionHref({
        basePath: "/companion-full",
        lang: langCode,
        voiceId,
      });
    }
    syncSetupSpeakerBtn();
  }

  function wireSetup() {
    syncSetupChrome();
    els.btnOpenSetup?.addEventListener("click", openSetup);
    els.setupClose?.addEventListener("click", closeSetup);
    els.setupBackdrop?.addEventListener("click", closeSetup);
    els.setupBtnVoice?.addEventListener("click", () => {
      voicePicker.setSelectedId(voiceId);
      voicePicker.open();
    });
    els.setupBtnLang?.addEventListener("click", () => {
      const targetLang = isEn ? "yue" : "en";
      window.location.href = buildCompanionHref({
        basePath: "/companion",
        lang: targetLang,
        voiceId: defaultVoiceForLang(targetLang, voiceId),
      });
    });
    els.setupBtnSpeaker?.addEventListener("click", () => {
      speakerOn = !speakerOn;
      els.speaker?.classList.toggle("off", !speakerOn);
      syncSetupSpeakerBtn();
      if (!speakerOn) {
        audioEl.pause();
        audioEl.src = "";
      }
    });
    doc.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && els.setup?.classList.contains("open")) {
        closeSetup();
      }
    });
  }

  function wireEvents() {
    for (const tab of els.tabs) {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab || "today"));
    }
    els.start?.addEventListener("click", () => {
      switchTab("chat");
      activateChat();
    });
    els.composer?.addEventListener("submit", (e) => {
      e.preventDefault();
      void sendMessage(els.input?.value || "");
    });
    els.speaker?.addEventListener("click", () => {
      speakerOn = !speakerOn;
      els.speaker.classList.toggle("off", !speakerOn);
      syncSetupSpeakerBtn();
      if (!speakerOn) {
        audioEl.pause();
        audioEl.src = "";
      }
    });
    els.mic?.addEventListener("click", () => {
      void ensureMicCapture().then((mic) => {
        if (!mic?.supportsMic) {
          showError(strings.errMic);
          return;
        }
        if (micOn) {
          mic.stop();
          return;
        }
        void mic.start();
      });
    });
    els.quickTaskForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = String(els.quickTaskInput?.value || "").trim();
      if (!title) return;
      createTask({ title, source: "manual" }, { storage });
      if (els.quickTaskInput) els.quickTaskInput.value = "";
      renderToday();
      renderTasks();
    });
    els.memoryForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = String(els.memoryInput?.value || "").trim();
      if (!text) return;
      addMemoryFact(text, { storage });
      if (els.memoryInput) els.memoryInput.value = "";
      renderMemory();
    });
    els.prefMorningBrief?.addEventListener("change", () => {
      savePreferences(
        { morningBrief: els.prefMorningBrief.checked },
        { storage },
      );
      renderToday();
    });
    els.prefHelpWith?.addEventListener("change", () => {
      savePreferences({ helpWith: els.prefHelpWith.value }, { storage });
    });
    els.prefTone?.addEventListener("change", () => {
      savePreferences({ tone: els.prefTone.value }, { storage });
    });
    els.prefReminders?.addEventListener("change", async () => {
      const want = els.prefReminders.checked;
      if (!want) {
        saveReminderPrefs(false, storage);
        return;
      }
      const perm = await requestReminderPermission();
      if (perm === "granted") {
        saveReminderPrefs(true, storage);
        setStatus(strings.remindersOn);
      } else {
        els.prefReminders.checked = false;
        saveReminderPrefs(false, storage);
        showError(strings.remindersBlocked);
      }
    });
    doc.getElementById("open-chat-btn")?.addEventListener("click", () => {
      switchTab("chat");
      activateChat();
    });
  }

  function localizeChrome() {
    doc.documentElement.lang = isEn ? "en" : "zh-Hant";
    const title = doc.getElementById("app-title");
    if (title) title.textContent = strings.appTitle;
    if (els.input) els.input.placeholder = strings.placeholder;
    if (els.start) els.start.textContent = strings.start;
    if (els.quickTaskInput) els.quickTaskInput.placeholder = strings.taskPlaceholder;
    if (els.memoryInput) els.memoryInput.placeholder = strings.memoryPlaceholder;
    for (const tab of els.tabs) {
      const key = tab.dataset.tab;
      if (key === "today") tab.textContent = strings.tabToday;
      if (key === "chat") tab.textContent = strings.tabChat;
      if (key === "tasks") tab.textContent = strings.tabTasks;
      if (key === "me") tab.textContent = strings.tabMe;
    }
    const openChat = doc.getElementById("open-chat-btn");
    if (openChat) openChat.textContent = strings.openChat;
    const quickAdd = doc.getElementById("quick-task-submit");
    if (quickAdd) quickAdd.textContent = strings.addTask;
    const memSave = doc.getElementById("memory-save-btn");
    if (memSave) memSave.textContent = strings.save;
    const sendBtn = doc.getElementById("send-btn");
    if (sendBtn) sendBtn.textContent = strings.send;
    const tasksTitle = doc.getElementById("tasks-panel-title");
    if (tasksTitle) tasksTitle.textContent = strings.tasksPanelTitle;
    const memHeading = doc.getElementById("setup-memory-title");
    if (memHeading) memHeading.textContent = strings.memorySection;
    const panelMeHint = doc.getElementById("panel-me-hint");
    if (panelMeHint) panelMeHint.textContent = strings.panelMeHint;
    syncSetupChrome();
    const listenHint = doc.getElementById("listen-hint");
    if (listenHint) listenHint.textContent = strings.statusListenHint;
    const prefMorning = doc.querySelector('label[for="pref-morning-brief"]');
    if (prefMorning) {
      prefMorning.lastChild.textContent = isEn
        ? " Morning brief"
        : " 早晨簡報";
    }
    const prefRem = doc.querySelector('label[for="pref-reminders"]');
    if (prefRem) {
      prefRem.lastChild.textContent = isEn
        ? " Due-task reminders (browser notifications)"
        : " 到期任務提醒（瀏覽器通知）";
    }
    const prefHelp = doc.querySelector('label[for="pref-help-with"]');
    if (prefHelp) prefHelp.firstChild.textContent = strings.helpWith;
    const prefTone = doc.querySelector('label[for="pref-tone"]');
    if (prefTone) prefTone.firstChild.textContent = strings.tone;
  }

  wireSetup();
  wireEvents();
  localizeChrome();
  renderModeButtons();
  renderDiscover();
  renderTaskFilters();
  renderToday();
  renderTasks();
  renderMemory();
  renderPrefs();

  const initialTab = params.get("tab") || "chat";
  switchTab(
    ["today", "chat", "tasks", "me"].includes(initialTab) ? initialTab : "today",
  );
  if (conversationUi && initialTab === "chat") {
    activateChat();
  }

  if (hosted) {
    doc.getElementById("build-tag")?.classList.add("hidden");
    doc.getElementById("cloud-tag")?.classList.remove("hidden");
  }

  setStatus(
    conversationUi
      ? strings.statusListenHint
      : hosted
        ? isEn
          ? "☁️ Cloud secretary — Today tab ready"
          : "☁️ 雲端秘書 — 「今日」已準備好"
        : isEn
          ? "Secretary MVP — local mode"
          : "秘書 MVP — 本地模式",
  );

  savePreferences({ onboarded: true }, { storage });

  if (hosted) {
    startReminderLoop({
      storage,
      isEn,
      onFire: (count) => {
        if (count > 0) renderToday();
      },
    });
  }

  return {
    sendMessage,
    switchTab,
    renderToday,
    renderTasks,
    getMode: () => mode,
  };
}
