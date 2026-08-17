/**
 * Lab session archive — persistent labChat + tickRecorder with export/import.
 *
 * Used by the realtime voice lab to download/restore a session JSON archive.
 */

export const SESSION_ARCHIVE_KIND = "amoji-realtime-voice-lab-session";
export const SESSION_ARCHIVE_SCHEMA_VERSION = 1;

const DEFAULT_STORAGE_KEY = "amoji.realtimeVoiceLab.session";

/**
 * @typedef {{ id: string, role: string, text: string, ts: string, meta?: Record<string, unknown> }} LabChatMessage
 * @typedef {{ t: number, type: string, detail?: unknown }} LabTick
 */

/**
 * Persistent lab chat log (optional localStorage).
 * @param {{ storageKey?: string | null, storage?: Storage | null, now?: () => string }} [opts]
 */
export function createLabChat(opts = {}) {
  const storageKey =
    opts.storageKey === null ? null : (opts.storageKey ?? DEFAULT_STORAGE_KEY);
  const storage =
    opts.storage === null
      ? null
      : (opts.storage ??
        (typeof globalThis.localStorage !== "undefined"
          ? globalThis.localStorage
          : null));
  const now = opts.now ?? (() => new Date().toISOString());

  /** @type {LabChatMessage[]} */
  let messages = [];

  const persist = () => {
    if (!storage || !storageKey) return;
    storage.setItem(storageKey, JSON.stringify({ messages }));
  };

  const hydrate = () => {
    if (!storage || !storageKey) return;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.messages)) messages = parsed.messages;
    } catch {
      /* ignore corrupt storage */
    }
  };

  hydrate();

  return {
    get messages() {
      return messages.slice();
    },
    get length() {
      return messages.length;
    },
    /**
     * @param {{ role: string, text: string, meta?: Record<string, unknown>, id?: string, ts?: string }} entry
     */
    append(entry) {
      const message = {
        id: entry.id ?? `msg_${messages.length + 1}_${Date.now()}`,
        role: String(entry.role ?? "system"),
        text: String(entry.text ?? ""),
        ts: entry.ts ?? now(),
        ...(entry.meta ? { meta: entry.meta } : {}),
      };
      messages.push(message);
      persist();
      return message;
    },
    clear() {
      messages = [];
      persist();
    },
    toJSON() {
      return { messages: messages.slice() };
    },
    /** @param {{ messages?: LabChatMessage[] } | LabChatMessage[]} data */
    fromJSON(data) {
      const list = Array.isArray(data) ? data : (data?.messages ?? []);
      if (!Array.isArray(list)) {
        throw new TypeError("labChat.fromJSON expects { messages: [] }");
      }
      messages = list.map((m, i) => ({
        id: String(m.id ?? `msg_${i + 1}`),
        role: String(m.role ?? "system"),
        text: String(m.text ?? ""),
        ts: String(m.ts ?? now()),
        ...(m.meta ? { meta: m.meta } : {}),
      }));
      persist();
      return this;
    },
  };
}

/**
 * Timeline / tick recorder for lab events (VAD, phase, connect, …).
 * @param {{ nowMs?: () => number }} [opts]
 */
export function createTickRecorder(opts = {}) {
  const nowMs = opts.nowMs ?? (() => Date.now());
  const startedAt = nowMs();
  /** @type {LabTick[]} */
  let ticks = [];

  return {
    get ticks() {
      return ticks.slice();
    },
    get length() {
      return ticks.length;
    },
    get startedAt() {
      return startedAt;
    },
    /**
     * @param {string} type
     * @param {unknown} [detail]
     */
    record(type, detail) {
      const tick = {
        t: nowMs() - startedAt,
        type: String(type),
        ...(detail !== undefined ? { detail } : {}),
      };
      ticks.push(tick);
      return tick;
    },
    clear() {
      ticks = [];
    },
    toJSON() {
      return { startedAt, ticks: ticks.slice() };
    },
    /** @param {{ startedAt?: number, ticks?: LabTick[] } | LabTick[]} data */
    fromJSON(data) {
      const list = Array.isArray(data) ? data : (data?.ticks ?? []);
      if (!Array.isArray(list)) {
        throw new TypeError("tickRecorder.fromJSON expects { ticks: [] }");
      }
      ticks = list.map((tick) => ({
        t: Number(tick.t) || 0,
        type: String(tick.type ?? "unknown"),
        ...(tick.detail !== undefined ? { detail: tick.detail } : {}),
      }));
      return this;
    },
  };
}

/**
 * @param {{ labChat: ReturnType<typeof createLabChat>, tickRecorder: ReturnType<typeof createTickRecorder>, meta?: Record<string, unknown> }} parts
 */
export function buildSessionArchive(parts) {
  if (!parts?.labChat || !parts?.tickRecorder) {
    throw new TypeError("buildSessionArchive requires labChat and tickRecorder");
  }
  return {
    schemaVersion: SESSION_ARCHIVE_SCHEMA_VERSION,
    kind: SESSION_ARCHIVE_KIND,
    exportedAt: new Date().toISOString(),
    meta: { ...(parts.meta ?? {}) },
    chat: parts.labChat.toJSON(),
    ticks: parts.tickRecorder.toJSON(),
  };
}

/**
 * Validate and normalize a parsed archive object.
 * @param {unknown} raw
 */
export function parseSessionArchive(raw) {
  const archive = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!archive || typeof archive !== "object") {
    throw new TypeError("session archive must be an object");
  }
  if (archive.kind !== SESSION_ARCHIVE_KIND) {
    throw new TypeError(
      `session archive kind must be "${SESSION_ARCHIVE_KIND}"`,
    );
  }
  if (archive.schemaVersion !== SESSION_ARCHIVE_SCHEMA_VERSION) {
    throw new TypeError(
      `unsupported session archive schemaVersion: ${archive.schemaVersion}`,
    );
  }
  if (!archive.chat || !archive.ticks) {
    throw new TypeError("session archive requires chat and ticks");
  }
  return archive;
}

/**
 * Restore archive into lab façade stores.
 * @param {unknown} raw
 * @param {{ labChat: ReturnType<typeof createLabChat>, tickRecorder: ReturnType<typeof createTickRecorder> }} targets
 */
export function applySessionArchive(raw, targets) {
  const archive = parseSessionArchive(raw);
  targets.labChat.fromJSON(archive.chat);
  targets.tickRecorder.fromJSON(archive.ticks);
  return archive;
}

/**
 * Trigger a browser file download when document is available.
 * @param {string} json
 * @param {string} filename
 */
export function downloadJsonFile(json, filename) {
  if (typeof document === "undefined") return false;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

/** @deprecated alias — use downloadJsonFile */
export function downloadSessionArchiveJson(json, filename) {
  return downloadJsonFile(json, filename);
}

/**
 * Export turn metrics rollup JSON (optionally download).
 * @param {{ toJSON: () => object } | object} rollupOrJson
 * @param {{ download?: boolean, filename?: string, meta?: object }} [opts]
 */
export function exportTurnMetricsRollup(rollupOrJson, opts = {}) {
  const payload =
    typeof rollupOrJson?.toJSON === "function"
      ? {
          exportedAt: new Date().toISOString(),
          kind: "amoji-turn-metrics-rollup",
          meta: { ...(opts.meta ?? {}) },
          ...rollupOrJson.toJSON(),
        }
      : rollupOrJson;
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const filename =
    opts.filename ??
    `amoji-turn-metrics-${(payload.exportedAt || new Date().toISOString()).replace(/[:.]/g, "-")}.json`;
  const downloaded =
    opts.download === false ? false : downloadJsonFile(json, filename);
  return { json, payload, downloaded };
}

/**
 * Build archive JSON and optionally download it.
 * @param {{ labChat: ReturnType<typeof createLabChat>, tickRecorder: ReturnType<typeof createTickRecorder>, meta?: Record<string, unknown> } | object} partsOrArchive
 * @param {{ download?: boolean, filename?: string }} [opts]
 * @returns {{ json: string, archive: object, downloaded: boolean }}
 */
export function exportSessionArchive(partsOrArchive, opts = {}) {
  const archive =
    partsOrArchive?.kind === SESSION_ARCHIVE_KIND
      ? partsOrArchive
      : buildSessionArchive(partsOrArchive);
  const json = `${JSON.stringify(archive, null, 2)}\n`;
  const filename =
    opts.filename ??
    `amoji-lab-session-${archive.exportedAt?.replace(/[:.]/g, "-") ?? "export"}.json`;
  const downloaded =
    opts.download === false
      ? false
      : downloadSessionArchiveJson(json, filename);
  return { json, archive, downloaded };
}

/**
 * Import from File / Blob / string / object and optionally apply to stores.
 * @param {File | Blob | string | object} input
 * @param {{ labChat?: ReturnType<typeof createLabChat>, tickRecorder?: ReturnType<typeof createTickRecorder> }} [targets]
 */
export async function importSessionArchive(input, targets) {
  let raw = input;
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    raw = await input.text();
  }
  const archive = parseSessionArchive(raw);
  if (targets?.labChat && targets?.tickRecorder) {
    applySessionArchive(archive, targets);
  }
  return archive;
}

/**
 * Lab façade bundling persistent chat + ticks + export/import helpers.
 * @param {{
 *   storageKey?: string | null,
 *   storage?: Storage | null,
 *   meta?: Record<string, unknown>,
 *   now?: () => string,
 *   nowMs?: () => number,
 * }} [opts]
 */
export function createLabSessionFacade(opts = {}) {
  const labChat = createLabChat({
    storageKey: opts.storageKey,
    storage: opts.storage,
    now: opts.now,
  });
  const tickRecorder = createTickRecorder({ nowMs: opts.nowMs });
  const meta = { ...(opts.meta ?? {}) };

  return {
    labChat,
    tickRecorder,
    meta,
    appendChat(entry) {
      const message = labChat.append(entry);
      tickRecorder.record("chat", {
        id: message.id,
        role: message.role,
      });
      return message;
    },
    recordTick(type, detail) {
      return tickRecorder.record(type, detail);
    },
    exportSessionArchive(exportOpts = {}) {
      return exportSessionArchive(
        { labChat, tickRecorder, meta },
        exportOpts,
      );
    },
    async importSessionArchive(input) {
      return importSessionArchive(input, { labChat, tickRecorder });
    },
    clear() {
      labChat.clear();
      tickRecorder.clear();
    },
  };
}
