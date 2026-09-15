/**
 * Fresh-boot helpers — detect newer server builds and cache-bust dynamic imports.
 */
import { AMOJI_BUILD } from "./buildVersion.mjs";

export const COMPANION_FRESH_BOOT_SCHEMA = "amoji.companionFreshBoot.v1";

/**
 * @param {string | null | undefined} pageBuild
 * @param {string | null | undefined} serverBuild
 */
export function shouldReloadForBuild(pageBuild, serverBuild) {
  return Boolean(
    pageBuild &&
      serverBuild &&
      String(pageBuild) !== String(serverBuild),
  );
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
 * @param {string} path
 */
export function ami(path) {
  const build =
    globalThis.__amojiBuild ||
    globalThis.__amojiActiveBuild ||
    AMOJI_BUILD;
  return import(versionedModuleUrl(path, build));
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
  if (shouldReloadForBuild(embedded, serverBuild)) {
    globalThis.__amojiActiveBuild = serverBuild;
    if (typeof globalThis.location?.reload === "function") {
      globalThis.location.reload();
    }
    return { reloaded: true, serverBuild, pageBuild: embedded };
  }

  if (serverBuild) globalThis.__amojiActiveBuild = serverBuild;
  return { reloaded: false, serverBuild, pageBuild: embedded };
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
