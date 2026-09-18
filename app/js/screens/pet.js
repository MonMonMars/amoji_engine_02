import { registerRoute } from "../router.js";
import {
  loadTreatState,
  saveTreatState,
  bagCount,
} from "/amoji-engine/engine/companion/companionTreatStore.js";
import { getTreatItem, TREAT_ITEMS } from "/amoji-engine/engine/companion/companionTreatCatalog.js";
import {
  applyFeedCare,
  clampNeed,
  needPips,
  tickCare,
} from "/amoji-engine/engine/companion/companionPetCare.js";
import { syncToCloud } from "/amoji-engine/engine/mobile/companionCloudStorage.js";

registerRoute("pet", (ctx) => {
  const en = ctx.isEnglish();
  let state = tickCare(loadTreatState());

  const screen = document.createElement("section");
  screen.className = "screen";

  function renderMeters() {
    const hungerPips = needPips(state.hunger);
    const heartPips = needPips(state.hearts);
    return `
      <div class="meter-row"><span>${en ? "Hunger" : "飽肚"}</span><div class="meter"><span style="width:${state.hunger}%"></span></div></div>
      <div class="meter-row"><span>${en ? "Hearts" : "心情"}</span><div class="meter"><span style="width:${state.hearts}%"></span></div></div>
      <p style="margin:0.5rem 0 0;color:var(--muted);font-size:0.85rem">🪙 ${state.coins} · ${en ? "Pips" : "格數"} ${hungerPips}/${heartPips}</p>
    `;
  }

  function renderBag() {
    return TREAT_ITEMS.slice(0, 6)
      .map((item) => {
        const count = bagCount(state, item.id);
        const name = en ? item.name.en : item.name.yue;
        const label = count > 0 ? `×${count}` : en ? "buy" : "買";
        return `<button type="button" class="btn btn-secondary" data-feed="${item.id}" ${count <= 0 && state.coins < item.price ? "disabled" : ""}>${item.emoji} ${name} (${label})</button>`;
      })
      .join("");
  }

  screen.innerHTML = `
    <div class="topbar">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${en ? "Pet Care" : "寵物照顧"}</h1>
      <span></span>
    </div>
    <div class="panel" id="pet-meters">${renderMeters()}</div>
    <div class="panel">
      <h2 style="margin:0 0 0.75rem;font-size:1rem">${en ? "Feed & Play" : "餵食同玩耍"}</h2>
      <div class="stack" id="pet-bag">${renderBag()}</div>
      <button type="button" class="btn btn-primary" style="margin-top:0.85rem" data-action="pet">${en ? "Pet (+hearts)" : "摸摸 (+心情)"}</button>
    </div>
  `;

  const refresh = () => {
    state = tickCare(state);
    screen.querySelector("#pet-meters").innerHTML = renderMeters();
    screen.querySelector("#pet-bag").innerHTML = renderBag();
    bindBag();
  };

  function bindBag() {
    for (const btn of screen.querySelectorAll("[data-feed]")) {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-feed");
        if (!id) return;
        let count = bagCount(state, id);
        const item = getTreatItem(id);
        if (!item) return;
        if (count <= 0) {
          if (state.coins < item.price) {
            ctx.toast(en ? "Not enough coins" : "金幣唔夠");
            return;
          }
          state = { ...state, coins: state.coins - item.price, bag: { ...state.bag, [id]: 1 } };
          count = 1;
        }
        const itemRef = getTreatItem(id);
        const fed = applyFeedCare(state, itemRef, Date.now());
        if (!fed.ok) {
          const reason =
            fed.reason === "full"
              ? en
                ? "She is full!"
                : "佢飽啦！"
              : fed.reason === "same"
                ? en
                  ? "Try another snack"
                  : "換另一款小食啦"
                : en
                  ? "Cannot feed"
                  : "餵唔到";
          ctx.toast(reason);
          return;
        }
        state = {
          ...state,
          ...fed.care,
          bag: { ...state.bag, [id]: Math.max(0, bagCount(state, id) - 1) },
        };
        saveTreatState(state);
        syncToCloud({ baseUrl: ctx.baseUrl }).catch(() => {});
        ctx.toast(en ? item.thanks.en : item.thanks.yue);
        refresh();
      });
    }
  }

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => ctx.navigate("hub"));

  screen.querySelector('[data-action="pet"]')?.addEventListener("click", () => {
    state = {
      ...state,
      hearts: clampNeed(state.hearts + 8),
      coins: state.coins + 1,
    };
    saveTreatState(state);
    syncToCloud({ baseUrl: ctx.baseUrl }).catch(() => {});
    ctx.toast(en ? "She giggles!" : "佢笑咗！");
    refresh();
  });

  bindBag();
  return screen;
});
