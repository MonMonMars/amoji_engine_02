/**
 * Minimal HTTP robot motion bridge stub.
 * Accepts SoftBank / Furhat / Reachy / Unitree / ROS / Sakura packages
 * from the lab dispatcher — no vendor SDK required.
 *
 *   node scripts/mock-motion-bridge.mjs --port 7891
 *
 * Endpoints:
 *   GET  /health
 *   POST /motion/begin  { vendor, style, package, … }
 *   POST /motion/frame  { vendor, style, package, timeSec, … }
 *   POST /motion/end    { vendor, reason, … }
 *   GET  /motion/log
 *   POST /motion/clear
 */
import http from "node:http";

const port = Number(
  process.argv.includes("--port")
    ? process.argv[process.argv.indexOf("--port") + 1]
    : process.env.PORT || 7891,
);

/** @type {object[]} */
const log = [];
const maxLog = 500;

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(json);
}

function pushEntry(event, body) {
  const entry = {
    event,
    at: Date.now(),
    vendor: body.vendor || body.package?.vendor || null,
    style: body.style || body.package?.style || null,
    source: body.source || null,
    command: summarize(body.package || body),
    body,
  };
  log.push(entry);
  while (log.length > maxLog) log.shift();
  return entry;
}

function summarize(pkg) {
  if (!pkg) return "";
  if (pkg.softbank) return `tag:${pkg.softbank.tag}`;
  if (pkg.furhat) return pkg.furhat.name;
  if (pkg.reachy) return `r_arm[${pkg.reachy.r_arm?.[0]}]`;
  if (pkg.unitree_g1) {
    return `R.pitch ${pkg.unitree_g1.joints?.right_shoulder_pitch ?? 0}`;
  }
  if (pkg.ros) return `JointState×${pkg.ros.name?.length || 0}`;
  if (pkg.sakura) return `${pkg.sakura.parameters?.length || 0}p`;
  return pkg.style || pkg.command || "";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, {
        ok: true,
        mode: "mock-motion",
        vendors: [
          "sakura",
          "softbank",
          "furhat",
          "reachy",
          "unitree_g1",
          "ros",
        ],
        logLength: log.length,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/motion/log") {
      const limit = Math.min(
        200,
        Math.max(1, Number(url.searchParams.get("limit") || 50)),
      );
      send(res, 200, {
        ok: true,
        length: log.length,
        log: log.slice(-limit),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/motion/clear") {
      log.length = 0;
      send(res, 200, { ok: true, cleared: true });
      return;
    }

    if (req.method === "POST" && url.pathname === "/motion/begin") {
      const body = await readJson(req);
      const entry = pushEntry("begin", body);
      send(res, 200, {
        ok: true,
        accepted: true,
        event: "begin",
        vendor: entry.vendor,
        style: entry.style,
        command: entry.command,
        seq: log.length,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/motion/frame") {
      const body = await readJson(req);
      const entry = pushEntry("frame", body);
      send(res, 200, {
        ok: true,
        accepted: true,
        event: "frame",
        vendor: entry.vendor,
        timeSec: body.timeSec ?? body.package?.timeSec ?? null,
        command: entry.command,
        seq: log.length,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/motion/end") {
      const body = await readJson(req);
      const entry = pushEntry("end", body);
      send(res, 200, {
        ok: true,
        accepted: true,
        event: "end",
        vendor: entry.vendor,
        reason: body.reason || "complete",
        seq: log.length,
      });
      return;
    }

    send(res, 404, { ok: false, error: `not found ${url.pathname}` });
  } catch (err) {
    send(res, 500, { ok: false, error: err?.message || String(err) });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[mock-motion-bridge] http://127.0.0.1:${port}`);
});
