/**
 * Publish VRM face inventory on window for smoke tests and ?facedebug=1.
 * @param {unknown} avatar
 */
export function syncCompanionFaceReport(avatar) {
  if (typeof globalThis === "undefined") return null;
  const report = avatar?.getFaceReport?.() || null;
  const profile = avatar?.getFaceProfile?.() || report?.faceProfile || null;
  globalThis.__amojiFaceReport = report;
  globalThis.__amojiFaceProfile = profile;
  return report;
}

/**
 * @param {unknown} avatar
 */
export function readCompanionFaceDebug(avatar) {
  return avatar?.getFaceDebug?.() || null;
}
