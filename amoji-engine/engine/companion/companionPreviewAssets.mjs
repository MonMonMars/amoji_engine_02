/**
 * Roster card preview PNG quality helpers (shared by capture + verify scripts).
 */
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMPANION_PREVIEW_FALLBACK,
  companionPreviewImgOnErrorAttr,
  wireCompanionPreviewFallback,
} from "./companionPreviewFallback.js";

export {
  COMPANION_PREVIEW_FALLBACK,
  companionPreviewImgOnErrorAttr,
  wireCompanionPreviewFallback,
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Playwright WebGL blank capture signature. */
export const BLACK_LOADER_BYTES = 333412;

/** Failed headless capture — uniform black canvas at 2×720×960. */
export const TINY_BLACK_PREVIEW_BYTES = 61136;

/** Minimum bytes for a valid 3D or art portrait PNG. */
export const MIN_PREVIEW_BYTES = 120000;

/**
 * @param {string} id
 * @param {string} [assetsDir]
 */
export function companionPreviewPath(id, assetsDir = join(repoRoot, "prototypes/assets")) {
  return join(assetsDir, `companion-char-${String(id || "nova").toLowerCase()}.png`);
}

/**
 * @param {string} filePath
 */
export function isBadPreviewCapture(filePath) {
  if (!existsSync(filePath)) return true;
  const size = statSync(filePath).size;
  return (
    size <= MIN_PREVIEW_BYTES ||
    size === BLACK_LOADER_BYTES ||
    size === TINY_BLACK_PREVIEW_BYTES
  );
}

/**
 * @param {string} id
 * @param {string} [assetsDir]
 */
export function isCompanionPreviewOk(id, assetsDir) {
  return !isBadPreviewCapture(companionPreviewPath(id, assetsDir));
}
