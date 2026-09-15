/**
 * Synchronous early cache-bust check (classic script, no imports).
 * Loaded in HTML <head> before CSS/modules so stale cached pages redirect once.
 */
(function () {
  var pageBuild = window.__amojiBuild;
  if (!pageBuild || typeof fetch !== "function" || !window.location) return;

  var prefix = "amoji.freshBoot.v1:";
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

  function redirect(serverBuild) {
    if (sessionStorage.getItem(prefix + serverBuild) === "1") return;
    sessionStorage.setItem(prefix + serverBuild, "1");
    url.searchParams.set("build", serverBuild);
    url.searchParams.set("_cb", String(Date.now()));
    window.location.replace(url.toString());
  }

  fetch("/api/health", { cache: "no-store", headers: { Pragma: "no-cache" } })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      var serverBuild = data && data.build;
      if (!shouldReload(pageBuild, serverBuild)) return;
      if (requestedBuild === serverBuild) return;
      redirect(serverBuild);
    })
    .catch(function () {});
})();
