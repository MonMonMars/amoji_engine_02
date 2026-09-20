/**
 * Early boot — sync build id from the URL only.
 * Pathname redirects are handled once by /play → /c/<build>/full (see play.html).
 * Automatic reloads here caused character-picker loops on iOS/CDN mismatch.
 */
(function () {
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
