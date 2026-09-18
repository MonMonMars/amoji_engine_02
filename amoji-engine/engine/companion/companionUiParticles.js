/**
 * Lightweight DOM sparkle bursts — gacha / AAA tap feedback.
 */
export const COMPANION_UI_PARTICLES_SCHEMA = "amoji.companionUiParticles.v1";

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {{
 *   x: number,
 *   y: number,
 *   root?: HTMLElement | null,
 *   count?: number,
 *   hue?: number,
 *   spread?: number,
 * }} opts
 */
export function spawnUiParticles(opts = {}) {
  if (typeof document === "undefined") return 0;
  const root = opts.root || document.body;
  const count = clamp(Number(opts.count) || 10, 4, 24);
  const hue = Number(opts.hue) || 212;
  const spread = Number(opts.spread) || 42;
  const x = Number(opts.x) || 0;
  const y = Number(opts.y) || 0;
  const layer = document.createElement("div");
  layer.className = "ui-fx-particle-layer";
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  root.appendChild(layer);

  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("span");
    p.className = "ui-fx-particle";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = spread * (0.45 + Math.random() * 0.75);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const size = 3 + Math.random() * 5;
    const h = hue + (Math.random() - 0.5) * 36;
    p.style.setProperty("--px", `${dx.toFixed(1)}px`);
    p.style.setProperty("--py", `${dy.toFixed(1)}px`);
    p.style.setProperty("--ps", `${size.toFixed(1)}px`);
    p.style.background = `hsl(${h} 88% 72%)`;
    p.style.boxShadow = `0 0 ${size * 2}px hsl(${h} 90% 68% / 0.65)`;
    layer.appendChild(p);
  }

  globalThis.setTimeout?.(() => layer.remove(), 720);
  return count;
}

/**
 * Ring burst around an element (mic live, card select).
 * @param {Element | null | undefined} el
 * @param {{ hue?: number }} [opts]
 */
export function spawnUiRingBurst(el, opts = {}) {
  if (!el || typeof el.getBoundingClientRect !== "function") return;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  spawnUiParticles({
    x,
    y,
    hue: opts.hue ?? 212,
    count: 14,
    spread: Math.max(rect.width, rect.height) * 0.55,
  });
}
