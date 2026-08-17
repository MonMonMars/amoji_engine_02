/**
 * Mock / lab robot motion dispatcher.
 *
 * Records vendor motion packages as if sent to SoftBank qi, Furhat HTTP,
 * Reachy SDK, Unitree, or ROS — without requiring hardware.
 */
export const ROBOT_MOTION_DISPATCH_SCHEMA = "amoji.robotMotionDispatch.v1";

/**
 * @param {{
 *   onDispatch?: (event: object) => void,
 *   maxLog?: number,
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

  const push = (entry) => {
    last = entry;
    log.push(entry);
    while (log.length > maxLog) log.shift();
    opts.onDispatch?.(entry);
    return entry;
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
    clear() {
      log.length = 0;
      last = null;
      active = false;
      sequence = 0;
    },
    /**
     * Begin a talk-motion package (style / vendor command envelope).
     * @param {object | null | undefined} motionPackage
     * @param {{ source?: string }} [meta]
     */
    begin(motionPackage, meta = {}) {
      if (!motionPackage) return null;
      active = true;
      sequence += 1;
      return push({
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
    },
    /**
     * Push a time-sampled vendor frame (Reachy / Unitree / ROS / Sakura).
     * @param {object | null | undefined} frame
     * @param {{ source?: string }} [meta]
     */
    frame(frame, meta = {}) {
      if (!frame || !active) return null;
      sequence += 1;
      return push({
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
    },
    /**
     * End active motion (barge / TTS idle / turn done).
     * @param {{ source?: string, reason?: string }} [meta]
     */
    end(meta = {}) {
      if (!active && !last) return null;
      active = false;
      sequence += 1;
      return push({
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        event: "end",
        seq: sequence,
        at: Date.now(),
        source: meta.source || "done",
        reason: meta.reason || "complete",
        vendor: last?.vendor || null,
        style: last?.style || null,
      });
    },
    formatHud() {
      if (!last) return "—";
      if (last.event === "end") {
        return `${last.vendor || "?"} · idle`;
      }
      const cmd = last.command || last.style || "?";
      return `${last.vendor} · ${last.event} · ${cmd}`;
    },
    toJSON() {
      return {
        schema: ROBOT_MOTION_DISPATCH_SCHEMA,
        active,
        length: log.length,
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
