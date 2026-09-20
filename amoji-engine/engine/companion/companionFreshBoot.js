/**
 * Fresh-boot helpers — detect newer server builds and cache-bust dynamic imports.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";
import { normalizeUnifiedEntryParams } from "./companionUnifiedApp.js";

export const COMPANION_FRESH_BOOT_SCHEMA = "amoji.companionFreshBoot.v3";
export const FRESH_BOOT_SESSION_PREFIX = "amoji.freshBoot.v1:";
export const FRESH_HTML_HEADERS = Object.freeze({
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Clear-Site-Data": '"cache"',
});

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
  const underBuildPath = isVersionedCompanionPath(pageUrl.pathname);
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
 * Per-open path. iOS Safari keys HTTP cache by pathname and often ignores
 * `?build=` / `?_cb=` — a new `/n/<stamp>/full` cannot be an old document.
 * @param {"full" | "lite"} [kind]
 * @param {number} [stamp]
 */
export function companionOpenPath(kind = "full", stamp) {
  const id =
    stamp == null
      ? `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`
      : String(Math.trunc(Number(stamp) || Date.now()));
  return `/n/${id}/${kind === "lite" ? "lite" : "full"}`;
}

/**
 * Bookmark entry. Server 303s to a fresh {@link companionOpenPath} every time.
 */
export const COMPANION_PLAY_PATH = "/play";

/**
 * @param {string | null | undefined} pathname
 */
export function isCompanionOpenPath(pathname) {
  return /^\/n\/\d+\/(full|lite)\/?$/i.test(String(pathname || "").split("?")[0]);
}

/**
 * Paths iOS has already cached from older demos.
 * @param {string | null | undefined} pathname
 */
export function isStickyCompanionBookmark(pathname) {
  const path = String(pathname || "").split("?")[0];
  return (
    path === "/companion-full" ||
    path === "/companion" ||
    path === "/prototypes/amoji-companion.html" ||
    path === "/prototypes/amoji-lite.html"
  );
}

/**
 * Unique /c/<build>/ or per-open /n/<stamp>/ document paths.
 * @param {string | null | undefined} pathname
 */
export function isVersionedCompanionPath(pathname) {
  const path = String(pathname || "").split("?")[0];
  return (
    /^\/c\/[^/]+\/(full|lite)\/?$/i.test(path) || isCompanionOpenPath(path)
  );
}

/**
 * @param {string | null | undefined} search
 * @param {{ build?: string, stamp?: number }} [opts]
 */
export function buildPlayRedirectLocation(search, opts = {}) {
  const params = normalizeUnifiedEntryParams(
    new URLSearchParams(String(search || "").replace(/^\?/, "")),
  );
  const path = companionOpenPath("full", opts.stamp);
  const stamp = opts.stamp ?? path.split("/")[2];
  const build = opts.build ?? AMOJI_BUILD;
  params.set("build", build);
  params.set("_cb", String(stamp));
  return `${path}?${params.toString()}`;
}

/**
 * Stable /companion-full (or /companion) entry when /play or /n/ routes are missing.
 * @param {string | null | undefined} search
 * @param {{ build?: string, stamp?: number | string }} [opts]
 */
export function buildPlayFallbackLocation(search, opts = {}) {
  const params = normalizeUnifiedEntryParams(
    new URLSearchParams(String(search || "").replace(/^\?/, "")),
  );
  const stamp =
    opts.stamp ??
    `${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
  const build = opts.build ?? AMOJI_BUILD;
  if (build) params.set("build", build);
  params.set("_cb", String(stamp));
  const path = companionFallbackPath("full");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * HEAD-probe /play then /n/ open path; fall back to /companion-full when host is stale.
 * @param {string | null | undefined} search
 * @param {{ build?: string, fetchImpl?: typeof fetch, origin?: string }} [opts]
 */
export async function resolvePlayEntryLocation(search, opts = {}) {
  const origin = String(opts.origin || "").replace(/\/$/, "");
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const open = buildPlayRedirectLocation(search, { build: opts.build });
  const fallback = buildPlayFallbackLocation(search, { build: opts.build });
  if (!fetchImpl || !origin) return open;
  try {
    const playRes = await fetchImpl(`${origin}/play`, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
    });
    if (!playRes || (playRes.status !== 200 && playRes.status !== 303 && playRes.status !== 307)) {
      return fallback.startsWith("/") ? `${origin}${fallback}` : fallback;
    }
    const openPath = open.split("?")[0];
    const openRes = await fetchImpl(`${origin}${openPath}`, {
      method: "HEAD",
      cache: "no-store",
    });
    if (openRes?.ok) return open.startsWith("/") ? `${origin}${open}` : open;
  } catch {
    /* fall through */
  }
  return fallback.startsWith("/") ? `${origin}${fallback}` : fallback;
}

/**
 * Stable path used when unique /c/<build>/ is not rewritten on the host.
 * @param {"full" | "lite"} [kind]
 */
export function companionFallbackPath(kind = "full") {
  void kind;
  return "/companion-full";
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
  if (isCompanionOpenPath(path)) return true;
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
  const currentPath = String(
    opts.currentPath || globalThis.location?.pathname || "",
  ).split("?")[0];
  const unique = companionBuildPath(build, kind);
  const fallback = companionFallbackPath(kind);
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);

  if (!opts.forceNewOpen && isCompanionOpenPath(currentPath)) {
    return currentPath;
  }
  if (!opts.forceNewOpen && pathHasBuild(currentPath, build)) {
    return currentPath;
  }

  const open = companionOpenPath(kind, opts.stamp);
  if (!fetchImpl) return open;
  try {
    const openRes = await fetchImpl(open, { method: "HEAD", cache: "no-store" });
    if (openRes?.ok) return open;
    const uniqueRes = await fetchImpl(unique, { method: "HEAD", cache: "no-store" });
    return uniqueRes?.ok ? unique : fallback;
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
  if (
    path === "/companion-full" ||
    /^\/c\/[^/]+\/full\/?$/i.test(path) ||
    /^\/n\/\d+\/full\/?$/i.test(path)
  ) {
    return "/prototypes/amoji-companion.html";
  }
  if (
    path === "/companion" ||
    /^\/c\/[^/]+\/lite\/?$/i.test(path) ||
    /^\/n\/\d+\/lite\/?$/i.test(path)
  ) {
    return "/prototypes/amoji-companion.html";
  }
  if (path === "/setup") return "/prototypes/amoji-setup.html";
  if (path === "/voice-emotion-demo" || path === "/voice-demo") {
    return "/prototypes/voice-emotion-demo.html";
  }
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
  url.pathname = pathOverride || companionOpenPath(kind);
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
  const sticky = isStickyCompanionBookmark(path);
  const forceNewOpen = Boolean(opts.forceNewOpen);
  const buildMatches = !shouldReloadForBuild(embedded, serverBuild);
  if (
    buildMatches &&
    (pathSatisfiesBuild(path, serverBuild, search) ||
      isCompanionOpenPath(path) ||
      isStickyCompanionBookmark(path))
  ) {
    if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }
  if (opts.purgeCaches !== false) {
    void purgeStaleBrowserCaches();
  }
  const kind = companionKindFromPath(path);
  const bootPath = serverBuild
    ? await resolveCompanionBootPath(serverBuild, kind, {
        fetchImpl,
        currentPath: path,
        forceNewOpen,
      })
    : path;
  const alreadyOnTarget =
    Boolean(serverBuild) &&
    path === bootPath &&
    pathSatisfiesBuild(path, serverBuild, search);
  if (buildMatches && alreadyOnTarget) {
    if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }
  if (
    buildMatches &&
    (pathSatisfiesBuild(path, serverBuild, search) ||
      isCompanionOpenPath(path) ||
      isStickyCompanionBookmark(path))
  ) {
    if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
    try {
      const url = new URL(globalThis.location.href);
      if (url.searchParams.get("build") !== serverBuild) {
        url.searchParams.set("build", serverBuild);
        globalThis.history?.replaceState?.(null, "", url.toString());
      }
    } catch {
      /* ignore */
    }
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }

  if (hasFreshBootAttempted(serverBuild) && alreadyOnTarget) {
    return {
      reloaded: false,
      serverBuild,
      pageBuild: embedded,
      skipped: true,
    };
  }

  if (!serverBuild) {
    return { reloaded: false, serverBuild, pageBuild: embedded };
  }

  markFreshBootAttempted(serverBuild);
  globalThis.__amojiActiveBuild = serverBuild;
  const nextUrl = buildFreshBootUrl(serverBuild, bootPath);
  const next = new URL(nextUrl, globalThis.location?.href || "http://localhost/");
  const sameDocument =
    next.pathname === path &&
    next.searchParams.get("build") ===
      new URLSearchParams(String(search || "").replace(/^\?/, "")).get("build");
  if (sameDocument) {
    return { reloaded: false, serverBuild, pageBuild: embedded, nextUrl };
  }
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
        pathSatisfiesBuild(path, serverBuild, search) &&
        !isStickyCompanionBookmark(path)
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
  const run = (runOpts = {}) => {
    void checkForAppUpdate(undefined, { ...opts, ...runOpts });
  };
  run({ purgeCaches: false });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) run({ purgeCaches: false });
    });
  }
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("pageshow", (ev) => {
      if (ev?.persisted) {
        run({ purgeCaches: false, forceNewOpen: false });
      }
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
