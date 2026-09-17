/**
 * Offline VRM/GLB inspection — triangle count, morph targets, expression names.
 */

const EMOTION_PRESETS = new Set([
  "happy",
  "relaxed",
  "sad",
  "surprised",
  "angry",
  "neutral",
]);
const VISEME_RE = /^(aa|ih|ou|ee|oh|a|i|u|e|o)$/i;

/**
 * @param {Buffer | Uint8Array} buffer
 */
export function countTrianglesFromGlb(buffer) {
  let triangles = 0;
  let morphTargets = 0;
  /** @type {Set<string>} */
  const morphNames = new Set();
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let json;
  try {
    const chunkLen = buf.readUInt32LE(12);
    const type = buf.toString("utf8", 16, 20);
    if (type === "JSON") {
      json = JSON.parse(buf.toString("utf8", 20, 20 + chunkLen));
    } else {
      const jsonStart = buf.indexOf("{".charCodeAt(0));
      const jsonEnd = buf.indexOf("}".charCodeAt(0), jsonStart);
      json = JSON.parse(buf.toString("utf8", jsonStart, jsonEnd + 1));
    }
  } catch {
    return { triangles: 0, morphTargets: 0, morphNames: [] };
  }
  const accessors = json.accessors || [];
  const meshes = json.meshes || [];
  for (const mesh of meshes) {
    for (const prim of mesh.primitives || []) {
      const mode = prim.mode ?? 4;
      if (mode !== 4) continue;
      const idx = prim.indices;
      if (idx != null) {
        const acc = accessors[idx];
        triangles += Math.floor((acc?.count || 0) / 3);
      } else {
        const pos = prim.attributes?.POSITION;
        if (pos != null) {
          const acc = accessors[pos];
          triangles += Math.floor((acc?.count || 0) / 3);
        }
      }
      morphTargets += (prim.targets || []).length;
      const extras = prim.extras?.targetNames || mesh.extras?.targetNames;
      if (Array.isArray(extras)) {
        for (const name of extras) morphNames.add(String(name));
      }
    }
  }
  return { triangles, morphTargets, morphNames: [...morphNames] };
}

/**
 * @param {Buffer | Uint8Array} buffer
 * @returns {string[]}
 */
export function parseVrmExpressionNames(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const text = buf.toString("utf8", 0, Math.min(buf.length, 4_000_000));
  /** @type {Set<string>} */
  const names = new Set();
  const re = /"expressionName"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text))) {
    names.add(m[1].replace(/^VRMExpression_/, ""));
  }
  const presetRe = /"presetName"\s*:\s*"([^"]+)"/g;
  while ((m = presetRe.exec(text))) {
    names.add(m[1]);
  }
  return [...names];
}

/**
 * @param {Buffer | Uint8Array} buffer
 * @param {string} [fileName]
 */
export function inspectVrmBuffer(buffer, fileName = "model.vrm") {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const { triangles, morphTargets, morphNames } = countTrianglesFromGlb(buf);
  const expressions = parseVrmExpressionNames(buf);
  const visemes = expressions.filter((n) => VISEME_RE.test(n));
  const emotions = expressions.filter((n) =>
    EMOTION_PRESETS.has(String(n).toLowerCase()),
  );
  const blink = expressions.filter((n) => /blink/i.test(n));
  return {
    file: fileName,
    bytes: buf.length,
    triangles,
    morphTargets,
    morphNames: morphNames.slice(0, 16),
    expressionCount: expressions.length,
    visemes,
    emotions,
    blink,
    expressions: expressions.slice(0, 32),
    score:
      triangles * 0.001 +
      expressions.length * 500 +
      visemes.length * 2000 +
      morphTargets * 10,
  };
}

/** Model URLs to prefetch first (high-poly face flagship). */
export const HIGH_POLY_FACE_MODEL_HINTS = [
  "/prototypes/assets/kizuna-kamatte.vrm",
  "/prototypes/assets/companion-kai.vrm",
  "/prototypes/assets/companion-alicia.vrm",
  "/prototypes/assets/companion-ember.vrm",
  "/prototypes/assets/companion-nova.vrm",
];

/**
 * @param {string[]} urls
 */
export function sortModelUrlsForPreload(urls) {
  const list = [...urls];
  const rank = (url) => {
    const lower = String(url || "").toLowerCase();
    const idx = HIGH_POLY_FACE_MODEL_HINTS.findIndex((hint) =>
      lower.includes(hint.split("/").pop() || ""),
    );
    return idx >= 0 ? idx : HIGH_POLY_FACE_MODEL_HINTS.length + 1;
  };
  return list.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b));
  });
}
