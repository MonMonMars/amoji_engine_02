/**
 * Fresh-boot helpers — detect newer server builds and cache-bust dynamic imports.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";

export const COMPANION_FRESH_BOOT_SCHEMA = "amoji.companionFreshBoot.v2";
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
  if (/^(?:[a-z]+:)?\/\//i.test(versioned)) {
    return versioned;
  }
  const pageHref =
    globalThis.document?.baseURI ||
    globalThis.location?.href ||
    "http://localhost/";
  const pageUrl = new URL(pageHref);
  // Unique /c/<build>/full|lite paths would otherwise resolve ../amoji-engine
  // into /c/<build>/amoji-engine and 404 every module.
  const underBuildPath = /^\/c\/[^/]+\/(full|lite)\/?$/i.test(pageUrl.pathname);
  const originBase = `${pageUrl.origin}/`;
  if (versioned.startsWith("/")) {
    return new URL(versioned, originBase).href;
  }
  const resolveBase = underBuildPath
    ? `${pageUrl.origin}/companion-full`
    : pageHref;
  return new URL(versioned, resolveBase).href;
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
export const BUILD_PATH_PREFIX = "/c/";

/**
 * Unique path so iOS Safari cannot reuse a cached /companion-full HTML.
 * @param {string} build
 * @param {"full" | "lite"} [kind]
 */
export function companionBuildPath(build, kind = "full") {
  const id = encodeURIComponent(String(build || "dev"));
  return `${BUILD_PATH_PREFIX}${id}/${kind === "lite" ? "lite" : "full"}`;
}

/**
 * Stable path used when unique /c/<build>/ is not rewritten on the host.
 * @param {"full" | "lite"} [kind]
 */
export function companionFallbackPath(kind = "full") {
  return kind === "lite" ? "/companion" : "/companion-full";
}

/**
 * True when the page already carries this build — unique /c/ path or
 * fallback HTML with ?build= so a 404 unique path cannot loop forever.
 * @param {string | null | undefined} pathname
 * @param {string | null | undefined} build
 * @param {string | null | undefined} search
 */
export function pathSatisfiesBuild(pathname, build, search = "") {
  if (pathHasBuild(pathname, build)) return true;
  const id = String(build || "");
  if (!id) return false;
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  if (params.get("build") !== id) return false;
  const path = String(pathname || "").split("?")[0];
  return (
    path === "/companion-full" ||
    path === "/companion" ||
    path === "/prototypes/amoji-companion.html" ||
    path === "/prototypes/amoji-lite.html"
  );
}

/**
 * HEAD-probe unique /c/<build>/ and fall back if the host has no rewrite.
 * @param {string} build
 * @param {"full" | "lite"} [kind]
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export async function resolveCompanionBootPath(build, kind = "full", opts = {}) {
  const unique = companionBuildPath(build, kind);
  const fallback = companionFallbackPath(kind);
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  if (!fetchImpl) return unique;
  try {
    const res = await fetchImpl(unique, { method: "HEAD", cache: "no-store" });
    return res?.ok ? unique : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Map pretty companion URLs (including unique /c/<build>/ paths) onto real files.
 * @param {string | null | undefined} pathname
 */
export function rewriteCompanionServePath(pathname) {
  const path = String(pathname || "/").split("?")[0];
  if (path === "/companion-full" || /^\/c\/[^/]+\/full\/?$/i.test(path)) {
    return "/prototypes/amoji-companion.html";
  }
  if (path === "/companion" || /^\/c\/[^/]+\/lite\/?$/i.test(path)) {
    return "/prototypes/amoji-lite.html";
  }
  if (path === "/setup") return "/prototypes/amoji-setup.html";
  return path;
}

/**
 * @param {string | null | undefined} pathname
 */
export function companionKindFromPath(pathname) {
  const path = String(pathname || "");
  if (
    /\/lite\/?$/.test(path) ||
    path.includes("amoji-lite") ||
    path === "/companion" ||
    path.startsWith("/companion?")
  ) {
    return "lite";
  }
  return "full";
}

/**
 * @param {string | null | undefined} pathname
 * @param {string | null | undefined} build
 */
export function pathHasBuild(pathname, build) {
  const path = String(pathname || "");
  const id = String(build || "");
  if (!id) return false;
  return (
    path.includes(`${BUILD_PATH_PREFIX}${id}/`) ||
    path.includes(`${BUILD_PATH_PREFIX}${encodeURIComponent(id)}/`)
  );
}

export function buildFreshBootUrl(serverBuild, pathOverride) {
  const href = globalThis.location?.href || "/";
  const url = new URL(href);
  const kind = companionKindFromPath(url.pathname);
  url.pathname = pathOverride || companionBuildPath(serverBuild, kind);
  url.searchParams.set("build", serverBuild);
  url.searchParams.set("_cb", String(Date.now()));
  return url.toString();
}

/**
 * Drop service workers + Cache Storage so a later load cannot revive stale JS.
 */
export async function purgeStaleBrowserCaches() {
  try {
    const regs = await globalThis.navigator?.serviceWorker?.getRegistrations?.();
    if (Array.isArray(regs)) {
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {
    /* ignore */
  }
  try {
    const keys = await globalThis.caches?.keys?.();
    if (Array.isArray(keys)) {
      await Promise.all(keys.map((key) => globalThis.caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
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
  const path = globalThis.location?.pathname || "";
  const search = globalThis.location?.search || "";
  const needsUniquePath = Boolean(
    serverBuild && !pathSatisfiesBuild(path, serverBuild, search),
  );
  void purgeStaleBrowserCaches();
  if (!shouldReloadForBuild(embedded, serverBuild) && !needsUniquePath) {
    if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }

  if (hasFreshBootAttempted(serverBuild) && !needsUniquePath) {
    return {
      reloaded: false,
      serverBuild,
      pageBuild: embedded,
      skipped: true,
    };
  }

  markFreshBootAttempted(serverBuild);
  globalThis.__amojiActiveBuild = serverBuild;
  const kind = companionKindFromPath(path);
  const bootPath = await resolveCompanionBootPath(serverBuild, kind, {
    fetchImpl,
  });
  const nextUrl = buildFreshBootUrl(serverBuild, bootPath);
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
      if (!serverBuild) return;
      void purgeStaleBrowserCaches();
      const path = globalThis.location?.pathname || "";
      const search = globalThis.location?.search || "";
      if (
        !shouldReloadForBuild(pageBuild, serverBuild) &&
        pathSatisfiesBuild(path, serverBuild, search)
      ) {
        return;
      }
      const kind = companionKindFromPath(path);
      void resolveCompanionBootPath(serverBuild, kind, { fetchImpl }).then(
        (bootPath) => {
          globalThis.location.replace(buildFreshBootUrl(serverBuild, bootPath));
        },
      );
    })
    .catch(() => {});
}

/**
 * @param {{ intervalMs?: number, fetchImpl?: typeof fetch }} [opts]
 */
export function startAppUpdateWatcher(opts = {}) {
  const intervalMs = opts.intervalMs ?? 180_000;
  const run = () => {
    void purgeStaleBrowserCaches();
    void checkForAppUpdate(undefined, opts);
  };
  run();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) run();
    });
  }
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("pageshow", (ev) => {
      if (ev?.persisted) run();
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
