/**
 * Fresh-boot helpers — detect newer server builds and cache-bust dynamic imports.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";

export const COMPANION_FRESH_BOOT_SCHEMA = "amoji.companionFreshBoot.v1";
export const FRESH_BOOT_SESSION_PREFIX = "amoji.freshBoot.v1:";

/**
 * @param {string | null | undefined} build
 */
export function parseBuildNumber(build) {
  const match = String(build || "").match(/-v(\d+)-/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * True when the server build should replace the cached page build.
 * Avoids reload loops when the browser has newer HTML than production.
 *
 * @param {string | null | undefined} pageBuild
 * @param {string | null | undefined} serverBuild
 */
export function isServerBuildNewer(pageBuild, serverBuild) {
  if (!pageBuild || !serverBuild) return false;
  if (String(pageBuild) === String(serverBuild)) return false;

  const pageNum = parseBuildNumber(pageBuild);
  const serverNum = parseBuildNumber(serverBuild);
  if (pageNum > 0 && serverNum > 0) {
    return serverNum > pageNum;
  }

  return String(pageBuild) !== String(serverBuild);
}

/**
 * @param {string | null | undefined} pageBuild
 * @param {string | null | undefined} serverBuild
 */
export function shouldReloadForBuild(pageBuild, serverBuild) {
  return isServerBuildNewer(pageBuild, serverBuild);
}

/**
 * @param {string} path
 * @param {string} [build]
 */
export function versionedModuleUrl(path, build = AMOJI_BUILD) {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${encodeURIComponent(build || "dev")}`;
}

/**
 * Resolve a module path the same way the companion HTML expects:
 * `../amoji-engine/...` is relative to the page URL, not this file.
 * @param {string} path
 */
export function resolveCompanionModuleUrl(path, build = AMOJI_BUILD) {
  const versioned = versionedModuleUrl(path, build);
  if (/^(?:[a-z]+:)?\/\//i.test(versioned) || versioned.startsWith("/")) {
    return versioned;
  }
  const base =
    globalThis.document?.baseURI ||
    globalThis.location?.href ||
    "http://localhost/";
  return new URL(versioned, base).href;
}

/**
 * @param {string} path
 */
export function ami(path) {
  const build =
    globalThis.__amojiBuild ||
    globalThis.__amojiActiveBuild ||
    AMOJI_BUILD;
  return import(resolveCompanionModuleUrl(path, build));
}

/**
 * @param {string} serverBuild
 */
export function buildFreshBootUrl(serverBuild) {
  const href = globalThis.location?.href || "/";
  const url = new URL(href);
  url.searchParams.set("build", serverBuild);
  url.searchParams.set("_cb", String(Date.now()));
  return url.toString();
}

/**
 * @param {string} serverBuild
 */
export function hasFreshBootAttempted(serverBuild) {
  if (typeof globalThis.sessionStorage === "undefined") return false;
  return (
    globalThis.sessionStorage.getItem(`${FRESH_BOOT_SESSION_PREFIX}${serverBuild}`) ===
    "1"
  );
}

/**
 * @param {string} serverBuild
 */
export function markFreshBootAttempted(serverBuild) {
  if (typeof globalThis.sessionStorage === "undefined") return;
  globalThis.sessionStorage.setItem(
    `${FRESH_BOOT_SESSION_PREFIX}${serverBuild}`,
    "1",
  );
}

/**
 * @param {string} [pageBuild]
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export async function checkForAppUpdate(pageBuild, opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const embedded = pageBuild || globalThis.__amojiBuild || "";
  if (!fetchImpl) {
    return { reloaded: false, serverBuild: null, pageBuild: embedded };
  }

  const res = await fetchImpl("/api/health", {
    cache: "no-store",
    headers: { Pragma: "no-cache" },
  });
  if (!res.ok) {
    return { reloaded: false, serverBuild: null, pageBuild: embedded };
  }

  const data = await res.json();
  const serverBuild = data?.build || null;
  if (!shouldReloadForBuild(embedded, serverBuild)) {
    if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }

  if (hasFreshBootAttempted(serverBuild)) {
    return {
      reloaded: false,
      serverBuild,
      pageBuild: embedded,
      skipped: true,
    };
  }

  markFreshBootAttempted(serverBuild);
  globalThis.__amojiActiveBuild = serverBuild;
  const nextUrl = buildFreshBootUrl(serverBuild);
  if (typeof globalThis.location?.replace === "function") {
    globalThis.location.replace(nextUrl);
    return { reloaded: true, serverBuild, pageBuild: embedded, nextUrl };
  }
  if (typeof globalThis.location?.reload === "function") {
    globalThis.location.reload();
    return { reloaded: true, serverBuild, pageBuild: embedded };
  }

  return { reloaded: false, serverBuild, pageBuild: embedded };
}

/**
 * Inline-safe early boot (non-module). Call from HTML before other scripts.
 * @param {string} pageBuild
 */
export function runEarlyFreshBootCheck(pageBuild) {
  const fetchImpl =
    typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null;
  if (!fetchImpl || typeof globalThis.location === "undefined") return;

  const url = new URL(globalThis.location.href);
  const requestedBuild = url.searchParams.get("build");
  if (requestedBuild) {
    globalThis.__amojiActiveBuild = requestedBuild;
  }

  void fetchImpl("/api/health", {
    cache: "no-store",
    headers: { Pragma: "no-cache" },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const serverBuild = data?.build || null;
      if (!shouldReloadForBuild(pageBuild, serverBuild)) return;
      if (requestedBuild === serverBuild) return;
      if (hasFreshBootAttempted(serverBuild)) return;
      markFreshBootAttempted(serverBuild);
      globalThis.location.replace(buildFreshBootUrl(serverBuild));
    })
    .catch(() => {});
}

/**
 * @param {{ intervalMs?: number, fetchImpl?: typeof fetch }} [opts]
 */
export function startAppUpdateWatcher(opts = {}) {
  const intervalMs = opts.intervalMs ?? 180_000;
  const run = () => {
    void checkForAppUpdate(undefined, opts);
  };
  run();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) run();
    });
  }
  if (typeof globalThis.setInterval === "function" && intervalMs > 0) {
    globalThis.setInterval(run, intervalMs);
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.__amojiImport = ami;
  if (typeof document !== "undefined") {
    startAppUpdateWatcher();
  }
}
