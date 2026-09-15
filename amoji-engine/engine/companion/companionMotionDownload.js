/**
 * Cloud motion download client — basic pack on connect, on-demand extensions.
 */
import {
  BASIC_MOTION_PACK,
  CLOUD_EXTENSION_MOTIONS,
  getCloudMotionDef,
  getMotionPack,
  MOTION_PACK_SCHEMA,
} from "./motionPackData.mjs";
import {
  isMotionInstalled,
  loadMotionInstallState,
  markMotionInstalled,
  markMotionsInstalled,
  saveMotionInstallState,
} from "./companionMotionLibrary.js";
import { learnPhaseForProgress } from "./companionLearnDialogue.js";
import { collectWaitPreloadMotionIds } from "./companionWaitAssets.js";

export const COMPANION_MOTION_DOWNLOAD_SCHEMA = "amoji.companionMotionDownload.v1";

/**
 * @param {{
 *   motionsUrl?: string,
 *   fetchImpl?: typeof fetch,
 *   storage?: Storage | null,
 *   fastProgress?: boolean,
 *   getPrefetchedBasicPack?: () => Promise<unknown> | unknown,
 *   onProgress?: (ev: { phase: string, progress: number, action?: string }) => void,
 * }} [opts]
 */
export function createMotionDownloadClient(opts = {}) {
  const fetchImpl =
    opts.fetchImpl ||
    (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
  const motionsUrl = opts.motionsUrl || "/api/motions";
  let state = loadMotionInstallState(opts.storage);
  /** @type {Map<string, Promise<unknown>>} */
  const inflight = new Map();

  const emit = (phase, progress, action) => {
    opts.onProgress?.({ phase, progress, action });
  };

  const fetchJson = async (url, onByteProgress) => {
    if (!fetchImpl) throw new Error("fetch unavailable");
    const res = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Motion server HTTP ${res.status}`);
    }

    const total = Number(res.headers?.get?.("content-length") || 0);
    const body = res.body;
    if (body && total > 0 && typeof body.getReader === "function") {
      const reader = body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onByteProgress?.(Math.min(1, received / total));
      }
      const merged = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const text = new TextDecoder().decode(merged);
      const data = JSON.parse(text);
      if (!data || data.ok === false) {
        throw new Error(data?.error || "motion server error");
      }
      onByteProgress?.(1);
      return data;
    }

    const data = await res.json();
    onByteProgress?.(1);
    if (!data || data.ok === false) {
      throw new Error(data?.error || "motion server error");
    }
    return data;
  };

  const fastProgress = opts.fastProgress !== false;

  const simulateProgress = async (actionId, steps) => {
    let p = 0;
    for (const step of steps) {
      p = Math.min(1, p + step.delta);
      emit(step.phase, p, actionId);
      if (!fastProgress && step.delayMs > 0) {
        await sleep(step.delayMs);
      }
    }
    return p;
  };

  const installPackMotions = (pack, tier) => {
    const ids = (pack.motions || []).map((m) => m.id || m);
    markMotionsInstalled(ids, state, { pack: pack.id, tier });
    if (pack.id === BASIC_MOTION_PACK.id) {
      state.basicPackVersion = pack.version || 1;
    }
    saveMotionInstallState(state, opts.storage);
    return ids;
  };

  const ensureBasicPack = async () => {
    const key = "basic-pack";
    if (inflight.has(key)) return inflight.get(key);

    const job = (async () => {
      if (state.basicPackVersion >= BASIC_MOTION_PACK.version) {
        emit("ready", 1);
        return { ok: true, cached: true, motions: listBasicInstalled() };
      }

      emit("connecting", 0.05);
      try {
        let prefetched = null;
        if (opts.getPrefetchedBasicPack) {
          try {
            prefetched = await opts.getPrefetchedBasicPack();
          } catch {
            prefetched = null;
          }
        }

        if (!prefetched?.pack) {
          await simulateProgress(null, [
            { phase: "connecting", delta: 0.12, delayMs: 120 },
            { phase: "searching", delta: 0.18, delayMs: 140 },
            { phase: "downloading", delta: 0.35, delayMs: 180 },
          ]);
        } else {
          emit("downloading", 0.62);
        }

        const data =
          prefetched?.pack && prefetched?.ok !== false
            ? prefetched
            : await fetchJson(`${motionsUrl}?pack=basic`, (bytePct) => {
                const mapped = 0.35 + bytePct * 0.28;
                emit("downloading", mapped);
              });
        const pack = data.pack;
        if (!pack || pack.schema !== MOTION_PACK_SCHEMA) {
          throw new Error("invalid basic motion pack");
        }

        await simulateProgress(null, [
          { phase: "learning", delta: 0.15, delayMs: 120 },
          { phase: "installing", delta: 0.12, delayMs: 100 },
          { phase: "ready", delta: 0.03, delayMs: 60 },
        ]);

        const ids = installPackMotions(pack, "basic");
        return { ok: true, cached: false, motions: ids, pack: pack.id };
      } catch (err) {
        emit("failed", 0);
        /* Offline fallback — mark basic catalog from embedded manifest */
        const ids = installPackMotions(BASIC_MOTION_PACK, "basic-offline");
        return {
          ok: true,
          offline: true,
          error: err?.message || String(err),
          motions: ids,
        };
      }
    })();

    inflight.set(key, job);
    try {
      return await job;
    } finally {
      inflight.delete(key);
    }
  };

  const ensureMotion = async (actionId) => {
    const id = String(actionId || "").toLowerCase();
    if (!id || id === "none" || id === "stop") {
      return { ok: true, action: id, installed: true };
    }
    if (isMotionInstalled(id, state)) {
      return { ok: true, action: id, installed: true, cached: true };
    }

    const key = `motion:${id}`;
    if (inflight.has(key)) return inflight.get(key);

    const job = (async () => {
      emit("learning", 0.08, id);
      try {
        await simulateProgress(id, [
          { phase: "connecting", delta: 0.1, delayMs: 100 },
          { phase: "searching", delta: 0.12, delayMs: 120 },
          { phase: "downloading", delta: 0.28, delayMs: 160 },
        ]);

        const cloudDef = getCloudMotionDef(id);
        let packTier = "catalog";

        if (cloudDef) {
          const data = await fetchJson(
            `${motionsUrl}?action=${encodeURIComponent(id)}`,
            (bytePct) => {
              const mapped = 0.32 + bytePct * 0.3;
              emit("downloading", mapped, id);
            },
          );
          const motion = data.motion;
          if (!motion || motion.id !== id) {
            throw new Error(`motion not found: ${id}`);
          }
          packTier = "extension";
        } else {
          const data = await fetchJson(`${motionsUrl}?pack=basic`, (bytePct) => {
            const mapped = 0.32 + bytePct * 0.28;
            emit("downloading", mapped, id);
          });
          const pack = data.pack || getMotionPack("basic");
          const found = (pack.motions || []).some(
            (m) => (m.id || m) === id,
          );
          if (!found) {
            throw new Error(`motion not in basic pack: ${id}`);
          }
        }

        await simulateProgress(id, [
          { phase: "learning", delta: 0.22, delayMs: 180 },
          { phase: "installing", delta: 0.18, delayMs: 140 },
          { phase: "ready", delta: 0.02, delayMs: 80 },
        ]);

        markMotionInstalled(id, state, { pack: packTier, tier: packTier });
        saveMotionInstallState(state, opts.storage);
        return { ok: true, action: id, installed: true, cached: false };
      } catch (err) {
        emit("failed", 0, id);
        return {
          ok: false,
          action: id,
          installed: false,
          error: err?.message || String(err),
        };
      }
    })();

    inflight.set(key, job);
    try {
      return await job;
    } finally {
      inflight.delete(key);
    }
  };

  const listBasicInstalled = () =>
    Object.keys(state.installed).filter((id) => state.installed[id]?.tier !== "extension");

  const ensureExtensionsPack = async () => {
    const key = "extensions-pack";
    if (inflight.has(key)) return inflight.get(key);

    const job = (async () => {
      await ensureBasicPack();
      const extensionIds = Object.keys(CLOUD_EXTENSION_MOTIONS);
      const missing = extensionIds.filter(
        (id) => id && !isMotionInstalled(id, state),
      );
      if (!missing.length) {
        return { ok: true, cached: true, motions: extensionIds };
      }

      emit("learning", 0.1);
      const results = await Promise.all(
        missing.map((id) =>
          ensureMotion(id).catch((err) => ({
            ok: false,
            action: id,
            error: err?.message || String(err),
          })),
        ),
      );
      const installed = results.filter((r) => r?.ok).map((r) => r.action);
      emit("ready", 1);
      return {
        ok: installed.length > 0 || missing.length === 0,
        motions: extensionIds,
        installed,
        missing: missing.filter((id) => !installed.includes(id)),
      };
    })();

    inflight.set(key, job);
    try {
      return await job;
    } finally {
      inflight.delete(key);
    }
  };

  const ensureWaitMotions = async (motionIds = collectWaitPreloadMotionIds()) => {
    const key = "wait-motions";
    if (inflight.has(key)) return inflight.get(key);

    const job = (async () => {
      await ensureBasicPack();
      const missing = motionIds.filter(
        (id) => id && !isMotionInstalled(id, state),
      );
      if (!missing.length) {
        return { ok: true, cached: true, motions: motionIds };
      }

      emit("learning", 0.12);
      const results = await Promise.all(
        missing.map((id) =>
          ensureMotion(id).catch((err) => ({
            ok: false,
            action: id,
            error: err?.message || String(err),
          })),
        ),
      );
      const installed = results.filter((r) => r?.ok).map((r) => r.action);
      emit("ready", 1);
      return {
        ok: installed.length > 0 || missing.length === 0,
        motions: motionIds,
        installed,
        missing: missing.filter((id) => !installed.includes(id)),
      };
    })();

    inflight.set(key, job);
    try {
      return await job;
    } finally {
      inflight.delete(key);
    }
  };

  return {
    schema: COMPANION_MOTION_DOWNLOAD_SCHEMA,
    get state() {
      return state;
    },
    refreshState() {
      state = loadMotionInstallState(opts.storage);
      return state;
    },
    isInstalled(actionId) {
      return isMotionInstalled(actionId, state);
    },
    ensureBasicPack,
    ensureMotion,
    ensureExtensionsPack,
    ensureWaitMotions,
    learnPhaseForProgress,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
