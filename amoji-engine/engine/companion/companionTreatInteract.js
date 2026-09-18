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
import { closeUiOverlay, markUiFxButtons, openUiOverlay } from "./companionUiEffects.js";
import {
  applyChatCare,
  applyPetCare,
  checkInCare,
  isHungry,
  isLonely,
  maybeHungryAsk,
  needPips,
  needTone,
  refuseLine,
  thoughtForCare,
  tickCare,
  tryFeedTreat,
  PET_PIP_COUNT,
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
  avatar?.attachTreatProp?.(item);
  avatar?.playAction?.(action, { emotion: "happy", loop: true, single: true });
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    avatar?.detachTreatProp?.();
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
  const doc = root.ownerDocument || document;
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
  const wallet = el("div", "pet-wallet");
  wallet.id = "pet-wallet";
  wallet.appendChild(coinsEl);
  const halo = el("div", "treat-drop-halo");
  halo.id = "treat-drop-halo";
  halo.setAttribute("aria-hidden", "true");
  halo.innerHTML = `<span class="treat-drop-halo__hint"></span>`;
  const ghost = el("div", "treat-drag-ghost");
  ghost.id = "treat-drag-ghost";
  ghost.hidden = true;
  const sheet = el("div", "treat-sheet");
  sheet.id = "treat-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  const backdrop = el("div", "treat-sheet-backdrop");
  backdrop.id = "treat-sheet-backdrop";
  const pipRow = (id) =>
    Array.from({ length: PET_PIP_COUNT }, (_, i) =>
      `<span class="pet-pip" data-pip="${i}" id="${id}-${i}"></span>`,
    ).join("");
  const hud = el("div", "pet-hud");
  hud.id = "pet-hud";
  hud.innerHTML = `
    <div class="pet-hud-card">
      <div class="pet-meter pet-meter--hunger" data-pet-meter="hunger">
        <span class="pet-meter-badge" aria-hidden="true">🍽️</span>
        <div class="pet-meter-col">
          <div class="pet-meter-head">
            <span class="pet-meter-label" id="pet-hunger-label"></span>
            <span class="pet-meter-pips" id="pet-hunger-pips">${pipRow("pet-hunger-pip")}</span>
            <span class="pet-meter-val" id="pet-hunger-val"></span>
          </div>
          <span class="pet-meter-track"><span class="pet-meter-fill" id="pet-hunger-fill"></span></span>
        </div>
      </div>
      <div class="pet-meter pet-meter--hearts" data-pet-meter="hearts">
        <span class="pet-meter-badge" aria-hidden="true">💗</span>
        <div class="pet-meter-col">
          <div class="pet-meter-head">
            <span class="pet-meter-label" id="pet-hearts-label"></span>
            <span class="pet-meter-pips" id="pet-hearts-pips">${pipRow("pet-hearts-pip")}</span>
            <span class="pet-meter-val" id="pet-hearts-val"></span>
          </div>
          <span class="pet-meter-track"><span class="pet-meter-fill" id="pet-hearts-fill"></span></span>
        </div>
      </div>
    </div>
  `;
  const thought = el("div", "pet-thought");
  thought.id = "pet-thought";
  thought.hidden = true;
  thought.innerHTML = `<span class="pet-thought-text"></span>`;

  const labelShop = () => (english() ? "Shop" : "商店");
  const labelBag = () => (english() ? "Fridge" : "雪櫃");
  const labelKitchen = () => (english() ? "Kitchen" : "廚房");
  const labelFood = () => (english() ? "Food" : "肚餓");
  const labelMood = () => (english() ? "Fun" : "心情");

  fab.setAttribute("aria-label", labelKitchen());
  fab.innerHTML = `<span class="treat-fab__emoji" aria-hidden="true">🍳</span><span class="treat-fab__label">${labelKitchen()}</span>`;
  fab.appendChild(bagBadge);

  sheet.innerHTML = `
    <div class="treat-sheet-handle" aria-hidden="true"></div>
    <div class="treat-sheet-head">
      <div class="treat-sheet-titles">
        <p class="treat-sheet-kicker">${english() ? "Care room" : "照顧房間"}</p>
        <h2 class="treat-sheet-title">${labelKitchen()}</h2>
      </div>
      <span class="treat-sheet-wallet" id="treat-sheet-wallet"></span>
      <button type="button" class="treat-sheet-close" aria-label="${english() ? "Close" : "關閉"}">✕</button>
    </div>
    <div class="treat-sheet-tabs" role="tablist">
      <button type="button" class="treat-tab" data-treat-tab="bag" role="tab">${labelBag()}</button>
      <button type="button" class="treat-tab" data-treat-tab="shop" role="tab">${labelShop()}</button>
    </div>
    <p class="treat-sheet-hint"></p>
    <div class="treat-grid" id="treat-grid"></div>
  `;

  dock.appendChild(fab);
  root.appendChild(hud);
  root.appendChild(wallet);
  root.appendChild(thought);
  root.appendChild(halo);
  root.appendChild(ghost);
  root.appendChild(backdrop);
  root.appendChild(sheet);
  root.appendChild(dock);

  const grid = sheet.querySelector("#treat-grid");
  const hint = sheet.querySelector(".treat-sheet-hint");
  const closeBtn = sheet.querySelector(".treat-sheet-close");
  const sheetWallet = sheet.querySelector("#treat-sheet-wallet");
  const haloHint = halo.querySelector(".treat-drop-halo__hint");
  const thoughtText = thought.querySelector(".pet-thought-text");

  const persist = () => {
    state = saveTreatState(state, storage);
  };

  const paintCoins = () => {
    coinsEl.textContent = `🪙 ${state.coins}`;
    if (sheetWallet) sheetWallet.textContent = `🪙 ${state.coins}`;
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
            ? "Buy food with coins — fridge keeps it until you drag it to her mouth."
            : "用金幣買食物，放雪櫃，拖去佢嘴邊先食到。"
          : english()
            ? "Tap a snack to feed, or drag it to her mouth. She refuses when full."
            : "點一下餵佢，或者拖去嘴邊。食飽會搖頭唔食。";
    }
    if (haloHint) {
      haloHint.textContent = english() ? "Drop on her mouth" : "拖去嘴邊";
    }
  };

  const paintPipRow = (rowId, filled) => {
    const row = hud.querySelector(`#${rowId}`);
    if (!row) return;
    for (const pip of row.querySelectorAll(".pet-pip")) {
      const i = Number(pip.getAttribute("data-pip") || 0);
      pip.classList.toggle("is-on", i < filled);
    }
  };

  const paintHud = () => {
    const hungerFill = hud.querySelector("#pet-hunger-fill");
    const heartsFill = hud.querySelector("#pet-hearts-fill");
    const hungerVal = hud.querySelector("#pet-hunger-val");
    const heartsVal = hud.querySelector("#pet-hearts-val");
    const hungerLabel = hud.querySelector("#pet-hunger-label");
    const heartsLabel = hud.querySelector("#pet-hearts-label");
    const hunger = Math.round(Number(state.hunger) || 0);
    const hearts = Math.round(Number(state.hearts) || 0);
    if (hungerFill) hungerFill.style.width = `${hunger}%`;
    if (heartsFill) heartsFill.style.width = `${hearts}%`;
    if (hungerVal) hungerVal.textContent = `${hunger}%`;
    if (heartsVal) heartsVal.textContent = `${hearts}%`;
    if (hungerLabel) hungerLabel.textContent = labelFood();
    if (heartsLabel) heartsLabel.textContent = labelMood();
    paintPipRow("pet-hunger-pips", needPips(hunger));
    paintPipRow("pet-hearts-pips", needPips(hearts));
    const hungerMeter = hud.querySelector(".pet-meter--hunger");
    const heartsMeter = hud.querySelector(".pet-meter--hearts");
    hungerMeter?.setAttribute("data-tone", needTone(hunger, "hunger"));
    heartsMeter?.setAttribute("data-tone", needTone(hearts, "hearts"));
    hud.classList.toggle("is-hungry", isHungry(state));
    hud.classList.toggle("is-lonely", isLonely(state));
    fab.classList.toggle("is-hungry", isHungry(state));
    const bubble = thoughtForCare(state, english());
    if (bubble) {
      thought.hidden = false;
      if (thoughtText) thoughtText.textContent = bubble;
      else thought.textContent = bubble;
      thought.classList.toggle("is-hungry", isHungry(state));
    } else {
      thought.hidden = true;
      if (thoughtText) thoughtText.textContent = "";
      else thought.textContent = "";
    }
  };

  const itemStatsHtml = (item) =>
    `<span class="treat-card-stats"><span>🍽️+${item.hunger}</span><span>💗+${item.hearts}</span></span>`;

  const paintGrid = () => {
    if (!grid) return;
    grid.innerHTML = "";
    if (tab === "shop") {
      for (const item of TREAT_ITEMS) {
        const card = el("button", "treat-card treat-card--shop");
        card.type = "button";
        card.dataset.treatId = item.id;
        const owned = bagCount(state, item.id);
        card.classList.toggle("is-broke", state.coins < item.price);
        card.innerHTML = `
          <span class="treat-card-emoji">${item.emoji}</span>
          <span class="treat-card-name">${treatDisplayName(item, english())}</span>
          ${itemStatsHtml(item)}
          <span class="treat-card-price">🪙 ${item.price}</span>
          ${owned > 0 ? `<span class="treat-card-owned">×${owned}</span>` : ""}
        `;
        card.addEventListener("click", () => buy(item.id));
        grid.appendChild(card);
      }
      return;
    }
    const ownedItems = TREAT_ITEMS.filter((item) => bagCount(state, item.id) > 0);
    if (!ownedItems.length) {
      grid.innerHTML = `<p class="treat-empty">${
        english() ? "Fridge is empty — buy something in the shop." : "雪櫃空嘅，去商店買嘢啦。"
      }</p>`;
      return;
    }
    for (const item of ownedItems) {
      const card = el("button", "treat-card treat-card--bag");
      card.type = "button";
      card.dataset.treatId = item.id;
      card.innerHTML = `
        <span class="treat-card-emoji">${item.emoji}</span>
        <span class="treat-card-name">${treatDisplayName(item, english())}</span>
        ${itemStatsHtml(item)}
        <span class="treat-card-count">×${bagCount(state, item.id)}</span>
        <span class="treat-card-give">${english() ? "Tap to feed" : "點一下餵"}</span>
      `;
      bindBagCard(card, item);
      grid.appendChild(card);
    }
    markUiFxButtons(grid, doc);
  };

  const render = () => {
    paintCoins();
    paintTabs();
    paintGrid();
    paintHud();
    markUiFxButtons(sheet, doc);
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
        ? `Got ${treatDisplayName(item, true)} — drag it from the fridge`
        : `買咗${treatDisplayName(item, false)} — 去雪櫃拖去嘴邊`,
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
    let dragSession = false;
    const finishPointer = (ev) => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
      const wasDragging = dragSession;
      dragSession = false;
      dragging = false;
      document.body.classList.remove("is-treat-dragging");
      doc.body?.classList?.remove("companion-treat-dragging");
      setHalo(false);
      if (wasDragging) {
        const hot = isDropOnCompanion(ev.clientX, ev.clientY, dropRect());
        if (hot) feed(item.id, ev.clientX, ev.clientY);
        else hideGhost();
        return;
      }
      if (!moved) {
        hideGhost();
        feed(item.id, ev.clientX, ev.clientY);
      } else {
        hideGhost();
      }
    };
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && dx * dx + dy * dy < 64) return;
      moved = true;
      dragSession = true;
      dragging = true;
      document.body.classList.add("is-treat-dragging");
      doc.body?.classList?.add("companion-treat-dragging");
      const hot = isDropOnCompanion(ev.clientX, ev.clientY, dropRect());
      setHalo(hot);
      moveGhost(ev.clientX, ev.clientY, item.emoji);
    };
    const onUp = (ev) => finishPointer(ev);
    card.addEventListener("click", (ev) => {
      if (moved || dragSession) return;
      ev.stopPropagation();
      feed(item.id, ev.clientX, ev.clientY);
    });
    card.addEventListener("pointerdown", (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      startX = ev.clientX;
      startY = ev.clientY;
      moved = false;
      dragSession = false;
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerup", onUp);
      card.addEventListener("pointercancel", onUp);
    });
  };

  const setOpen = (next) => {
    const wantOpen = Boolean(next);
    if (!wantOpen && !open) {
      const stuckOpen =
        sheet.classList.contains("is-open") ||
        backdrop.classList.contains("is-open");
      if (stuckOpen) {
        closeUiOverlay(doc, {
          panel: sheet,
          backdrop,
          bodyClass: "companion-treat-open",
          panelOpenClass: "is-open",
          backdropOpenClass: "is-open",
          hidePanelOnClose: false,
        });
      }
      return;
    }
    if (wantOpen === open) return;
    open = wantOpen;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    doc.body?.classList?.toggle("companion-treat-open", open);
    if (open) {
      openUiOverlay(doc, {
        panel: sheet,
        backdrop,
        bodyClass: "companion-treat-open",
        panelOpenClass: "is-open",
        backdropOpenClass: "is-open",
      });
      render();
      return;
    }
    closeUiOverlay(doc, {
      panel: sheet,
      backdrop,
      bodyClass: "companion-treat-open",
      panelOpenClass: "is-open",
      backdropOpenClass: "is-open",
      hidePanelOnClose: false,
    });
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
    wallet,
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
      wallet.remove();
      thought.remove();
    },
  };
}
