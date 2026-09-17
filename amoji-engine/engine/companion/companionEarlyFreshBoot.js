/**
 * Synchronous early cache-bust check (classic script, no imports).
 * Loaded in HTML <head> before CSS/modules so stale cached pages redirect once.
 *
 * iOS Safari often ignores query strings and keeps /companion-full forever.
 * Every fresh visit goes to a new pathname `/n/<timestamp>/full` (or `/play` 303).
 */
(function () {
  var pageBuild = window.__amojiBuild;
  if (!pageBuild || typeof fetch !== "function" || !window.location) return;

  var url = new URL(window.location.href);
  var requestedBuild = url.searchParams.get("build");
  if (requestedBuild) {
    window.__amojiActiveBuild = requestedBuild;
  }

  function parseBuildNumber(build) {
    var match = String(build || "").match(/-v(\d+)-/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  function shouldReload(page, server) {
    if (!page || !server || page === server) return false;
    var pageNum = parseBuildNumber(page);
    var serverNum = parseBuildNumber(server);
    if (pageNum > 0 && serverNum > 0) return serverNum > pageNum;
    return page !== server;
  }

  function pageKind() {
    var path = url.pathname || "";
    if (
      path === "/companion" ||
      path.indexOf("/companion?") === 0 ||
      path.indexOf("amoji-lite") >= 0 ||
      /\/lite\/?$/.test(path)
    ) {
      return "lite";
    }
    return "full";
  }

  function isOpenPath(path) {
    return /^\/n\/\d+\/(full|lite)\/?$/i.test(path || "");
  }

  function isStickyPath(path) {
    return (
      path === "/companion-full" ||
      path === "/companion" ||
      path === "/prototypes/amoji-companion.html" ||
      path === "/prototypes/amoji-lite.html"
    );
  }

  function hasBuildPath(serverBuild) {
    var path = url.pathname || "";
    return (
      path.indexOf("/c/" + serverBuild + "/") >= 0 ||
      path.indexOf("/c/" + encodeURIComponent(serverBuild) + "/") >= 0
    );
  }

  function isFallbackPath() {
    return isStickyPath(url.pathname || "");
  }

  function pathSatisfiesBuild(serverBuild) {
    if (hasBuildPath(serverBuild)) return true;
    if (url.searchParams.get("build") !== serverBuild) return false;
    return isOpenPath(url.pathname || "") || isFallbackPath();
  }

  function purgeCaches() {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (reg) {
            reg.unregister();
          });
        });
      }
      if (window.caches && caches.keys) {
        caches.keys().then(function (keys) {
          keys.forEach(function (key) {
            caches.delete(key);
          });
        });
      }
    } catch (e) {}
  }

  function go(path, serverBuild) {
    if (
      url.pathname === path &&
      url.searchParams.get("build") === serverBuild &&
      !isStickyPath(path)
    ) {
      return;
    }
    url.pathname = path;
    url.searchParams.set("build", serverBuild);
    url.searchParams.set("_cb", String(Date.now()));
    window.location.replace(url.toString());
  }

  function redirect(serverBuild, forceNewOpen) {
    var kind = pageKind();
    var stamp = Date.now();
    var openPath = "/n/" + stamp + "/" + kind;
    var pinnedPath = "/c/" + encodeURIComponent(serverBuild) + "/" + kind;
    var fallbackPath = kind === "lite" ? "/companion" : "/companion-full";
    var stay =
      !forceNewOpen &&
      (isOpenPath(url.pathname) || hasBuildPath(serverBuild));
    if (stay && pathSatisfiesBuild(serverBuild) && !shouldReload(pageBuild, serverBuild)) {
      return;
    }
    fetch(openPath, { method: "HEAD", cache: "no-store" })
      .then(function (res) {
        if (res && res.ok) {
          go(openPath, serverBuild);
          return;
        }
        return fetch(pinnedPath, { method: "HEAD", cache: "no-store" }).then(
          function (res2) {
            go(res2 && res2.ok ? pinnedPath : fallbackPath, serverBuild);
          },
        );
      })
      .catch(function () {
        go(fallbackPath, serverBuild);
      });
  }

  function probeServerBuild(forceNewOpen) {
    url = new URL(window.location.href);
    fetch("/api/health", { cache: "no-store", headers: { Pragma: "no-cache" } })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        var serverBuild = data && data.build;
        if (!serverBuild) return;
        purgeCaches();
        var sticky = isStickyPath(url.pathname || "");
        if (
          !forceNewOpen &&
          !sticky &&
          !shouldReload(pageBuild, serverBuild) &&
          pathSatisfiesBuild(serverBuild)
        ) {
          return;
        }
        redirect(serverBuild, Boolean(forceNewOpen || sticky));
      })
      .catch(function () {});
  }

  purgeCaches();
  probeServerBuild(isStickyPath(url.pathname || ""));

  window.addEventListener("pageshow", function (ev) {
    if (ev && ev.persisted) {
      purgeCaches();
      probeServerBuild(true);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") purgeCaches();
  });
})();
