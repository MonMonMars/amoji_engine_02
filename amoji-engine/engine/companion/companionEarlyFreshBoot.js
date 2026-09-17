/**
 * Synchronous early cache-bust check (classic script, no imports).
 * Loaded in HTML <head> before CSS/modules so stale cached pages redirect once.
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

  function hasBuildPath(serverBuild) {
    var path = url.pathname || "";
    return (
      path.indexOf("/c/" + serverBuild + "/") >= 0 ||
      path.indexOf("/c/" + encodeURIComponent(serverBuild) + "/") >= 0
    );
  }

  function isFallbackPath() {
    var path = url.pathname || "";
    return (
      path === "/companion-full" ||
      path === "/companion" ||
      path === "/prototypes/amoji-companion.html" ||
      path === "/prototypes/amoji-lite.html"
    );
  }

  function pathSatisfiesBuild(serverBuild) {
    if (hasBuildPath(serverBuild)) return true;
    return isFallbackPath() && url.searchParams.get("build") === serverBuild;
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

  function redirect(serverBuild) {
    var uniquePath = "/c/" + encodeURIComponent(serverBuild) + "/" + pageKind();
    var fallbackPath = pageKind() === "lite" ? "/companion" : "/companion-full";
    function go(path) {
      if (
        url.pathname === path &&
        url.searchParams.get("build") === serverBuild
      ) {
        return;
      }
      url.pathname = path;
      url.searchParams.set("build", serverBuild);
      url.searchParams.set("_cb", String(Date.now()));
      window.location.replace(url.toString());
    }
    fetch(uniquePath, { method: "HEAD", cache: "no-store" })
      .then(function (res) {
        go(res && res.ok ? uniquePath : fallbackPath);
      })
      .catch(function () {
        go(fallbackPath);
      });
  }

  fetch("/api/health", { cache: "no-store", headers: { Pragma: "no-cache" } })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      var serverBuild = data && data.build;
      if (!serverBuild) return;
      purgeCaches();
      if (!shouldReload(pageBuild, serverBuild) && hasBuildPath(serverBuild)) return;
      if (!shouldReload(pageBuild, serverBuild) && pathSatisfiesBuild(serverBuild)) return;
      redirect(serverBuild);
    })
    .catch(function () {});
})();
