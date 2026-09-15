export default function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    service: "amoji-companion",
    build: "2026-09-14-v41-speech-motion-polish",
    time: new Date().toISOString(),
    routes: {
      lite: "/companion?lang=yue",
      full: "/companion-full?lang=yue",
    },
  });
}
