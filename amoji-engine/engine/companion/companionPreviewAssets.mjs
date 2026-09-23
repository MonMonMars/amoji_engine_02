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

/** Full-body cards below this are often partial / empty canvas (still above MIN). */
export const SUSPECT_PREVIEW_BYTES = 180000;

/**
 * @param {string} id
 * @param {string} [assetsDir]
 */
export function companionPreviewPath(id, assetsDir = join(repoRoot, "prototypes/assets")) {
  return join(assetsDir, `companion-char-${String(id || "nova").toLowerCase()}.png`);
}

/** Picker hero (top) — bust / close-up; roster strip uses {@link companionPreviewPath}. */
export function companionHeroPreviewPath(id, assetsDir = join(repoRoot, "prototypes/assets")) {
  return join(
    assetsDir,
    `companion-char-${String(id || "nova").toLowerCase()}-hero.png`,
  );
}

/** Close-up PNGs can be slightly smaller than full-body card shots. */
export const MIN_HERO_PREVIEW_BYTES = 72_000;

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

/**
 * @param {string} filePath
 */
export function isSuspectPreviewCapture(filePath) {
  if (!existsSync(filePath)) return true;
  const size = statSync(filePath).size;
  return size > MIN_PREVIEW_BYTES && size < SUSPECT_PREVIEW_BYTES;
}

/**
 * @param {string} filePath
 */
export function isBadHeroPreviewCapture(filePath) {
  if (!existsSync(filePath)) return true;
  const size = statSync(filePath).size;
  return (
    size <= MIN_HERO_PREVIEW_BYTES ||
    size === BLACK_LOADER_BYTES ||
    size === TINY_BLACK_PREVIEW_BYTES
  );
}

export function isCompanionHeroPreviewOk(id, assetsDir) {
  return !isBadHeroPreviewCapture(companionHeroPreviewPath(id, assetsDir));
}
