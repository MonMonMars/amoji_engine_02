/**
 * Japanese anime / VN / gacha-game style scene painters (SVG body fragments).
 * Rich layered gradients, neon, bokeh, perspective interiors, atmospheric depth.
 */
export const SCENE_ANIME_ART_REVISION = "anime-scene-v460-pro-expansion";

/** @param {number} w @param {number} h */
export function animePaintDefs(w, h) {
  return `<defs>
  <linearGradient id="skyTop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#121828"/>
    <stop offset="32%" stop-color="#243050"/>
    <stop offset="58%" stop-color="#2a3848"/>
    <stop offset="100%" stop-color="#0a0e14"/>
  </linearGradient>
  <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#6eb4e0"/>
    <stop offset="38%" stop-color="#a8cce8"/>
    <stop offset="70%" stop-color="#d8c098"/>
    <stop offset="100%" stop-color="#6a8868"/>
  </linearGradient>
  <linearGradient id="skySunset" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ff6b4a"/>
    <stop offset="28%" stop-color="#d84888"/>
    <stop offset="55%" stop-color="#683878"/>
    <stop offset="100%" stop-color="#120818"/>
  </linearGradient>
  <linearGradient id="haze" x1="0" y1="0.4" x2="0" y2="1">
    <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
    <stop offset="100%" stop-color="#c8d8f0" stop-opacity="0.22"/>
  </linearGradient>
  <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="neonGlow" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="6" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="paintSoft" x="-2%" y="-2%" width="104%" height="104%">
    <feGaussianBlur stdDeviation="0.6"/>
  </filter>
  <radialGradient id="sunDisc" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%" stop-color="#fff8e8"/>
    <stop offset="55%" stop-color="#ffd080"/>
    <stop offset="100%" stop-color="#ff904000"/>
  </radialGradient>
  <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%" stop-color="#fffef8"/>
    <stop offset="40%" stop-color="#e8e0f0"/>
    <stop offset="100%" stop-color="#e8e0f000"/>
  </radialGradient>
  <linearGradient id="wallWarm" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#fff0e4"/>
    <stop offset="45%" stop-color="#e8c8b0"/>
    <stop offset="100%" stop-color="#c8a088"/>
  </linearGradient>
  <linearGradient id="wallCool" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#eef2f8"/>
    <stop offset="100%" stop-color="#b8c0d0"/>
  </linearGradient>
  <linearGradient id="floorWood" x1="0" y1="0.6" x2="0" y2="1">
    <stop offset="0%" stop-color="#a88870"/>
    <stop offset="100%" stop-color="#685040"/>
  </linearGradient>
  <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0%" stop-color="#fff8e0"/>
    <stop offset="70%" stop-color="#ffd898" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="#ffd898" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.78">
    <stop offset="55%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#030508" stop-opacity="0.38"/>
  </radialGradient>
  <linearGradient id="filmGrade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#283858" stop-opacity="0.14"/>
    <stop offset="42%" stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.32"/>
  </linearGradient>
  <radialGradient id="stageGlow" cx="0.5" cy="0.62" r="0.55">
    <stop offset="0%" stop-color="#fff" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
</defs>`;
}

/** Cel-shaded rim light + soft bloom streaks (VN / gacha key art finish). */
export function animeDetailPass(w, h) {
  let sparkles = "";
  for (let i = 0; i < 22; i += 1) {
    const cx = ((i * 173) % 1000) / 1000 * w;
    const cy = ((i * 211 + 31) % 1000) / 1000 * h * 0.72;
    const r = 0.5 + (i % 4) * 0.28;
    sparkles += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.025 + (i % 5) * 0.008).toFixed(3)}" filter="url(#softGlow)"/>`;
  }
  const flare = `<ellipse cx="${w * 0.78}" cy="${h * 0.12}" rx="${w * 0.18}" ry="${h * 0.06}" fill="#fff8e8" opacity="0.045" filter="url(#softGlow)"/>
  <ellipse cx="${w * 0.22}" cy="${h * 0.2}" rx="${w * 0.1}" ry="${h * 0.04}" fill="#c8e8ff" opacity="0.035" filter="url(#softGlow)"/>`;
  return `${sparkles}${flare}`;
}

/** Extra depth: dust, floor haze, vignette (appended to every regenerated scene). */
export function animeSceneFinisher(w, h) {
  let dust = "";
  for (let i = 0; i < 28; i += 1) {
    const cx = ((i * 137) % 1000) / 1000 * w;
    const cy = ((i * 89 + 17) % 1000) / 1000 * h * 0.85;
    const r = 0.6 + (i % 3) * 0.35;
    dust += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(0.022 + (i % 4) * 0.01).toFixed(3)}"/>`;
  }
  return `${dust}
  ${animeDetailPass(w, h)}
  <rect width="${w}" height="${h}" fill="url(#stageGlow)"/>
  <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.14"/>
  <rect width="${w}" height="${h}" fill="url(#filmGrade)"/>
  <rect width="${w}" height="${h}" fill="url(#vignette)"/>
  <rect x="0" y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="#000" opacity="0.14"/>`;
}

/** Anime window — city bokeh at night. */
export function animeWindowCityView(w, h, x, y, ww, wh) {
  let lights = "";
  for (let i = 0; i < 24; i += 1) {
    const bx = x + 8 + (i % 6) * (ww / 6);
    const by = y + wh * 0.35 + Math.floor(i / 6) * 22;
    const bh = 20 + (i % 4) * 18;
    lights += `<rect x="${bx}" y="${by}" width="${ww / 8}" height="${bh}" fill="#1a2438" opacity="0.85"/>
    <rect x="${bx + 3}" y="${by + 4}" width="4" height="5" fill="#ffe8b0" opacity="${(i % 3) + 0.4}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="url(#skyTop)"/>
  ${lights}
  ${bokehLights(12, ww, wh)}
  <rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="none" stroke="#584838" stroke-width="6"/>
  <path d="M${x + ww / 2} ${y} L${x + ww / 2} ${y + wh} M${x} ${y + wh / 2} L${x + ww} ${y + wh / 2}" stroke="#584838" stroke-width="2"/>`;
}

/** @param {number} w @param {number} h */
export function drawCozyRoomArt(w, h) {
  const wx = w * 0.55;
  const wy = h * 0.08;
  const ww = w * 0.38;
  const wh = h * 0.42;
  let fairy = "";
  for (let i = 0; i < 16; i += 1) {
    const fx = w * 0.12 + (i % 8) * (w * 0.1);
    const fy = h * 0.06 + Math.floor(i / 8) * 28;
    fairy += `<circle cx="${fx}" cy="${fy}" r="3" fill="#ffd898" opacity="0.85" filter="url(#softGlow)"/>`;
  }
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#wallWarm)"/>
  <polygon points="0,${h * 0.52} 0,${h} ${w},${h} ${w},${h * 0.52} ${w * 0.82},${h * 0.58} ${w * 0.18},${h * 0.58}" fill="url(#floorWood)"/>
  ${Array.from({ length: 16 }, (_, i) => {
    const x1 = (i / 16) * w;
    const x2 = w * 0.18 + (i / 16) * (w * 0.64);
    return `<line x1="${x1}" y1="${h}" x2="${x2}" y2="${h * 0.58}" stroke="#000" stroke-opacity="0.1" stroke-width="1"/>`;
  }).join("")}
  ${animeWindowCityView(w, h, wx, wy, ww, wh)}
  ${fairy}
  <rect x="${w * 0.06}" y="${h * 0.22}" width="${w * 0.12}" height="${h * 0.32}" fill="#786050" opacity="0.55" rx="4"/>
  ${Array.from({ length: 5 }, (_, i) => `<rect x="${w * 0.07}" y="${h * 0.24 + i * 38}" width="${w * 0.1}" height="28" fill="${i % 2 ? "#e87888" : "#88a8d8"}" opacity="0.5" rx="2"/>`).join("")}
  <ellipse cx="${w * 0.28}" cy="${h * 0.78}" rx="130" ry="38" fill="#a87868" opacity="0.75"/>
  <rect x="${w * 0.18}" y="${h * 0.62}" width="200" height="55" rx="18" fill="#c89888"/>
  <rect x="${w * 0.2}" y="${h * 0.58}" width="180" height="22" rx="10" fill="#fff" opacity="0.12"/>
  <ellipse cx="${w * 0.72}" cy="${h * 0.72}" rx="55" ry="70" fill="#388848" opacity="0.75"/>
  <rect x="${w * 0.69}" y="${h * 0.55}" width="12" height="90" fill="#584838"/>
  <circle cx="${w * 0.88}" cy="${h * 0.32}" r="55" fill="url(#lampGlow)"/>
  <rect x="${w * 0.86}" y="${h * 0.28}" width="8" height="120" fill="#484848"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.45}" rx="200" ry="120" fill="#fff8e8" opacity="0.08"/>`;
}

/** @param {number} w @param {number} h */
export function drawStudioArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#181c24"/>
  <rect width="${w}" height="${h * 0.55}" fill="url(#wallCool)"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.56}" rx="${w * 0.44}" ry="${h * 0.34}" fill="#eceef4"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.58}" rx="${w * 0.36}" ry="${h * 0.26}" fill="#fafbfc"/>
  <polygon points="0,${h * 0.64} 0,${h} ${w},${h} ${w},${h * 0.64} ${w * 0.8},${h * 0.7} ${w * 0.2},${h * 0.7}" fill="#788090" opacity="0.75"/>
  <rect x="${w * 0.06}" y="${h * 0.1}" width="72" height="120" fill="#fff" opacity="0.88" rx="4" filter="url(#softGlow)"/>
  <rect x="${w * 0.84}" y="${h * 0.1}" width="72" height="120" fill="#fff" opacity="0.88" rx="4" filter="url(#softGlow)"/>
  <rect x="${w * 0.38}" y="${h * 0.06}" width="100" height="68" fill="#fff" opacity="0.55" rx="3" filter="url(#softGlow)"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.34}" rx="140" ry="90" fill="#fff" opacity="0.07" filter="url(#softGlow)"/>`;
}

/** @param {number} n @param {number} w @param {number} h @param {number} [maxY] */
export function starField(n, w, h, maxY = h * 0.55) {
  let s = "";
  for (let i = 0; i < n; i += 1) {
    const x = ((i * 7919) % 997) / 997 * w;
    const y = ((i * 6271) % 991) / 991 * maxY;
    const r = 0.4 + (i % 3) * 0.35;
    const o = 0.35 + (i % 5) * 0.12;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  return s;
}

/** @param {number} n @param {number} w @param {number} h */
export function bokehLights(n, w, h) {
  let s = "";
  for (let i = 0; i < n; i += 1) {
    const x = ((i * 3571) % 1000) / 1000 * w;
    const y = h * 0.15 + ((i * 4219) % 1000) / 1000 * h * 0.55;
    const r = 8 + (i % 7) * 6;
    const hue = i % 3 === 0 ? "#ffb8e8" : i % 3 === 1 ? "#88d8ff" : "#ffe8a8";
    s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${hue}" opacity="0.12" filter="url(#softGlow)"/>`;
  }
  return s;
}

/** @param {number} w @param {number} h @param {string} [fill] */
export function godRays(w, h, fill = "#fff8e8") {
  let s = "";
  const cx = w * 0.72;
  const cy = h * 0.08;
  for (let i = 0; i < 9; i += 1) {
    const a1 = -0.35 + i * 0.08;
    const a2 = a1 + 0.04;
    const x1 = cx + Math.cos(a1) * h * 1.2;
    const y1 = cy + Math.sin(a1) * h * 1.2;
    const x2 = cx + Math.cos(a2) * h * 1.2;
    const y2 = cy + Math.sin(a2) * h * 1.2;
    s += `<polygon points="${cx},${cy} ${x1},${y1} ${x2},${y2}" fill="${fill}" opacity="0.04"/>`;
  }
  return s;
}

/** @param {number} w @param {number} h */
export function animeCloudLayers(w, h) {
  let s = "";
  for (let i = 0; i < 12; i += 1) {
    const y = h * (0.08 + (i % 4) * 0.06);
    const x = ((i * 131) % 80) / 100 * w;
    const sc = 1.2 + (i % 3) * 0.4;
    s += `<ellipse cx="${x}" cy="${y}" rx="${120 * sc}" ry="${28 * sc}" fill="#fff" opacity="${0.06 + (i % 3) * 0.03}"/>`;
    s += `<ellipse cx="${x + 60}" cy="${y - 8}" rx="${90 * sc}" ry="${22 * sc}" fill="#fff" opacity="0.05"/>`;
  }
  return s;
}

/** @param {number} w @param {number} h */
export function mountainLayers(w, h) {
  return `<polygon points="0,${h * 0.72} ${w * 0.22},${h * 0.38} ${w * 0.42},${h * 0.72}" fill="#384858" opacity="0.85"/>
  <polygon points="${w * 0.28},${h * 0.72} ${w * 0.52},${h * 0.32} ${w * 0.78},${h * 0.72}" fill="#506878" opacity="0.9"/>
  <polygon points="${w * 0.55},${h * 0.72} ${w * 0.78},${h * 0.4} ${w},${h * 0.72}" fill="#3a4858"/>
  <polygon points="${w * 0.48},${h * 0.38} ${w * 0.52},${h * 0.32} ${w * 0.56},${h * 0.38}" fill="#fff" opacity="0.75"/>`;
}

/** Detailed skyline for swatch / alternate night-city art */
export function drawNightCityArt(w, h) {
  let buildings = "";
  for (let i = 0; i < 36; i += 1) {
    const bw = 18 + (i % 7) * 14;
    const bh = 90 + (i * 47) % 320;
    const x = -10 + i * 36;
    const y = h - 48 - bh;
    const tone = 12 + (i % 5) * 8;
    buildings += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="rgb(${tone + 8},${tone + 12},${tone + 28})"/>`;
    for (let r = 0; r < Math.floor(bh / 16); r += 1) {
      for (let c = 0; c < Math.floor(bw / 10); c += 1) {
        if ((i + r + c) % 4 === 0) continue;
        const lit = (i * r + c) % 5 !== 0;
        buildings += `<rect x="${x + 4 + c * 10}" y="${y + 8 + r * 16}" width="5" height="7" rx="0.5" fill="${lit ? "#ffe8b8" : "#1a2438"}" opacity="${lit ? 0.75 : 0.35}"/>`;
      }
    }
    if (i % 4 === 0) {
      buildings += `<rect x="${x + 2}" y="${y + bh - 24}" width="${bw - 4}" height="4" fill="#ff6eb4" opacity="0.85" filter="url(#neonGlow)"/>`;
    }
  }
  const wires = Array.from({ length: 6 }, (_, i) => {
    const y0 = h * 0.25 + i * 18;
    return `<path d="M0 ${y0} Q${w * 0.5} ${y0 + 12} ${w} ${y0 - 4}" fill="none" stroke="#1a2030" stroke-width="1.2" opacity="0.5"/>`;
  }).join("");
  let reflect = "";
  for (let i = 0; i < 36; i += 1) {
    const bw = 18 + (i % 7) * 14;
    const bh = 90 + (i * 47) % 320;
    const x = -10 + i * 36;
    const y = h - 48 + 48;
    reflect += `<rect x="${x}" y="${y - bh * 0.35}" width="${bw}" height="${bh * 0.35}" fill="#ff88cc" opacity="0.06" transform="scale(1,-1) translate(0,${-h})"/>`;
  }
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyTop)"/>
  ${starField(180, w, h)}
  ${bokehLights(28, w, h)}
  ${godRays(w, h, "#c8b8ff")}
  ${bokehLights(45, w, h)}
  <circle cx="${w * 0.78}" cy="${h * 0.12}" r="52" fill="url(#moonGlow)" opacity="0.7"/>
  <circle cx="${w * 0.78}" cy="${h * 0.12}" r="22" fill="#f5f0dc"/>
  ${animeCloudLayers(w, h)}
  ${buildings}
  ${wires}
  <rect x="0" y="${h - 48}" width="${w}" height="48" fill="#060810"/>
  <rect x="0" y="${h - 52}" width="${w}" height="12" fill="#1a2030"/>
  <rect x="0" y="${h - 50}" width="${w}" height="4" fill="#48d8ff" opacity="0.25" filter="url(#neonGlow)"/>
  ${reflect}
  <rect x="0" y="${h - 52}" width="${w}" height="8" fill="#ff88cc" opacity="0.18" filter="url(#neonGlow)"/>
  <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.35"/>`;
}

/** @param {number} w @param {number} h @param {string} skyId */
export function drawRooftopArt(w, h, skyId = "skyTop") {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#${skyId})"/>
  ${starField(80, w, h, h * 0.5)}
  ${animeCloudLayers(w, h)}
  ${mountainLayers(w, h)}
  ${Array.from({ length: 16 }, (_, i) => {
    const bh = 40 + (i % 5) * 35;
    const x = i * 62 - 20;
    return `<rect x="${x}" y="${h * 0.48 - bh}" width="48" height="${bh}" fill="#141c28" opacity="0.92"/>`;
  }).join("")}
  <rect x="0" y="${h * 0.48}" width="${w}" height="${h * 0.52}" fill="#1a2228"/>
  <rect x="0" y="${h * 0.46}" width="${w}" height="6" fill="#4a5868"/>
  <line x1="0" y1="${h * 0.52}" x2="${w}" y2="${h * 0.52}" stroke="#3a4550" stroke-width="1" opacity="0.4"/>
  ${Array.from({ length: 8 }, (_, i) => `<line x1="${i * 120}" y1="${h * 0.52}" x2="${i * 120 + 80}" y2="${h}" stroke="#252d38" stroke-width="1" opacity="0.25"/>`).join("")}
  <rect x="${w * 0.65}" y="${h * 0.38}" width="120" height="8" fill="#586878" opacity="0.6"/>
  ${bokehLights(20, w, h)}`;
}

export function drawParkArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${godRays(w, h)}
  ${mountainLayers(w, h)}
  <ellipse cx="${w * 0.5}" cy="${h * 0.78}" rx="${w * 0.75}" ry="${h * 0.28}" fill="#3a8848"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.76}" rx="${w * 0.55}" ry="${h * 0.18}" fill="#58a858"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const x = 20 + i * 68;
    const th = 70 + (i % 4) * 30;
    const pink = i % 3 === 0;
    return `<rect x="${x - 5}" y="${h * 0.62}" width="10" height="${th}" fill="#4a3828"/>
    <ellipse cx="${x}" cy="${h * 0.58}" rx="42" ry="55" fill="${pink ? '#e87898' : '#2a7838'}" opacity="0.88"/>
    <ellipse cx="${x + 15}" cy="${h * 0.6}" rx="32" ry="40" fill="${pink ? '#f0a0b8' : '#388848'}" opacity="0.75"/>`;
  }).join("")}
  <path d="M${w * 0.35} ${h * 0.72} L${w * 0.42} ${h * 0.55} L${w * 0.49} ${h * 0.72} Z" fill="#8a4040" opacity="0.85"/>
  <rect x="${w * 0.41}" y="${h * 0.48}" width="4" height="28" fill="#6a3030"/>
  ${Array.from({ length: 25 }, (_, i) => `<circle cx="${(i * 53) % w}" cy="${(i * 31) % (h * 0.55)}" r="2.5" fill="#ffb8d8" opacity="0.55"/>`).join("")}
  <rect width="${w}" height="${h}" fill="url(#haze)" opacity="0.35"/>`;
}

export function drawBeachArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${animeCloudLayers(w, h)}
  <circle cx="${w * 0.88}" cy="${h * 0.1}" r="48" fill="url(#sunDisc)"/>
  ${godRays(w, h)}
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="#e8c878"/>
  <path d="M0 ${h * 0.56} Q${w * 0.2} ${h * 0.52} ${w * 0.45} ${h * 0.55} T${w} ${h * 0.53} L${w} ${h * 0.62} L0 ${h * 0.64}Z" fill="#2898c8"/>
  <path d="M0 ${h * 0.58} Q${w * 0.3} ${h * 0.54} ${w * 0.6} ${h * 0.57} T${w} ${h * 0.56} L${w} ${h * 0.6} L0 ${h * 0.61}Z" fill="#48b8e8" opacity="0.55"/>
  ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="${w * 0.15 + i * 140}" cy="${h * 0.54}" rx="28" ry="8" fill="#fff" opacity="0.25"/>`).join("")}
  <ellipse cx="${w * 0.12}" cy="${h * 0.68}" rx="90" ry="25" fill="#d8b868" opacity="0.5"/>`;
}

export function drawSunsetArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skySunset)"/>
  ${godRays(w, h, "#ffd0a0")}
  <circle cx="${w * 0.5}" cy="${h * 0.38}" r="72" fill="url(#sunDisc)" filter="url(#softGlow)"/>
  ${animeCloudLayers(w, h)}
  ${mountainLayers(w, h)}
  ${bokehLights(28, w, h)}
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#0a0810"/>`;
}

export function drawAuroraArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#040810"/>
  ${starField(150, w, h)}
  <path d="M0 ${h * 0.32} Q${w * 0.25} ${h * 0.08} ${w * 0.5} ${h * 0.28} T${w} ${h * 0.22} L${w} ${h * 0.55} Q${w * 0.6} ${h * 0.38} ${w * 0.3} ${h * 0.48} T0 ${h * 0.42}Z" fill="#5eead4" opacity="0.35" filter="url(#softGlow)"/>
  <path d="M0 ${h * 0.36} Q${w * 0.35} ${h * 0.14} ${w * 0.65} ${h * 0.3} L${w} ${h * 0.48} Q${w * 0.5} ${h * 0.4} 0 ${h * 0.46}Z" fill="#a78bfa" opacity="0.32" filter="url(#softGlow)"/>
  <path d="M0 ${h * 0.4} Q${w * 0.4} ${h * 0.2} ${w * 0.75} ${h * 0.34} L${w} ${h * 0.52} Q${w * 0.45} ${h * 0.44} 0 ${h * 0.5}Z" fill="#f472b6" opacity="0.18"/>`;
}

export function drawRainStreetArt(w, h) {
  let rain = "";
  for (let i = 0; i < 200; i += 1) {
    const x = (i * 17) % w;
    const y = (i * 23) % h;
    rain += `<line x1="${x}" y1="${y}" x2="${x + 3}" y2="${y + 22}" stroke="#a8c8e8" stroke-width="0.8" opacity="0.2"/>`;
  }
  let buildings = "";
  for (let i = 0; i < 20; i += 1) {
    const bw = 40 + (i % 4) * 18;
    const bh = 120 + (i * 41) % 200;
    const x = i * 50;
    buildings += `<rect x="${x}" y="${h * 0.72 - bh}" width="${bw}" height="${bh}" fill="#141c28"/>
    <rect x="${x + 4}" y="${h * 0.72 - bh + 8}" width="${bw - 8}" height="${bh - 16}" fill="#0a1018" opacity="0.5"/>`;
    if (i % 3 === 0) {
      buildings += `<rect x="${x}" y="${h * 0.72 - 30}" width="${bw}" height="6" fill="#ff4488" opacity="0.7" filter="url(#neonGlow)"/>`;
    }
  }
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyTop)"/>
  ${buildings}
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#0a1018"/>
  <rect x="0" y="${h * 0.7}" width="${w}" height="12" fill="#283848" opacity="0.6"/>
  ${rain}
  ${bokehLights(40, w, h)}`;
}

export function drawCherryBlossomArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skySunset)"/>
  ${Array.from({ length: 10 }, (_, i) => {
    const x = 30 + i * 95;
    return `<rect x="${x - 4}" y="${h * 0.5}" width="8" height="120" fill="#483028"/>
    <ellipse cx="${x}" cy="${h * 0.42}" rx="58" ry="72" fill="#e84888" opacity="0.82"/>
    <ellipse cx="${x + 25}" cy="${h * 0.45}" rx="45" ry="55" fill="#f878a8" opacity="0.7"/>`;
  }).join("")}
  ${Array.from({ length: 80 }, (_, i) => `<circle cx="${(i * 37) % w}" cy="${(i * 29) % (h * 0.65)}" r="${2 + (i % 3)}" fill="#ffc8e0" opacity="0.65"/>`).join("")}
  <rect x="0" y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="#2a2030"/>
  <path d="M0 ${h * 0.68} Q${w * 0.5} ${h * 0.62} ${w} ${h * 0.68} L${w} ${h} L0 ${h}Z" fill="#3a2838" opacity="0.8"/>`;
}

export function drawMountainArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${animeCloudLayers(w, h)}
  ${mountainLayers(w, h)}
  <polygon points="${w * 0.05},${h * 0.75} ${w * 0.38},${h * 0.28} ${w * 0.55},${h * 0.75}" fill="#688898"/>
  <polygon points="${w * 0.38},${h * 0.28} ${w * 0.42},${h * 0.32} ${w * 0.4},${h * 0.28}" fill="#fff" opacity="0.9"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.6}" ry="${h * 0.15}" fill="#487858" opacity="0.85"/>`;
}

export function drawHarborArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${mountainLayers(w, h)}
  <rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#286888"/>
  ${Array.from({ length: 5 }, (_, i) => `<path d="M${60 + i * 180} ${h * 0.55} L${100 + i * 180} ${h * 0.38} L${140 + i * 180} ${h * 0.55}Z" fill="#1a2838"/>
  <rect x="${85 + i * 180}" y="${h * 0.48}" width="30" height="12" fill="#283848"/>`).join("")}
  <ellipse cx="${w * 0.3}" cy="${h * 0.62}" rx="120" ry="18" fill="#fff" opacity="0.08"/>
  <rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#182028"/>`;
}

export function drawMeadowArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${godRays(w, h)}
  ${animeCloudLayers(w, h)}
  <ellipse cx="${w * 0.5}" cy="${h * 0.8}" rx="${w * 0.85}" ry="${h * 0.25}" fill="#68a848"/>
  ${Array.from({ length: 40 }, (_, i) => {
    const x = (i * 24) % w;
    const ht = 12 + (i % 5) * 8;
    return `<line x1="${x}" y1="${h * 0.75}" x2="${x - 3}" y2="${h * 0.75 - ht}" stroke="#88d858" stroke-width="1.5" opacity="0.7"/>`;
  }).join("")}
  ${Array.from({ length: 8 }, (_, i) => `<circle cx="${80 + i * 110}" cy="${h * 0.68}" r="4" fill="#ffe878" opacity="0.8"/>`).join("")}`;
}

/**
 * Visual-novel style interior — perspective floor, window cityscape, furniture, warm light.
 * @param {number} w @param {number} h
 * @param {{ wall: string, accent: string, floor: string, kind: string }} theme
 */
export function drawVNInterior(w, h, theme) {
  const { wall, accent, floor, kind } = theme;
  const windowView =
    kind === "library"
      ? `<rect x="${w * 0.08}" y="${h * 0.14}" width="${w * 0.28}" height="${h * 0.42}" fill="#1a2838"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${w * 0.09}" y="${h * 0.16 + i * 38}" width="${w * 0.26}" height="32" fill="${accent}" opacity="0.45"/>`).join("")}`
      : `<rect x="${w * 0.52}" y="${h * 0.1}" width="${w * 0.4}" height="${h * 0.38}" fill="#87ceeb"/>
      <rect x="${w * 0.52}" y="${h * 0.1}" width="${w * 0.4}" height="${h * 0.38}" fill="url(#skyTop)" opacity="0.85"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${w * 0.54 + (i % 4) * 22}" y="${h * 0.22}" width="12" height="18" fill="#ffe8a8" opacity="0.5"/>`).join("")}
      <rect x="${w * 0.5}" y="${h * 0.08}" width="${w * 0.44}" height="${h * 0.42}" fill="none" stroke="${accent}" stroke-width="5"/>
      <path d="M${w * 0.72} ${h * 0.08} L${w * 0.72} ${h * 0.5} M${w * 0.52} ${h * 0.29} L${w * 0.92} ${h * 0.29}" stroke="${accent}" stroke-width="2"/>`;

  const furniture =
    kind === "cafe"
      ? `<ellipse cx="${w * 0.35}" cy="${h * 0.72}" rx="100" ry="28" fill="${accent}" opacity="0.35"/>
      <rect x="${w * 0.22}" y="${h * 0.58}" width="140" height="10" rx="2" fill="#6a5040"/>
      ${Array.from({ length: 3 }, (_, i) => `<rect x="${w * 0.25 + i * 45}" y="${h * 0.68}" width="8" height="35" fill="#584838"/>`).join("")}`
      : kind === "bedroom"
        ? `${Array.from({ length: 10 }, (_, i) => {
          const fx = w * 0.04 + (i % 5) * (w * 0.18);
          const fy = h * 0.04 + Math.floor(i / 5) * 22;
          return `<circle cx="${fx}" cy="${fy}" r="2.5" fill="#ffd8a8" opacity="0.9" filter="url(#softGlow)"/>`;
        }).join("")}
        <rect x="${w * 0.08}" y="${h * 0.58}" width="${w * 0.42}" height="${h * 0.22}" rx="12" fill="${accent}" opacity="0.55"/>
        <rect x="${w * 0.1}" y="${h * 0.56}" width="${w * 0.38}" height="18" rx="8" fill="#fff" opacity="0.15"/>
        <ellipse cx="${w * 0.2}" cy="${h * 0.62}" rx="40" ry="20" fill="#fff" opacity="0.08"/>
        <rect x="${w * 0.52}" y="${h * 0.52}" width="${w * 0.12}" height="${h * 0.28}" fill="#685878" opacity="0.5" rx="4"/>
        ${Array.from({ length: 4 }, (_, i) => `<rect x="${w * 0.535}" y="${h * 0.54 + i * 42}" width="${w * 0.09}" height="32" fill="${i % 2 ? "#88a8d8" : "#e87898"}" opacity="0.45" rx="2"/>`).join("")}
        <circle cx="${w * 0.78}" cy="${h * 0.48}" r="38" fill="url(#lampGlow)"/>
        <rect x="${w * 0.76}" y="${h * 0.44}" width="6" height="80" fill="#484848"/>`
        : kind === "classroom"
          ? `<rect x="${w * 0.05}" y="${h * 0.55}" width="${w * 0.9}" height="8" fill="${accent}"/>
          ${Array.from({ length: 10 }, (_, i) => `<rect x="${w * 0.08 + i * 42}" y="${h * 0.63}" width="28" height="22" fill="#584838" opacity="0.6"/>`).join("")}`
          : kind === "executive"
            ? `<ellipse cx="${w * 0.32}" cy="${h * 0.74}" rx="140" ry="32" fill="#3a3838" opacity="0.85"/>
            <rect x="${w * 0.18}" y="${h * 0.64}" width="220" height="14" rx="4" fill="${accent}" opacity="0.55"/>
            <rect x="${w * 0.58}" y="${h * 0.58}" width="${w * 0.28}" height="8" fill="${accent}" opacity="0.35"/>
            <circle cx="${w * 0.82}" cy="${h * 0.38}" r="42" fill="url(#lampGlow)"/>`
            : `<rect x="${w * 0.15}" y="${h * 0.62}" width="${w * 0.35}" height="8" fill="${accent}" opacity="0.5"/>`;

  const wallFill =
    kind === "cozy" || kind === "kitchen" || kind === "loft"
      ? "url(#wallWarm)"
      : kind === "office" || kind === "studio"
        ? "url(#wallCool)"
        : wall;
  const floorFill = kind === "cozy" || kind === "bedroom" ? "url(#floorWood)" : floor;
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="${wallFill}"/>
  <polygon points="0,${h * 0.55} 0,${h} ${w},${h} ${w},${h * 0.55} ${w * 0.85},${h * 0.62} ${w * 0.15},${h * 0.62}" fill="${floorFill}" opacity="0.92"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const x1 = (i / 14) * w;
    const x2 = w * 0.15 + (i / 14) * (w * 0.7);
    return `<line x1="${x1}" y1="${h}" x2="${x2}" y2="${h * 0.62}" stroke="#000" stroke-opacity="0.12" stroke-width="1"/>`;
  }).join("")}
  <rect x="0" y="0" width="${w}" height="${h * 0.55}" fill="#000" opacity="0.08"/>
  ${windowView}
  <ellipse cx="${w * 0.75}" cy="${h * 0.35}" rx="120" ry="80" fill="#ffe8c8" opacity="0.12" filter="url(#softGlow)"/>
  ${furniture}
  <rect x="0" y="${h * 0.88}" width="${w}" height="${h * 0.12}" fill="#000" opacity="0.2"/>`;
}

export function drawGreenhouseArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#88c898"/>
  ${Array.from({ length: 10 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="${h}" stroke="#fff" stroke-width="2" opacity="0.25"/>`).join("")}
  ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 90}" x2="${w}" y2="${i * 90}" stroke="#fff" stroke-width="1.5" opacity="0.2"/>`).join("")}
  <rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#48a858"/>
  ${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${40 + i * 78}" cy="${h * 0.72}" rx="45" ry="28" fill="#68c878"/>
  <ellipse cx="${55 + i * 78}" cy="${h * 0.68}" rx="22" ry="35" fill="#388848" opacity="0.6"/>`).join("")}
  ${godRays(w, h)}`;
}

export function drawExecutiveLoungeArt(w, h) {
  return drawVNInterior(w, h, {
    wall: "#2a2830",
    accent: "#c8a878",
    floor: "#1a1818",
    kind: "executive",
  });
}

export function drawHotelLobbyArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#e8e4dc"/>
  <polygon points="0,${h * 0.58} 0,${h} ${w},${h} ${w},${h * 0.58} ${w * 0.78},${h * 0.64} ${w * 0.22},${h * 0.64}" fill="#c8c0b0"/>
  ${Array.from({ length: 5 }, (_, i) => {
    const x = w * 0.12 + i * (w * 0.18);
    return `<ellipse cx="${x}" cy="${h * 0.22}" rx="28" ry="48" fill="#fff8e8" opacity="0.55" filter="url(#softGlow)"/>
    <rect x="${x - 3}" y="${h * 0.08}" width="6" height="90" fill="#888078"/>`;
  }).join("")}
  <rect x="${w * 0.35}" y="${h * 0.52}" width="${w * 0.3}" height="12" rx="4" fill="#a89888"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.48}" rx="180" ry="40" fill="#fff" opacity="0.08"/>`;
}

export function drawArtGalleryArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#f4f2ee"/>
  <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#d8d4cc"/>
  ${Array.from({ length: 6 }, (_, i) => {
    const x = w * 0.06 + i * (w * 0.15);
    return `<rect x="${x}" y="${h * 0.18}" width="${w * 0.11}" height="${h * 0.38}" fill="#fff" stroke="#b8b4ac" stroke-width="3"/>
    <rect x="${x + 8}" y="${h * 0.22}" width="${w * 0.11 - 16}" height="${h * 0.28}" fill="${i % 2 ? "#88a8c8" : "#d87898"}" opacity="0.45"/>`;
  }).join("")}
  <ellipse cx="${w * 0.5}" cy="${h * 0.12}" rx="${w * 0.35}" ry="28" fill="#fff8e0" opacity="0.35" filter="url(#softGlow)"/>`;
}

export function drawObservatoryArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#0a0818"/>
  ${starField(120, w, h, h * 0.55)}
  <ellipse cx="${w * 0.5}" cy="${h * 0.72}" rx="${w * 0.48}" ry="${h * 0.38}" fill="#181828" opacity="0.92"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.68}" rx="${w * 0.38}" ry="${h * 0.28}" fill="#101018"/>
  <rect x="${w * 0.42}" y="${h * 0.55}" width="${w * 0.16}" height="${h * 0.35}" fill="#283048" opacity="0.85"/>
  <circle cx="${w * 0.5}" cy="${h * 0.42}" r="95" fill="none" stroke="#6888c8" stroke-width="4" opacity="0.55"/>
  <circle cx="${w * 0.5}" cy="${h * 0.42}" r="72" fill="#080810" opacity="0.8"/>
  ${starField(36, w * 0.28, h * 0.14, h * 0.56)}`;
}

export function drawZenGardenArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${Array.from({ length: 18 }, (_, i) => {
    const y = h * 0.62 + (i % 6) * 8;
    return `<path d="M0 ${y} Q${w * 0.25} ${y - 6} ${w * 0.5} ${y} T${w} ${y}" fill="none" stroke="#988878" stroke-width="1.2" opacity="0.35"/>`;
  }).join("")}
  <rect x="0" y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="#c8c0b0"/>
  <rect x="${w * 0.08}" y="${h * 0.32}" width="12" height="${h * 0.26}" fill="#584838"/>
  <rect x="${w * 0.06}" y="${h * 0.28}" width="${w * 0.08}" height="8" fill="#685848"/>
  ${Array.from({ length: 5 }, (_, i) => `<ellipse cx="${w * 0.72 + i * 18}" cy="${h * 0.78}" rx="22" ry="14" fill="#687868" opacity="0.75"/>`).join("")}
  <ellipse cx="${w * 0.22}" cy="${h * 0.82}" rx="55" ry="22" fill="#788878" opacity="0.65"/>`;
}

export function drawDaySkylineArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="url(#skyDay)"/>
  ${animeCloudLayers(w, h)}
  ${Array.from({ length: 14 }, (_, i) => {
    const bw = 28 + (i % 5) * 14;
    const bh = 80 + (i % 7) * 55;
    const x = i * (w / 14);
    return `<rect x="${x}" y="${h * 0.55 - bh}" width="${bw}" height="${bh}" fill="#7888a0" opacity="0.82"/>
    ${Array.from({ length: 4 }, (_, j) => `<rect x="${x + 4}" y="${h * 0.55 - bh + 12 + j * 18}" width="8" height="10" fill="#fff8d8" opacity="0.35"/>`).join("")}`;
  }).join("")}
  <rect x="0" y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#586878" opacity="0.35"/>
  <rect x="0" y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#384858"/>`;
}

export function drawMinimalArt(w, h) {
  return `${animePaintDefs(w, h)}
  <rect width="${w}" height="${h}" fill="#0a0c12"/>
  <ellipse cx="${w * 0.35}" cy="${h * 0.28}" rx="${w * 0.42}" ry="${h * 0.38}" fill="#283858" opacity="0.55"/>
  <ellipse cx="${w * 0.72}" cy="${h * 0.62}" rx="${w * 0.38}" ry="${h * 0.32}" fill="#1a2838" opacity="0.65"/>
  <rect x="${w * 0.1}" y="${h * 0.2}" width="${w * 0.8}" height="${h * 0.52}" fill="#121820" rx="12" stroke="#2a3848" stroke-width="1" opacity="0.92"/>
  <ellipse cx="${w * 0.5}" cy="${h * 0.48}" rx="200" ry="110" fill="#a8c0ff" opacity="0.05" filter="url(#softGlow)"/>`;
}

/** @type {Record<string, (w: number, h: number) => string>} */
export const SCENE_ANIME_ART = {
  "night-city": drawNightCityArt,
  rooftop: (w, h) => drawRooftopArt(w, h, "skyTop"),
  park: drawParkArt,
  beach: drawBeachArt,
  sunset: drawSunsetArt,
  aurora: drawAuroraArt,
  "rain-street": drawRainStreetArt,
  "cherry-blossom": drawCherryBlossomArt,
  mountain: drawMountainArt,
  harbor: drawHarborArt,
  meadow: drawMeadowArt,
  studio: drawStudioArt,
  "cozy-room": drawCozyRoomArt,
  cafe: (w, h) =>
    drawVNInterior(w, h, { wall: "#e8d0b0", accent: "#6a5040", floor: "#b89878", kind: "cafe" }),
  library: (w, h) =>
    drawVNInterior(w, h, { wall: "#d8e0d0", accent: "#4a5848", floor: "#a8b0a0", kind: "library" }),
  minimal: drawMinimalArt,
  bedroom: (w, h) =>
    drawVNInterior(w, h, { wall: "#d8c8e0", accent: "#685878", floor: "#b8a8c0", kind: "bedroom" }),
  office: (w, h) =>
    drawVNInterior(w, h, { wall: "#d0d8e8", accent: "#485868", floor: "#a8b0c0", kind: "office" }),
  classroom: (w, h) =>
    drawVNInterior(w, h, { wall: "#e8e0c8", accent: "#686048", floor: "#c8b898", kind: "classroom" }),
  greenhouse: drawGreenhouseArt,
  loft: (w, h) =>
    drawVNInterior(w, h, { wall: "#e0c8a8", accent: "#685040", floor: "#c8a878", kind: "loft" }),
  kitchen: (w, h) =>
    drawVNInterior(w, h, { wall: "#f0e0c8", accent: "#786048", floor: "#d8c0a0", kind: "kitchen" }),
  "executive-lounge": drawExecutiveLoungeArt,
  "hotel-lobby": drawHotelLobbyArt,
  "art-gallery": drawArtGalleryArt,
  observatory: drawObservatoryArt,
  "zen-garden": drawZenGardenArt,
  "day-skyline": drawDaySkylineArt,
};
