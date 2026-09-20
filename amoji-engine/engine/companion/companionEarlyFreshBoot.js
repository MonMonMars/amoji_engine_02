/**
 * Early boot — sync build id from the URL; bounce sticky cached pathnames to /play.
 * /play → 303 → brand-new /n/<stamp>/full (see api/play.mjs).
 */
(function () {
  try {
    var path = (window.location.pathname || "").replace(/\/$/, "");
    if (
      path === "/companion-full" ||
      path === "/companion" ||
      path === "/prototypes/amoji-companion.html" ||
      /^\/c\/[^/]+\/full$/i.test(path)
    ) {
      window.location.replace("/play" + (window.location.search || ""));
      return;
    }
  } catch (e) {}

  var pageBuild = window.__amojiBuild;
  if (!pageBuild || !window.location) return;

  try {
    var url = new URL(window.location.href);
    var queryBuild = url.searchParams.get("build");
    if (queryBuild) {
      window.__amojiActiveBuild = queryBuild;
      window.__amojiBuild = queryBuild;
    }
  } catch (e) {}
})();
