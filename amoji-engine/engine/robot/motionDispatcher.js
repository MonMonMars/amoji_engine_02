/**
 * Mock / lab robot motion dispatcher.
 *
 * Records vendor motion packages and optionally forwards them to an HTTP
 * motion bridge (SoftBank / Furhat / Reachy / Unitree / ROS adapters).
 */
export const ROBOT_MOTION_DISPATCH_SCHEMA = "amoji.robotMotionDispatch.v1";

/**
 * @param {{
 *   onDispatch?: (event: object) => void,
 *   maxLog?: number,
 *   bridge?: {
 *     begin?: Function,
 *     frame?: Function,
 *     end?: Function,
 *     mode?: string,
 *   } | null,
 * }} [opts]
 */
export function createRobotMotionDispatcher(opts = {}) {
  const maxLog = Math.max(1, opts.maxLog ?? 100);
  /** @type {object[]} */
  const log = [];
  let sequence = 0;
  /** @type {object | null} */
  let last = null;
  let active = false;
  let bridge = opts.bridge || null;
  let bridgeForwarded = 0;
  let bridgeErrors = 0;

  const push = (entry) => {
    last = entry;
    log.push(entry);
    while (log.length > maxLog) log.shift();
    opts.onDispatch?.(entry);
    return entry;
  };

  const forward = (method, payload, meta) => {
    if (!bridge || bridge.mode === "off") return;
    const fn = bridge[method];
    if (typeof fn !== "function") return;
    try {
      const result = fn.call(bridge, payload, meta);
      if (result && typeof result.then === "function") {
        result.then(
          (res) => {
            if (res?.ok) bridgeForwarded += 1;
            else if (res && !res.skipped) bridgeErrors += 1;
          },
          () => {
            bridgeErrors += 1;
          },
        );
      } else if (result?.ok) {
        bridgeForwarded += 1;
      }
    } catch {
      bridgeErrors += 1;
    }
  };

  return {
    get schema() {
      return ROBOT_MOTION_DISPATCH_SCHEMA;
    },
    get length() {
      return log.length;
    },
    get last() {
      return last;
    },
    get active() {
      return active;
    },
    get log() {
      return log.slice();
    },
    get bridgeForwarded() {
      return bridgeForwarded;
    },
    get bridgeErrors() {
      return bridgeErrors;
    },
    setBridge(next) {
      bridge = next || null;
      return bridge;
    },
    clear() {
      log.length = 0;
      last = null;
      active = false;
      sequence = 0;
      bridgeForwarded = 0;
      bridgeErrors = 0;
    },
    /**
     * @param {object | null | undefined} motionPackage
     * @param {{ source?: string, annotatedReply?: string | null }} [meta]
     */
    begin(motionPackage, meta = {}) {
      if (!motionPackage) return null;
      active = true;
      sequence += 1;
      const entry = push({
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        event: "begin",
        seq: sequence,
        at: Date.now(),
        source: meta.source || "talk",
        vendor: motionPackage.vendor,
        style: motionPackage.style,
        package: motionPackage,
        command: summarizeCommand(motionPackage),
      });
      forward("begin", motionPackage, meta);
      return entry;
    },
    /**
     * @param {object | null | undefined} frame
     * @param {{ source?: string }} [meta]
     */
    frame(frame, meta = {}) {
      if (!frame || !active) return null;
      sequence += 1;
      const entry = push({
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        event: "frame",
        seq: sequence,
        at: Date.now(),
        source: meta.source || "raf",
        vendor: frame.vendor,
        style: frame.style,
        timeSec: frame.timeSec,
        package: frame,
        command: summarizeCommand(frame),
      });
      forward("frame", frame, meta);
      return entry;
    },
    /**
     * @param {{ source?: string, reason?: string }} [meta]
     */
    end(meta = {}) {
      if (!active && !last) return null;
      active = false;
      sequence += 1;
      const entry = push({
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        event: "end",
        seq: sequence,
        at: Date.now(),
        source: meta.source || "done",
        reason: meta.reason || "complete",
        vendor: last?.vendor || null,
        style: last?.style || null,
      });
      forward(
        "end",
        {
          vendor: last?.vendor || null,
          reason: meta.reason || "complete",
          source: meta.source || "done",
        },
        meta,
      );
      return entry;
    },
    formatHud() {
      if (!last) return "—";
      const bridgeBit =
        bridge?.mode === "http"
          ? ` · bridge ${bridgeForwarded}ok/${bridgeErrors}err`
          : "";
      if (last.event === "end") {
        return `${last.vendor || "?"} · idle${bridgeBit}`;
      }
      const cmd = last.command || last.style || "?";
      return `${last.vendor} · ${last.event} · ${cmd}${bridgeBit}`;
    },
    toJSON() {
      return {
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        active,
        length: log.length,
        bridgeForwarded,
        bridgeErrors,
        last,
        log: log.slice(),
      };
    },
  };
}

/** @param {object} pkg */
function summarizeCommand(pkg) {
  if (!pkg) return "";
  if (pkg.softbank) return `tag:${pkg.softbank.tag}`;
  if (pkg.furhat) return pkg.furhat.name;
  if (pkg.reachy) return `r_arm[${pkg.reachy.r_arm?.[0]}]`;
  if (pkg.unitree_g1) {
    return `R.pitch ${pkg.unitree_g1.joints?.right_shoulder_pitch ?? 0}`;
  }
  if (pkg.ros) return `JointState×${pkg.ros.name?.length || 0}`;
  if (pkg.sakura) return `${pkg.sakura.parameters?.length || 0}p`;
  return pkg.style || "";
}
