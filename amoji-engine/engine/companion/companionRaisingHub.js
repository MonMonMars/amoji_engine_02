/**
 * Raising-game UI hub — daily goal chip line, bond badge, 3-button activity rail,
 * advice bubble, floating stat deltas, MomoTalk pinned memories.
 */
import {
  ACTIVITY_COMMANDS,
  activityCommandLabel,
  adviceLineForAction,
  applyWalkCare,
  bumpRaisingProgress,
  extractMemoryCandidate,
  formatDailyGoalLine,
  formatStatDelta,
  loadRaisingState,
  resolveBondRank,
  saveRaisingState,
  updatePinnedMemories,
} from "./companionRaisingUi.js";

export const COMPANION_RAISING_HUB_SCHEMA = "amoji.companionRaisingHub.v1";
export const ADVICE_VISIBLE_MS = 4200;
export const DELTA_FLOAT_MS = 1800;

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   chipGoalEl?: HTMLElement | null,
 *   petHudEl?: HTMLElement | null,
 *   stageEl?: HTMLElement | null,
 *   isEnglish?: boolean | (() => boolean),
 *   storage?: Storage,
 *   characterId?: string | (() => string),
 *   getAvatar?: () => object | null,
 *   getCare?: () => ({ hunger?: number, hearts?: number, coins?: number }),
 *   setCare?: (patch: object) => void,
 *   onOpenTreat?: () => void,
 *   onFocusTalk?: () => void,
 *   onActivity?: (info: { kind: string, advice: string }) => void,
 *   now?: () => number,
 * }} [opts]
 */
export function createCompanionRaisingHub(opts = {}) {
  const root = opts.root || document.body;
  const storage = opts.storage;
  const english = () =>
    typeof opts.isEnglish === "function"
      ? Boolean(opts.isEnglish())
      : Boolean(opts.isEnglish);
  const characterId = () => {
    if (typeof opts.characterId === "function") return opts.characterId();
    return String(opts.characterId || "amoji").toLowerCase();
  };
  const now = () => (typeof opts.now === "function" ? opts.now() : Date.now());

  let raising = loadRaisingState(characterId(), storage, now());
  let adviceTimer = null;

  const chipGoalEl =
    opts.chipGoalEl ||
    document.getElementById("companion-daily-goal");

  const activityBar = el("div", "raising-activity-bar");
  activityBar.id = "raising-activity-bar";
  activityBar.setAttribute("role", "toolbar");
  activityBar.setAttribute(
    "aria-label",
    english() ? "Companion activities" : "同伴活動",
  );

  const advice = el("div", "raising-advice");
  advice.id = "raising-advice";
  advice.hidden = true;
  advice.innerHTML = `<span class="raising-advice__text"></span>`;

  const memories = el("div", "raising-memories");
  memories.id = "raising-memories";
  memories.hidden = true;
  memories.innerHTML = `<span class="raising-memories__label"></span><div class="raising-memories__list"></div>`;

  const deltaLayer = el("div", "raising-delta-layer");
  deltaLayer.id = "raising-delta-layer";
  deltaLayer.setAttribute("aria-hidden", "true");

  const bondBadge = el("div", "raising-bond-badge");
  bondBadge.id = "raising-bond-badge";
  bondBadge.innerHTML = `<span class="raising-bond-badge__icon"></span><span class="raising-bond-badge__label"></span>`;

  const stage = opts.stageEl || document.querySelector(".stage") || root;
  stage.appendChild(deltaLayer);
  root.appendChild(activityBar);
  root.appendChild(advice);
  root.appendChild(memories);

  const petHud = opts.petHudEl || document.getElementById("pet-hud");
  petHud?.querySelector(".pet-hud-card")?.appendChild(bondBadge);

  const adviceText = advice.querySelector(".raising-advice__text");
  const memoriesLabel = memories.querySelector(".raising-memories__label");
  const memoriesList = memories.querySelector(".raising-memories__list");
  const bondIcon = bondBadge.querySelector(".raising-bond-badge__icon");
  const bondLabel = bondBadge.querySelector(".raising-bond-badge__label");

  const persist = () => {
    raising = saveRaisingState({ ...raising, characterId: characterId() }, storage);
  };

  const paintGoal = () => {
    if (!chipGoalEl) return;
    chipGoalEl.textContent = formatDailyGoalLine(raising, english(), now());
    chipGoalEl.hidden = false;
    chipGoalEl.classList.toggle("is-complete", Boolean(raising.goalComplete));
  };

  const paintBond = (hearts = getCare()?.hearts) => {
    const rank = resolveBondRank(hearts ?? 0, english());
    if (bondIcon) bondIcon.textContent = rank.icon;
    if (bondLabel) bondLabel.textContent = rank.label;
    bondBadge.setAttribute("data-tier", String(rank.tier));
  };

  const paintMemories = () => {
    const list = raising.pinnedMemories || [];
    if (!memoriesList || !memoriesLabel) return;
    memoriesLabel.textContent = english() ? "Remembers" : "記住";
    memoriesList.replaceChildren(
      ...list.map((text) => {
        const chip = el("span", "raising-memory-chip");
        chip.textContent = text;
        chip.title = text;
        return chip;
      }),
    );
    memories.hidden = list.length < 1;
  };

  const paintActivityBar = () => {
    activityBar.replaceChildren(
      ...ACTIVITY_COMMANDS.map((cmd) => {
        const btn = el("button", "raising-activity-btn");
        btn.type = "button";
        btn.dataset.activity = cmd.kind;
        btn.setAttribute("aria-label", activityCommandLabel(cmd, english()));
        btn.innerHTML = `<span class="raising-activity-btn__icon" aria-hidden="true">${cmd.icon}</span><span class="raising-activity-btn__label">${activityCommandLabel(cmd, english())}</span>`;
        btn.addEventListener("click", () => runActivity(cmd.kind));
        return btn;
      }),
    );
  };

  const showAdvice = (line) => {
    const text = String(line || "").trim();
    if (!text) {
      advice.hidden = true;
      if (adviceText) adviceText.textContent = "";
      return;
    }
    advice.hidden = false;
    if (adviceText) adviceText.textContent = text;
    else advice.textContent = text;
    if (adviceTimer) globalThis.clearTimeout?.(adviceTimer);
    adviceTimer = globalThis.setTimeout?.(() => {
      advice.hidden = true;
    }, ADVICE_VISIBLE_MS);
  };

  const spawnDelta = (delta, anchorRect) => {
    const label = formatStatDelta(delta, english());
    if (!label) return;
    const node = el("span", "raising-delta-pop");
    node.textContent = label;
    const layerRect = deltaLayer.getBoundingClientRect();
    const x = anchorRect
      ? anchorRect.left + anchorRect.width * 0.5 - layerRect.left
      : layerRect.width * 0.55;
    const y = anchorRect
      ? anchorRect.top + anchorRect.height * 0.2 - layerRect.top
      : layerRect.height * 0.35;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    deltaLayer.appendChild(node);
    requestAnimationFrame(() => node.classList.add("is-visible"));
    globalThis.setTimeout?.(() => node.remove(), DELTA_FLOAT_MS);
  };

  const getCare = () => opts.getCare?.() || { hunger: 0, hearts: 0, coins: 0 };

  const applyCarePatch = (patch, event, delta = {}) => {
    opts.setCare?.(patch);
    raising = bumpRaisingProgress(raising, event, {
      hearts: patch.hearts,
      now: now(),
    });
    persist();
    paintGoal();
    paintBond(patch.hearts);
    const wasComplete = raising.goalComplete;
    const advice = adviceLineForAction(event, {
      ...delta,
      goalComplete: wasComplete && event === raising.goalId,
    }, english());
    showAdvice(advice);
    spawnDelta(delta, petHud?.getBoundingClientRect?.() || null);
    opts.onActivity?.({ kind: event, advice });
    return raising;
  };

  const runActivity = (kind) => {
    const care = getCare();
    const avatar = opts.getAvatar?.();
    if (kind === "talk") {
      opts.onFocusTalk?.();
      showAdvice(english() ? "Say something — she's listening." : "講嘢啦 — 佢聽緊。");
      return;
    }
    if (kind === "snack") {
      opts.onOpenTreat?.();
      showAdvice(
        english()
          ? "Drag a snack from the fridge to her mouth."
          : "由雪櫃拖食物去佢嘴邊啦。",
      );
      return;
    }
    if (kind === "walk") {
      const result = applyWalkCare(care, care.coins, now());
      applyCarePatch(result.care, "walk", {
        heartsDelta: result.heartsDelta,
        hungerDelta: result.hungerDelta,
      });
      avatar?.setEmotion?.("happy");
      avatar?.playAction?.("walk", { emotion: "happy", single: true });
    }
  };

  const onFeed = ({ item, refused, heartsDelta = 0, hungerDelta = 0 } = {}) => {
    const care = getCare();
    raising = bumpRaisingProgress(raising, refused ? "" : "feed", {
      hearts: care.hearts,
      now: now(),
    });
    persist();
    paintGoal();
    paintBond(care.hearts);
    const name = item?.emoji ? `${item.emoji}` : "";
    showAdvice(
      adviceLineForAction("feed", {
        refused,
        itemName: name,
        heartsDelta,
        hungerDelta,
        goalComplete: raising.goalComplete,
      }, english()),
    );
    if (!refused) {
      spawnDelta({ hearts: heartsDelta, hunger: hungerDelta }, petHud?.getBoundingClientRect?.() || null);
    }
  };

  const onChat = () => {
    const care = getCare();
    raising = bumpRaisingProgress(raising, "chat", { hearts: care.hearts, now: now() });
    persist();
    paintGoal();
    paintBond(care.hearts);
    showAdvice(adviceLineForAction("chat", { heartsDelta: 6, goalComplete: raising.goalComplete }, english()));
    spawnDelta({ hearts: 6 }, petHud?.getBoundingClientRect?.() || null);
  };

  const onPet = () => {
    const care = getCare();
    raising = bumpRaisingProgress(raising, "pet", { hearts: care.hearts, now: now() });
    persist();
    paintGoal();
    paintBond(care.hearts);
    showAdvice(adviceLineForAction("pet", { heartsDelta: 8, goalComplete: raising.goalComplete }, english()));
    spawnDelta({ hearts: 8 }, petHud?.getBoundingClientRect?.() || null);
  };

  const onUserMessage = (text) => {
    const candidate = extractMemoryCandidate(text, english());
    if (!candidate) return;
    raising = {
      ...raising,
      pinnedMemories: updatePinnedMemories(raising.pinnedMemories, candidate),
    };
    persist();
    paintMemories();
  };

  const refresh = () => {
    const care = getCare();
    raising = loadRaisingState(characterId(), storage, now());
    paintGoal();
    paintBond(care.hearts);
    paintMemories();
    paintActivityBar();
  };

  const setCharacter = (id) => {
    raising = loadRaisingState(String(id || "amoji").toLowerCase(), storage, now());
    refresh();
  };

  activityBar.addEventListener("click", (ev) => {
    const btn = ev.target.closest?.("[data-activity]");
    if (!btn) return;
  });

  refresh();

  return {
    schema: COMPANION_RAISING_HUB_SCHEMA,
    activityBar,
    advice,
    memories,
    bondBadge,
    deltaLayer,
    showAdvice,
    spawnDelta,
    onFeed,
    onChat,
    onPet,
    onUserMessage,
    runActivity,
    refresh,
    setCharacter,
    get state() {
      return raising;
    },
    dispose() {
      if (adviceTimer) globalThis.clearTimeout?.(adviceTimer);
      activityBar.remove();
      advice.remove();
      memories.remove();
      deltaLayer.remove();
      bondBadge.remove();
    },
  };
}
