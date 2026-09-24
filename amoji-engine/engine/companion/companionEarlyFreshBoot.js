/**
 * Early boot — sync build id from the URL; bounce sticky cached pathnames to /play.
 * /play → 303 → brand-new /n/<stamp>/full (see api/play.mjs).
 */
(function () {
  var SCENE_KEY = "amoji.companion.scenePreset";
  var SCENE_ART_V = "picker-anime-v581-scene-ship";
  var OUTDOOR_SCENE = " night-city rooftop park beach sunset aurora rain-street cherry-blossom mountain harbor meadow zen-garden day-skyline bamboo-forest train-platform ";
  var LEGACY_SCENE = { minimal: "cozy-room" };

  function resolveSceneId(raw) {
    var key = String(raw || "bedroom").toLowerCase();
    if (LEGACY_SCENE[key]) return LEGACY_SCENE[key];
    return key;
  }

  function scenePngArtUrl(id) {
    if (id === "night-city") {
      return "/prototypes/assets/companion-bg-anime.png?v=" + SCENE_ART_V;
    }
    return "/prototypes/assets/scene-bg/" + id + ".png?v=" + SCENE_ART_V;
  }

  function sceneSvgArtUrl(id) {
    return "/prototypes/assets/scene-bg/" + id + ".svg?v=" + SCENE_ART_V;
  }

  function paintAtmosphereEarly() {
    try {
      var id = "bedroom";
      var raw = localStorage.getItem(SCENE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.backgroundId) {
          id = resolveSceneId(parsed.backgroundId);
        }
      }
      var el = document.querySelector(".atmosphere");
      if (!el) return;
      el.setAttribute("data-scene-bg", id);
      el.setAttribute(
        "data-scene-environment",
        OUTDOOR_SCENE.indexOf(" " + id + " ") >= 0 ? "outdoor" : "indoor",
      );
      var png = scenePngArtUrl(id);
      var svg = sceneSvgArtUrl(id);
      el.style.backgroundImage =
        'linear-gradient(180deg, rgba(7, 10, 16, 0.02) 0%, rgba(5, 7, 12, 0.12) 55%, rgba(3, 5, 10, 0.32) 100%), url("' +
        png +
        '"), url("' +
        svg +
        '")';
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
    } catch (e) {}
  }

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paintAtmosphereEarly);
  } else {
    paintAtmosphereEarly();
  }

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

  try {
    if (typeof fetch !== "function") return;
    fetch("/api/health", { cache: "no-store" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        var serverBuild = data && data.build;
        if (!serverBuild) return;
        window.__amojiActiveBuild = serverBuild;
        if (serverBuild === window.__amojiBuild) return;
        var mPage = String(pageBuild || "").match(/-v(\d+)-/i);
        var mServer = String(serverBuild || "").match(/-v(\d+)-/i);
        var pageNum = mPage ? parseInt(mPage[1], 10) : 0;
        var serverNum = mServer ? parseInt(mServer[1], 10) : 0;
        if (pageNum > 0 && serverNum > 0 && serverNum <= pageNum) return;
        window.__amojiBuild = serverBuild;
      })
      .catch(function () {});
  } catch (e) {}
})();
