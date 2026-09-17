/**
 * Mesh statistics for VRM/GLTF avatars (triangle count, morph inventory).
 */

/**
 * @param {{ traverse?: (fn: (obj: unknown) => void) => void } | null | undefined} root
 * @returns {number}
 */
export function countMeshTriangles(root) {
  if (!root || typeof root.traverse !== "function") return 0;
  let tris = 0;
  root.traverse((obj) => {
    const geo = obj?.geometry;
    if (!geo) return;
    const idx = geo.index;
    if (idx?.count) tris += Math.floor(idx.count / 3);
    else if (geo.attributes?.position?.count) {
      tris += Math.floor(geo.attributes.position.count / 3);
    }
  });
  return tris;
}

/**
 * @param {{ traverse?: (fn: (obj: unknown) => void) => void } | null | undefined} root
 * @returns {{ morphTargetCount: number, morphNames: string[] }}
 */
export function summarizeMorphTargets(root) {
  /** @type {Set<string>} */
  const names = new Set();
  let morphTargetCount = 0;
  if (!root || typeof root.traverse !== "function") {
    return { morphTargetCount: 0, morphNames: [] };
  }
  root.traverse((obj) => {
    const dict = obj?.morphTargetDictionary;
    if (!dict || typeof dict !== "object") return;
    for (const name of Object.keys(dict)) {
      names.add(name);
      morphTargetCount += 1;
    }
  });
  return {
    morphTargetCount,
    morphNames: [...names].sort((a, b) => a.localeCompare(b)),
  };
}
