/**
 * HTTP client for the robot motion bridge (mock or hardware adapter).
 *
 * Posts begin/frame/end packages produced by talkMotion adapters.
 */
export const MOTION_BRIDGE_CLIENT_SCHEMA = "amoji.motionBridgeClient.v1";

/**
 * @param {{
 *   bridgeUrl?: string | null,
 *   mode?: 'http' | 'off',
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   onEvent?: (ev: string, payload?: object) => void,
 * }} [opts]
 */
export function createMotionBridgeClient(opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const timeoutMs = opts.timeoutMs ?? 2500;
  let bridgeUrl = normalizeBridgeUrl(opts.bridgeUrl);
  let mode = opts.mode || (bridgeUrl ? "http" : "off");
  /** @type {object[]} */
  const sent = [];
  let lastError = null;
  let lastOk = null;

  const emit = (ev, payload) => opts.onEvent?.(ev, payload);

  const post = async (path, body) => {
    if (mode !== "http" || !bridgeUrl || !fetchImpl) {
      return { ok: false, skipped: true, reason: mode === "off" ? "off" : "no-fetch" };
    }
    const url = `${bridgeUrl.replace(/\/$/, "")}${path}`;
    const ctrl =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer =
      ctrl && timeoutMs > 0
        ? setTimeout(() => ctrl.abort(), timeoutMs)
        : null;
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        signal: ctrl?.signal,
      });
      const data = await res.json().catch(() => ({}));
      const entry = {
        path,
        ok: res.ok && data.ok !== false,
        status: res.status,
        data,
        at: Date.now(),
      };
      sent.push(entry);
      while (sent.length > 80) sent.shift();
      lastOk = entry.ok;
      lastError = entry.ok ? null : data.error || `HTTP ${res.status}`;
      emit(entry.ok ? "ok" : "error", entry);
      return entry;
    } catch (err) {
      lastOk = false;
      lastError = err?.message || String(err);
      const entry = {
        path,
        ok: false,
        error: lastError,
        at: Date.now(),
      };
      sent.push(entry);
      emit("error", entry);
      return entry;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return {
    get schema() {
      return MOTION_BRIDGE_CLIENT_SCHEMA;
    },
    get mode() {
      return mode;
    },
    get bridgeUrl() {
      return bridgeUrl;
    },
    get lastError() {
      return lastError;
    },
    get lastOk() {
      return lastOk;
    },
    get sent() {
      return sent.slice();
    },
    setBridgeUrl(url) {
      bridgeUrl = normalizeBridgeUrl(url);
      mode = bridgeUrl ? "http" : "off";
      return bridgeUrl;
    },
    setMode(next) {
      mode = next === "http" && bridgeUrl ? "http" : "off";
      return mode;
    },
    async health() {
      if (mode !== "http" || !bridgeUrl || !fetchImpl) {
        return { ok: mode === "off", mode, skipped: true };
      }
      try {
        const res = await fetchImpl(
          `${bridgeUrl.replace(/\/$/, "")}/health`,
          { method: "GET" },
        );
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok && data.ok !== false, ...data, mode: "http" };
      } catch (err) {
        return { ok: false, error: err?.message || String(err), mode: "http" };
      }
    },
    begin(motionPackage, meta = {}) {
      return post("/motion/begin", {
        vendor: motionPackage?.vendor,
        style: motionPackage?.style,
        package: motionPackage,
        source: meta.source || "client",
        annotatedReply: meta.annotatedReply || null,
        sayText:
          meta.sayText ||
          motionPackage?.furhat?.say ||
          null,
      });
    },
    frame(framePackage, meta = {}) {
      return post("/motion/frame", {
        vendor: framePackage?.vendor,
        style: framePackage?.style,
        timeSec: framePackage?.timeSec,
        package: framePackage,
        source: meta.source || "client",
      });
    },
    end(meta = {}) {
      return post("/motion/end", {
        vendor: meta.vendor || null,
        reason: meta.reason || "complete",
        source: meta.source || "client",
      });
    },
    async fetchLog(limit = 50) {
      if (mode !== "http" || !bridgeUrl || !fetchImpl) {
        return { ok: false, log: [], skipped: true };
      }
      try {
        const res = await fetchImpl(
          `${bridgeUrl.replace(/\/$/, "")}/motion/log?limit=${limit}`,
        );
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, ...data };
      } catch (err) {
        return { ok: false, error: err?.message || String(err), log: [] };
      }
    },
  };
}

/** @param {string | null | undefined} url */
function normalizeBridgeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || raw === "off" || raw === "none") return null;
  return raw.replace(/\/$/, "");
}
