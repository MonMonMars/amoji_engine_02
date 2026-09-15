import { AMOJI_BUILD } from "../amoji-engine/engine/companion/buildVersion.mjs";

export default function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.status(200).json({
    ok: true,
    service: "amoji-companion",
    build: AMOJI_BUILD,
    time: new Date().toISOString(),
    routes: {
      lite: "/companion?lang=yue",
      full: "/companion-full?lang=yue",
    },
  });
}
