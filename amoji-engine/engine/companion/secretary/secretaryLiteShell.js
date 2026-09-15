/**
 * Phase 1 secretary UI shell for amoji-lite (Today / Chat / Tasks / Me).
 */
import {
  buildCompanionHref,
  companionLangCode,
  defaultVoiceForLang,
  nextVoiceId,
  persistVoiceId,
  resolveVoiceId,
  syncVoiceToUrl,
  voiceGenderLabel,
} from "../companionVoiceCatalog.js";
import { buildTodayBriefing } from "./briefing.js";
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
        statusReady: "Ready — tap Send or mic",
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
      }
    : {
        appTitle: "Amoji 秘書",
        tabToday: "今日",
        tabChat: "傾計",
        tabTasks: "任務",
        tabMe: "我",
        placeholder: "輸入訊息…",
        start: "開始傾計",
        statusReady: "準備好 — 按發送或麥克風",
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
    todayTasks: doc.getElementById("today-tasks"),
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
    const base = isEn
      ? "You are Amoji, a warm personal AI secretary with an anime companion personality. Reply in English. Help with work, life admin, and friendly chat. When the user asks to track something, confirm briefly. End with [mood:happy] or similar."
      : "你係 Amoji，一個有動漫同伴氣質嘅個人 AI 秘書。用粵語口語回覆。幫手處理工作、生活同傾計。當用戶想記低任務時，簡短確認。結尾加 [mood:happy] 等情緒標籤。";
    const modeLine = modePromptFragment(mode, isEn);
    const memoryLine = memory
      ? isEn
        ? `User memory:\n${memory}`
        : `用戶記憶：\n${memory}`
      : "";
    return [base, modeLine, memoryLine].filter(Boolean).join("\n\n");
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
    const raw = String(data.reply || "");
    const reply = raw.replace(/\s*\[mood:\w+\]\s*$/i, "").trim();
    const mood = (raw.match(/\[mood:(\w+)\]/i) || [])[1] || "happy";
    return { reply, mood };
  }

  async function speakCloud(text, emotion) {
    if (!speakerOn || !text) return;
    setStatus(strings.statusSpeaking);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          emotion: emotion || "neutral",
          lang: isEn ? "en" : "yue",
          voice: voiceId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    } catch (err) {
      console.warn("[secretary-lite] tts", err);
      showError(`${strings.errTts}: ${err.message || err}`);
    }
    setStatus(strings.statusReady);
  }

  function showTaskConfirmCard(draft) {
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

  async function sendMessage(text) {
    const msg = String(text || "").trim();
    if (!msg || busy) return;
    busy = true;
    if (els.send) els.send.disabled = true;
    showError("");
    addBubble(msg, "user");
    if (els.input) els.input.value = "";

    const extraction = extractTaskFromMessage(msg, { isEn, mode });
    if (extraction.confidence >= 0.75 && extraction.task) {
      showTaskConfirmCard(extraction.task);
    }

    const thinking = addBubble("…", "bot", "thinking");
    try {
      setStatus(strings.statusThinking);
      const result = await cloudReply(msg);
      thinking?.remove();
      addBubble(result.reply, "bot");
      saveLastChatSummary(result.reply, storage);
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

  function renderToday() {
    const briefing = buildTodayBriefing({ isEn, storage });
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

  function renderTasks() {
    if (!els.tasksList) return;
    els.tasksList.innerHTML = "";
    const tasks = listActiveTasks({ storage });
    if (!tasks.length) {
      const empty = doc.createElement("p");
      empty.className = "muted";
      empty.textContent = strings.noTasks;
      els.tasksList.appendChild(empty);
      return;
    }
    for (const task of tasks) {
      els.tasksList.appendChild(renderTaskRow(task));
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
      const actions = doc.createElement("div");
      actions.className = "task-row-actions";
      const done = doc.createElement("button");
      done.type = "button";
      done.className = "btn mini primary";
      done.textContent = strings.complete;
      done.addEventListener("click", () => {
        completeTask(task.id, { storage });
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
      row.appendChild(actions);
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
      const del = doc.createElement("button");
      del.type = "button";
      del.className = "btn mini danger";
      del.textContent = "×";
      del.addEventListener("click", () => {
        removeMemoryFact(fact.id, { storage });
        renderMemory();
      });
      row.append(text, del);
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
  }

  function renderModeButtons() {
    if (!els.modeRow) return;
    els.modeRow.innerHTML = "";
    for (const m of ["work", "life", "chill"]) {
      const btn = doc.createElement("button");
      btn.type = "button";
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
    for (const [id, panel] of Object.entries(els.panels)) {
      panel?.classList.toggle("hidden", id !== tabId);
    }
    for (const tab of els.tabs) {
      tab.classList.toggle("active", tab.dataset.tab === tabId);
    }
    if (tabId === "today") renderToday();
    if (tabId === "tasks") renderTasks();
    if (tabId === "me") {
      renderMemory();
      renderPrefs();
    }
  }

  function activateChat() {
    els.start?.classList.add("hidden");
    els.composer?.classList.remove("hidden");
    if (els.messages && !els.messages.childElementCount) {
      addBubble(strings.welcome, "bot");
      addBubble(
        isEn
          ? "Switch Work / Life / Chill above. Tell me a task or just chat."
          : "上面可以切換工作 / 生活 / 閒聊模式。同我講任務或者隨意傾計啦。",
        "bot",
      );
    }
    setStatus(strings.statusReady);
    els.input?.focus();
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
        if (!busy) setStatus(on ? strings.statusMic : strings.statusReady);
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

  function wireHeader() {
    const btn3d = doc.getElementById("btn-3d");
    const btnLang = doc.getElementById("btn-lang");
    const btnVoice = doc.getElementById("btn-voice");
    const update = () => {
      if (btn3d) {
        btn3d.textContent = isEn ? "3D avatar" : "3D 同伴";
        btn3d.href = buildCompanionHref({
          basePath: "/companion-full",
          lang: langCode,
          voiceId,
        });
      }
      if (btnLang) {
        const targetLang = isEn ? "yue" : "en";
        btnLang.textContent = isEn ? "EN" : "粵";
        btnLang.href = buildCompanionHref({
          basePath: "/companion",
          lang: targetLang,
          voiceId: defaultVoiceForLang(targetLang, voiceId),
        });
      }
      if (btnVoice) {
        btnVoice.textContent = voiceGenderLabel(voiceId, langCode, isEn);
      }
    };
    update();
    btnVoice?.addEventListener("click", () => {
      voiceId = nextVoiceId(voiceId, langCode);
      persistVoiceId(voiceId);
      syncVoiceToUrl(voiceId);
      update();
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
  }

  wireHeader();
  wireEvents();
  localizeChrome();
  renderModeButtons();
  renderDiscover();
  renderToday();
  renderTasks();
  renderMemory();
  renderPrefs();

  const initialTab = params.get("tab") || "today";
  switchTab(
    ["today", "chat", "tasks", "me"].includes(initialTab) ? initialTab : "today",
  );

  if (hosted) {
    doc.getElementById("build-tag")?.classList.add("hidden");
    doc.getElementById("cloud-tag")?.classList.remove("hidden");
  }

  setStatus(
    hosted
      ? isEn
        ? "☁️ Cloud secretary — Today tab ready"
        : "☁️ 雲端秘書 — 「今日」已準備好"
      : isEn
        ? "Secretary MVP — local mode"
        : "秘書 MVP — 本地模式",
  );

  savePreferences({ onboarded: true }, { storage });

  return {
    sendMessage,
    switchTab,
    renderToday,
    renderTasks,
    getMode: () => mode,
  };
}
