import { registerRoute } from "../router.js";
import {
  CHASE_ROUND_SECONDS,
  applyChaseResult,
  chaseDifficultyConfig,
  formatChaseSummary,
  normalizeChaseSave,
  rollDailyChase,
} from "/amoji-engine/engine/mobile/companionChaseGame.js";
import {
  loadLocalChaseState,
  saveLocalChaseState,
  syncToCloud,
} from "/amoji-engine/engine/mobile/companionCloudStorage.js";
import {
  loadTreatState,
  saveTreatState,
} from "/amoji-engine/engine/companion/companionTreatStore.js";
import { loadMobileSettings } from "/amoji-engine/engine/mobile/companionMobileSettings.js";

registerRoute("chase", (ctx) => {
  const en = ctx.isEnglish();
  const settings = loadMobileSettings();
  const difficulty = /** @type {"easy"|"normal"|"hard"} */ (settings.chaseDifficulty || "normal");
  const cfg = chaseDifficultyConfig(difficulty);
  const premium = Boolean(ctx.getSession()?.entitlements?.premium);

  let chaseSave = rollDailyChase(normalizeChaseSave(loadLocalChaseState() || undefined));
  let running = false;
  let catches = 0;
  let score = 0;
  let timeLeft = CHASE_ROUND_SECONDS;
  /** @type {number | null} */
  let timer = null;
  /** @type {number | null} */
  let spawnTimer = null;

  const screen = document.createElement("section");
  screen.className = "screen";

  screen.innerHTML = `
    <div class="topbar">
      <button type="button" class="btn btn-secondary" data-action="back">←</button>
      <h1>${en ? "Chase!" : "追逐！"}</h1>
      <span class="chip" id="chase-score">0</span>
    </div>
    <div class="chase-stage" id="chase-stage">
      <div class="chase-hud">
        <span class="chip" id="chase-timer">${CHASE_ROUND_SECONDS}s</span>
        <span class="chip" id="chase-catches">0 / ${cfg.catchGoal}</span>
      </div>
      <div class="chase-player" id="chase-player" style="left:50%;top:82%">🏃</div>
      <div class="chase-overlay" id="chase-overlay">
        <div class="stack">
          <p style="margin:0;color:var(--muted);text-align:center;line-height:1.5">${
            en
              ? "Drag to move. Catch the girl before time runs out!"
              : "拖曳移動，限時捉住佢！"
          }</p>
          <button type="button" class="btn btn-primary" data-action="start">${en ? "Start Run" : "開始"}</button>
        </div>
      </div>
    </div>
  `;

  const stage = /** @type {HTMLElement} */ (screen.querySelector("#chase-stage"));
  const player = /** @type {HTMLElement} */ (screen.querySelector("#chase-player"));
  const overlay = /** @type {HTMLElement} */ (screen.querySelector("#chase-overlay"));
  const scoreEl = /** @type {HTMLElement} */ (screen.querySelector("#chase-score"));
  const timerEl = /** @type {HTMLElement} */ (screen.querySelector("#chase-timer"));
  const catchesEl = /** @type {HTMLElement} */ (screen.querySelector("#chase-catches"));

  /** @type {{ el: HTMLElement, vx: number, vy: number }[]} */
  let girls = [];

  function placePlayer(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = Math.max(24, Math.min(rect.width - 24, clientX - rect.left));
    const y = Math.max(48, Math.min(rect.height - 24, clientY - rect.top));
    player.style.left = `${(x / rect.width) * 100}%`;
    player.style.top = `${(y / rect.height) * 100}%`;
  }

  function spawnGirl() {
    const el = document.createElement("div");
    el.className = "chase-girl";
    el.textContent = premium ? "✨" : "👧";
    const rect = stage.getBoundingClientRect();
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 45;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    stage.appendChild(el);
    girls.push({
      el,
      vx: (Math.random() - 0.5) * cfg.girlSpeed,
      vy: (Math.random() - 0.5) * cfg.girlSpeed,
    });
  }

  function tickGirls() {
    const rect = stage.getBoundingClientRect();
    const px = (parseFloat(player.style.left) / 100) * rect.width;
    const py = (parseFloat(player.style.top) / 100) * rect.height;

    for (let i = girls.length - 1; i >= 0; i -= 1) {
      const g = girls[i];
      let lx = parseFloat(g.el.style.left);
      let ly = parseFloat(g.el.style.top);
      const gx = (lx / 100) * rect.width;
      const gy = (ly / 100) * rect.height;
      const dx = px - gx;
      const dy = py - gy;
      const dist = Math.hypot(dx, dy) || 1;
      lx += ((dx / dist) * cfg.girlSpeed) / rect.width * 100 * 0.35;
      ly += ((dy / dist) * cfg.girlSpeed) / rect.height * 100 * 0.35;
      g.el.style.left = `${Math.max(5, Math.min(95, lx))}%`;
      g.el.style.top = `${Math.max(8, Math.min(75, ly))}%`;
      if (dist < 36) {
        g.el.remove();
        girls.splice(i, 1);
        catches += 1;
        score += 100 + Math.floor(Math.random() * 40);
        scoreEl.textContent = String(score);
        catchesEl.textContent = `${catches} / ${cfg.catchGoal}`;
        if (catches >= cfg.catchGoal) finishRound();
      }
    }
  }

  function finishRound() {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);
    if (spawnTimer) clearInterval(spawnTimer);
    timer = null;
    spawnTimer = null;
    for (const g of girls) g.el.remove();
    girls = [];

    const coins = catches * cfg.coinPerCatch + (catches >= cfg.catchGoal ? 25 : 0);
    chaseSave = applyChaseResult(chaseSave, { catches, score, coins });
    saveLocalChaseState(chaseSave);

    const treats = loadTreatState();
    saveTreatState({ ...treats, coins: treats.coins + coins });
    syncToCloud({ baseUrl: ctx.baseUrl }).catch(() => {});

    overlay.classList.remove("hidden");
    overlay.innerHTML = `
      <div class="stack">
        <strong>${formatChaseSummary(en, { catches, coins, goal: cfg.catchGoal })}</strong>
        <button type="button" class="btn btn-primary" data-action="start">${en ? "Play Again" : "再玩"}</button>
        <button type="button" class="btn btn-secondary" data-action="hub">${en ? "Home" : "主頁"}</button>
      </div>
    `;
    overlay.querySelector('[data-action="start"]')?.addEventListener("click", startRound);
    overlay.querySelector('[data-action="hub"]')?.addEventListener("click", () => ctx.navigate("hub"));
    ctx.toast(formatChaseSummary(en, { catches, coins, goal: cfg.catchGoal }));
  }

  function startRound() {
    catches = 0;
    score = 0;
    timeLeft = CHASE_ROUND_SECONDS;
    running = true;
    scoreEl.textContent = "0";
    catchesEl.textContent = `0 / ${cfg.catchGoal}`;
    timerEl.textContent = `${timeLeft}s`;
    overlay.classList.add("hidden");
    for (const g of girls) g.el.remove();
    girls = [];
    spawnGirl();

    timer = setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = `${timeLeft}s`;
      tickGirls();
      if (timeLeft <= 0) finishRound();
    }, 1000);

    spawnTimer = setInterval(() => {
      if (running) spawnGirl();
    }, cfg.spawnMs * (premium ? 1.1 : 1));
  }

  stage.addEventListener("pointerdown", (ev) => {
    if (!running) return;
    placePlayer(ev.clientX, ev.clientY);
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener("pointermove", (ev) => {
    if (!running) return;
    placePlayer(ev.clientX, ev.clientY);
  });

  screen.querySelector('[data-action="back"]')?.addEventListener("click", () => {
    if (timer) clearInterval(timer);
    if (spawnTimer) clearInterval(spawnTimer);
    ctx.navigate("hub");
  });

  overlay.querySelector('[data-action="start"]')?.addEventListener("click", startRound);

  return screen;
});
