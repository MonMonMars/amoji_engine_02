/**
 * Smoke: mock motion bridge ← SoftBank / Reachy / Unitree packages.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildRobotMotionPackage,
  sampleVendorMotionFrame,
  createMotionBridgeClient,
  createRobotMotionDispatcher,
} from "../engine/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 7891;
const bridgeUrl = `http://127.0.0.1:${port}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const child = spawn(
  process.execPath,
  [path.join(__dirname, "mock-motion-bridge.mjs"), "--port", String(port)],
  { stdio: ["ignore", "pipe", "pipe"] },
);

const waitReady = async () => {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`${bridgeUrl}/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("motion bridge did not become healthy");
};

try {
  await waitReady();
  const client = createMotionBridgeClient({ bridgeUrl });
  const health = await client.health();
  assert(health.ok, `health failed ${health.error}`);

  const softbank = buildRobotMotionPackage({
    text: "拜拜",
    vendor: "softbank",
  });
  const begin = await client.begin(softbank, { source: "smoke" });
  assert(begin.ok, `begin failed ${begin.error || begin.status}`);

  const frame = sampleVendorMotionFrame(0.4, {
    style: "wave",
    vendor: "reachy",
  });
  const framed = await client.frame(frame);
  assert(framed.ok, "frame failed");

  const g1 = buildRobotMotionPackage({
    style: "celebrate",
    vendor: "unitree_g1",
  });
  const disp = createRobotMotionDispatcher({ bridge: client });
  disp.begin(g1, { source: "smoke-disp" });
  await new Promise((r) => setTimeout(r, 80));
  disp.end({ reason: "smoke" });
  await new Promise((r) => setTimeout(r, 80));

  const end = await client.end({ reason: "smoke-done", vendor: "softbank" });
  assert(end.ok, "end failed");

  const remote = await client.fetchLog(20);
  assert(remote.ok, "log failed");
  assert(remote.log.length >= 3, `expected log entries got ${remote.log.length}`);
  assert(
    remote.log.some((e) => e.vendor === "softbank"),
    "missing softbank",
  );
  assert(
    remote.log.some((e) => e.vendor === "reachy"),
    "missing reachy",
  );

  console.log(
    "[motion-smoke] ok → log",
    remote.log.length,
    "forwarded",
    disp.bridgeForwarded,
    "url",
    bridgeUrl,
  );
} finally {
  child.kill("SIGTERM");
}
