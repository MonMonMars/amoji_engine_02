/**
 * Pet-game treat dock — shop, bag, pointer drag onto the companion,
 * plus Pou-style needs HUD (hunger / hearts) and the care loop.
 */
import {
  TREAT_ITEMS,
  getTreatItem,
  treatActionId,
  treatDisplayName,
  treatThanksLine,
} from "./companionTreatCatalog.js";
import {
  bagCount,
  bagTotal,
  buyTreat,
  consumeTreat,
  loadTreatState,
  saveTreatState,
} from "./companionTreatStore.js";
import {
  applyChatCare,
  applyPetCare,
  checkInCare,
  isHungry,
  isLonely,
  maybeHungryAsk,
  refuseLine,
  thoughtForCare,
  tickCare,
  tryFeedTreat,
} from "./companionPetCare.js";

export const COMPANION_TREAT_INTERACT_SCHEMA = "amoji.companionTreatInteract.v1";
export const PET_HUD_TICK_MS = 30_000;

export const TREAT_FEED_DURATION_MS = 3600;

/**
 * Ellipse around the companion (upper-center of the canvas).
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect | { left: number, top: number, width: number, height: number } | null} rect
 */
export function isDropOnCompanion(clientX, clientY, rect) {
  if (!rect || rect.width < 8 || rect.height < 8) return false;
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.38;
  const rx = Math.max(72, rect.width * 0.28);
  const ry = Math.max(96, rect.height * 0.38);
  const dx = (clientX - cx) / rx;
  const dy = (clientY - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * @param {DOMRect | { left: number, top: number, width: number, height: number } | null} rect
 */
export function companionMouthPoint(rect) {
  if (!rect) return { x: 0, y: 0 };
  return {
    x: rect.left + rect.width * 0.5,
    y: rect.top + rect.height * 0.32,
  };
}

/**
 * Play stored eat/drink motion + chew, then rest.
 * @param {{
 *   playAction?: Function,
 *   stopAction?: Function,
 *   setEating?: Function,
 *   setEmotion?: Function,
 *   currentAction?: string,
 * } | null | undefined} avatar
 * @param {{ action?: string } | null | undefined} item
 * @param {{ durationMs?: number, now?: () => number }} [opts]
 */
export function startTreatPerformance(avatar, item, opts = {}) {
  const action = treatActionId(item);
  const durationMs = Number(opts.durationMs) > 0 ? Number(opts.durationMs) : TREAT_FEED_DURATION_MS;
  avatar?.setEmotion?.("happy");
  avatar?.setEating?.(true);
  avatar?.playAction?.(action, { emotion: "happy", loop: true, single: true });
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    avatar?.setEating?.(false);
    const current = avatar?.currentAction;
    if (!current || current === action) avatar?.stopAction?.();
  };
  const timer = globalThis.setTimeout?.(stop, durationMs);
  return () => {
    if (timer) globalThis.clearTimeout?.(timer);
    stop();
  };
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   isEnglish?: boolean,
 *   storage?: Storage,
 *   getAvatar?: () => object | null,
 *   getDropRect?: () => DOMRect | null,
 *   onToast?: (msg: string, kind?: string) => void,
 *   onFeed?: (info: { item: object, action: string, line: string, refused?: boolean, reason?: string }) => void,
 *   onHungryAsk?: (info: { line: string, thought: string }) => void,
 *   now?: () => number,
 * }} [opts]
 */
export function createCompanionTreatDock(opts = {}) {
  const root = opts.root || document.body;
  const storage = opts.storage;
  const english = () =>
    typeof opts.isEnglish === "function"
      ? Boolean(opts.isEnglish())
      : Boolean(opts.isEnglish);
  let state = loadTreatState(storage);
  let tab = "bag";
  let open = false;
  let dragging = false;
  let eatStop = null;
  let lastOutcome = { ok: false, reason: "" };
  const now = () => (typeof opts.now === "function" ? opts.now() : Date.now());

  const dock = el("div", "treat-dock");
  dock.id = "treat-dock";
  const fab = el("button", "treat-fab");
  fab.type = "button";
  fab.id = "treat-fab";
  const coinsEl = el("span", "treat-coins");
  coinsEl.id = "treat-coins";
  const bagBadge = el("span", "treat-bag-badge");
  const halo = el("div", "treat-drop-halo");
  halo.id = "treat-drop-halo";
  halo.setAttribute("aria-hidden", "true");
  const ghost = el("div", "treat-drag-ghost");
  ghost.id = "treat-drag-ghost";
  ghost.hidden = true;
  const sheet = el("div", "treat-sheet");
  sheet.id = "treat-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  const backdrop = el("div", "treat-sheet-backdrop");
  backdrop.id = "treat-sheet-backdrop";
  const hud = el("div", "pet-hud");
  hud.id = "pet-hud";
  hud.innerHTML = `
    <div class="pet-meter pet-meter--hunger" data-pet-meter="hunger">
      <span class="pet-meter-icon" aria-hidden="true">🍽️</span>
      <span class="pet-meter-track"><span class="pet-meter-fill" id="pet-hunger-fill"></span></span>
      <span class="pet-meter-val" id="pet-hunger-val"></span>
    </div>
    <div class="pet-meter pet-meter--hearts" data-pet-meter="hearts">
      <span class="pet-meter-icon" aria-hidden="true">💗</span>
      <span class="pet-meter-track"><span class="pet-meter-fill" id="pet-hearts-fill"></span></span>
      <span class="pet-meter-val" id="pet-hearts-val"></span>
    </div>
  `;
  const thought = el("div", "pet-thought");
  thought.id = "pet-thought";
  thought.hidden = true;

  const labelShop = () => (english() ? "Shop" : "商店");
  const labelBag = () => (english() ? "Bag" : "背包");
  const labelTreats = () => (english() ? "Treats" : "請食");

  fab.setAttribute("aria-label", labelTreats());
  fab.innerHTML = `<span class="treat-fab__emoji" aria-hidden="true">🍰</span><span class="treat-fab__label">${labelTreats()}</span>`;
  fab.appendChild(bagBadge);

  sheet.innerHTML = `
    <div class="treat-sheet-head">
      <h2 class="treat-sheet-title">${english() ? "Treats" : "請食"}</h2>
      <div class="treat-sheet-tabs" role="tablist">
        <button type="button" class="treat-tab" data-treat-tab="shop" role="tab">${labelShop()}</button>
        <button type="button" class="treat-tab" data-treat-tab="bag" role="tab">${labelBag()}</button>
      </div>
      <button type="button" class="treat-sheet-close" aria-label="${english() ? "Close" : "關閉"}">✕</button>
    </div>
    <p class="treat-sheet-hint"></p>
    <div class="treat-grid" id="treat-grid"></div>
  `;

  dock.appendChild(coinsEl);
  dock.appendChild(fab);
  root.appendChild(hud);
  root.appendChild(thought);
  root.appendChild(halo);
  root.appendChild(ghost);
  root.appendChild(backdrop);
  root.appendChild(sheet);
  root.appendChild(dock);

  const grid = sheet.querySelector("#treat-grid");
  const hint = sheet.querySelector(".treat-sheet-hint");
  const closeBtn = sheet.querySelector(".treat-sheet-close");

  const persist = () => {
    state = saveTreatState(state, storage);
  };

  const paintCoins = () => {
    coinsEl.textContent = `🪙 ${state.coins}`;
    const n = bagTotal(state);
    bagBadge.textContent = n > 0 ? String(n) : "";
    bagBadge.hidden = n < 1;
    fab.setAttribute("data-bag-count", String(n));
  };

  const paintTabs = () => {
    for (const btn of sheet.querySelectorAll(".treat-tab")) {
      const on = btn.getAttribute("data-treat-tab") === tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    }
    if (hint) {
      hint.textContent =
        tab === "shop"
          ? english()
            ? "Buy snacks with coins. Chat, pet her, or come back tomorrow to earn more."
            : "用金幣買零食。傾偈、摸摸佢、或者聽日再嚟會有零用錢。"
          : english()
            ? "Drag food onto her when she's hungry. She'll refuse if she's full."
            : "肚餓先拖食物去佢身上。食飽會搖頭唔食。";
    }
  };

  const paintHud = () => {
    const hungerFill = hud.querySelector("#pet-hunger-fill");
    const heartsFill = hud.querySelector("#pet-hearts-fill");
    const hungerVal = hud.querySelector("#pet-hunger-val");
    const heartsVal = hud.querySelector("#pet-hearts-val");
    const hunger = Math.round(Number(state.hunger) || 0);
    const hearts = Math.round(Number(state.hearts) || 0);
    if (hungerFill) hungerFill.style.width = `${hunger}%`;
    if (heartsFill) heartsFill.style.width = `${hearts}%`;
    if (hungerVal) hungerVal.textContent = String(hunger);
    if (heartsVal) heartsVal.textContent = String(hearts);
    hud.classList.toggle("is-hungry", isHungry(state));
    hud.classList.toggle("is-lonely", isLonely(state));
    fab.classList.toggle("is-hungry", isHungry(state));
    const bubble = thoughtForCare(state, english());
    if (bubble) {
      thought.hidden = false;
      thought.textContent = bubble;
      thought.classList.toggle("is-hungry", isHungry(state));
    } else {
      thought.hidden = true;
      thought.textContent = "";
    }
  };

  const paintGrid = () => {
    if (!grid) return;
    grid.innerHTML = "";
    if (tab === "shop") {
      for (const item of TREAT_ITEMS) {
        const card = el("button", "treat-card treat-card--shop");
        card.type = "button";
        card.dataset.treatId = item.id;
        card.innerHTML = `
          <span class="treat-card-emoji">${item.emoji}</span>
          <span class="treat-card-name">${treatDisplayName(item, english())}</span>
          <span class="treat-card-price">🪙 ${item.price}</span>
        `;
        card.addEventListener("click", () => buy(item.id));
        grid.appendChild(card);
      }
      return;
    }
    const owned = TREAT_ITEMS.filter((item) => bagCount(state, item.id) > 0);
    if (!owned.length) {
      grid.innerHTML = `<p class="treat-empty">${
        english() ? "Bag is empty — buy something in the shop." : "背包空嘅，去商店買嘢啦。"
      }</p>`;
      return;
    }
    for (const item of owned) {
      const card = el("button", "treat-card treat-card--bag");
      card.type = "button";
      card.dataset.treatId = item.id;
      card.innerHTML = `
        <span class="treat-card-emoji">${item.emoji}</span>
        <span class="treat-card-name">${treatDisplayName(item, english())}</span>
        <span class="treat-card-count">×${bagCount(state, item.id)}</span>
        <span class="treat-card-give">${english() ? "Give" : "餵佢"}</span>
      `;
      bindBagCard(card, item);
      grid.appendChild(card);
    }
  };

  const render = () => {
    paintCoins();
    paintTabs();
    paintGrid();
    paintHud();
  };

  const toast = (msg, kind = "info") => opts.onToast?.(msg, kind);

  const buy = (itemId) => {
    const item = getTreatItem(itemId);
    const result = buyTreat(state, itemId);
    state = result.state;
    persist();
    render();
    if (!result.ok) {
      toast(
        result.reason === "broke"
          ? (english() ? "Not enough coins" : "金幣唔夠")
          : (english() ? "Can't buy that" : "買唔到"),
        "error",
      );
      return false;
    }
    toast(
      english()
        ? `Got ${treatDisplayName(item, true)} — drag it from the bag`
        : `買咗${treatDisplayName(item, false)} — 去背包拖俾佢食`,
      "info",
    );
    tab = "bag";
    render();
    return true;
  };

  const dropRect = () => {
    try {
      return opts.getDropRect?.() || null;
    } catch {
      return null;
    }
  };

  const feed = (itemId, clientX, clientY) => {
    const result = tryFeedTreat(state, itemId, consumeTreat, now());
    lastOutcome = { ok: result.ok, reason: result.reason || "" };
    state = result.state;
    persist();
    render();
    const item = result.item || getTreatItem(itemId);
    if (!result.ok) {
      const line = result.reason === "empty" || result.reason === "unknown"
        ? (english() ? "None left" : "冇剩喇")
        : refuseLine(result.reason, english());
      if (result.reason === "empty" || result.reason === "unknown") {
        toast(line, "error");
      } else {
        const avatar = opts.getAvatar?.();
        avatar?.setEmotion?.("thinking");
        avatar?.playAction?.("headshake", { emotion: "thinking", single: true });
        opts.onFeed?.({
          item,
          action: "headshake",
          line,
          refused: true,
          reason: result.reason,
        });
      }
      return false;
    }
    if (eatStop) eatStop();
    eatStop = startTreatPerformance(opts.getAvatar?.(), item);
    const line = treatThanksLine(item, english());
    flyGhostToMouth(item.emoji, clientX, clientY);
    opts.onFeed?.({
      item,
      action: treatActionId(item),
      line,
      refused: false,
      reason: "",
    });
    return true;
  };

  const setHalo = (hot) => {
    halo.classList.toggle("is-visible", dragging);
    halo.classList.toggle("is-hot", Boolean(hot));
  };

  const moveGhost = (x, y, emoji) => {
    ghost.hidden = false;
    ghost.textContent = emoji || ghost.textContent;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  };

  const hideGhost = () => {
    ghost.hidden = true;
    ghost.classList.remove("is-eating");
  };

  const flyGhostToMouth = (emoji, fromX, fromY) => {
    const mouth = companionMouthPoint(dropRect());
    moveGhost(fromX, fromY, emoji);
    ghost.classList.add("is-eating");
    requestAnimationFrame(() => {
      ghost.style.left = `${mouth.x}px`;
      ghost.style.top = `${mouth.y}px`;
      ghost.style.transform = "translate(-50%, -50%) scale(0.35)";
      ghost.style.opacity = "0";
    });
    setTimeout(() => {
      ghost.style.transform = "";
      ghost.style.opacity = "";
      hideGhost();
    }, 620);
  };

  const bindBagCard = (card, item) => {
    let startX = 0;
    let startY = 0;
    let moved = false;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && dx * dx + dy * dy < 36) return;
      moved = true;
      dragging = true;
      document.body.classList.add("is-treat-dragging");
      const hot = isDropOnCompanion(ev.clientX, ev.clientY, dropRect());
      setHalo(hot);
      moveGhost(ev.clientX, ev.clientY, item.emoji);
    };
    const onUp = (ev) => {
      card.releasePointerCapture?.(ev.pointerId);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      const wasDragging = dragging;
      dragging = false;
      document.body.classList.remove("is-treat-dragging");
      setHalo(false);
      if (wasDragging) {
        const hot = isDropOnCompanion(ev.clientX, ev.clientY, dropRect());
        if (hot) feed(item.id, ev.clientX, ev.clientY);
        else hideGhost();
        return;
      }
      hideGhost();
      feed(item.id, ev.clientX, ev.clientY);
    };
    card.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      startX = ev.clientX;
      startY = ev.clientY;
      moved = false;
      card.setPointerCapture?.(ev.pointerId);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerup", onUp);
      card.addEventListener("pointercancel", onUp);
    });
  };

  const setOpen = (next) => {
    open = Boolean(next);
    sheet.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-open", open);
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) render();
  };

  const tick = (when = now()) => {
    state = { ...state, ...tickCare(state, when) };
    persist();
    render();
    return state;
  };

  const checkIn = () => {
    const result = checkInCare(state, state.coins, { isEnglish: english(), now: now() });
    state = { ...state, ...result.care, coins: result.coins };
    persist();
    render();
    if (result.claimedDaily && result.dailyCoins > 0) {
      toast(
        english()
          ? `Daily coins +${result.dailyCoins}`
          : `今日零用錢 +${result.dailyCoins}🪙`,
        "info",
      );
    }
    return result;
  };

  const applyChat = () => {
    const result = applyChatCare(state, state.coins, now());
    state = { ...state, ...result.care, coins: result.coins };
    persist();
    render();
    return result;
  };

  const applyPet = () => {
    const result = applyPetCare(state, state.coins, now());
    state = { ...state, ...result.care, coins: result.coins };
    persist();
    render();
    return result;
  };

  const setNeeds = (patch = {}) => {
    state = {
      ...state,
      hunger: patch.hunger != null ? Number(patch.hunger) : state.hunger,
      hearts: patch.hearts != null ? Number(patch.hearts) : state.hearts,
    };
    persist();
    render();
    return state;
  };

  const pollHungry = () => {
    const ask = maybeHungryAsk(state, english(), now());
    state = { ...state, ...ask.care };
    persist();
    render();
    if (ask.asked && ask.line) opts.onHungryAsk?.({ line: ask.line, thought: ask.thought });
    return ask;
  };

  fab.addEventListener("click", () => setOpen(!open));
  backdrop.addEventListener("click", () => setOpen(false));
  closeBtn?.addEventListener("click", () => setOpen(false));
  sheet.querySelectorAll(".treat-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.getAttribute("data-treat-tab") === "shop" ? "shop" : "bag";
      render();
    });
  });

  const onVis = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener?.("visibilitychange", onVis);
  const tickTimer = globalThis.setInterval?.(() => {
    tick();
    pollHungry();
  }, PET_HUD_TICK_MS);

  render();

  return {
    schema: COMPANION_TREAT_INTERACT_SCHEMA,
    root: dock,
    hud,
    thought,
    buy,
    feed,
    tick,
    checkIn,
    applyChat,
    applyPet,
    setNeeds,
    pollHungry,
    setOpen,
    render,
    get state() {
      return state;
    },
    get lastOutcome() {
      return lastOutcome;
    },
    get open() {
      return open;
    },
    dispose() {
      if (eatStop) eatStop();
      if (tickTimer) globalThis.clearInterval?.(tickTimer);
      document.removeEventListener?.("visibilitychange", onVis);
      dock.remove();
      sheet.remove();
      backdrop.remove();
      halo.remove();
      ghost.remove();
      hud.remove();
      thought.remove();
    },
  };
}
