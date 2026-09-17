/**
 * Pet-game treat dock — shop, bag, pointer drag onto the companion.
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

export const COMPANION_TREAT_INTERACT_SCHEMA = "amoji.companionTreatInteract.v1";

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
 *   onFeed?: (info: { item: object, action: string, line: string }) => void,
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
            ? "Buy a snack, then drag it from the bag onto her."
            : "買咗之後去背包，拖去佢度食。"
          : english()
            ? "Drag food onto her — she will eat it."
            : "拖食物去佢身上，佢會真係食。";
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
    const item = getTreatItem(itemId);
    if (!item) return false;
    const result = consumeTreat(state, item.id);
    if (!result.ok) {
      toast(english() ? "None left" : "冇剩喇", "error");
      return false;
    }
    state = result.state;
    persist();
    render();
    if (eatStop) eatStop();
    eatStop = startTreatPerformance(opts.getAvatar?.(), item);
    const line = treatThanksLine(item, english());
    flyGhostToMouth(item.emoji, clientX, clientY);
    opts.onFeed?.({
      item,
      action: treatActionId(item),
      line,
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

  fab.addEventListener("click", () => setOpen(!open));
  backdrop.addEventListener("click", () => setOpen(false));
  closeBtn?.addEventListener("click", () => setOpen(false));
  sheet.querySelectorAll(".treat-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.getAttribute("data-treat-tab") === "shop" ? "shop" : "bag";
      render();
    });
  });

  render();

  return {
    schema: COMPANION_TREAT_INTERACT_SCHEMA,
    root: dock,
    buy,
    feed,
    setOpen,
    render,
    get state() {
      return state;
    },
    get open() {
      return open;
    },
    dispose() {
      if (eatStop) eatStop();
      dock.remove();
      sheet.remove();
      backdrop.remove();
      halo.remove();
      ghost.remove();
    },
  };
}
