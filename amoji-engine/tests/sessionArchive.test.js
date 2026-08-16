import { describe, expect, it, vi } from "vitest";
import {
  SESSION_ARCHIVE_KIND,
  SESSION_ARCHIVE_SCHEMA_VERSION,
  createLabChat,
  createLabSessionFacade,
  createTickRecorder,
  exportSessionArchive,
  importSessionArchive,
  parseSessionArchive,
} from "../engine/lab/sessionArchive.js";

describe("sessionArchive lab-facade", () => {
  it("persists labChat and records ticks, then round-trips via export/import", async () => {
    const memory = new Map();
    const storage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
    };

    const facade = createLabSessionFacade({
      storage,
      storageKey: "test.lab.session",
      meta: { lab: "realtime-voice-lab" },
      now: () => "2026-08-16T17:00:00.000Z",
      nowMs: (() => {
        let t = 1_000;
        return () => {
          t += 50;
          return t;
        };
      })(),
    });

    facade.appendChat({ role: "user", text: "你好呀" });
    facade.appendChat({ role: "assistant", text: "你好！有咩可以幫你？" });
    facade.recordTick("vad", { state: "speaking" });
    facade.recordTick("phase", { phase: "listening" });

    expect(facade.labChat.length).toBe(2);
    expect(facade.tickRecorder.length).toBe(4); // 2 chat ticks + 2 manual

    const { json, archive, downloaded } = facade.exportSessionArchive({
      download: false,
    });
    expect(downloaded).toBe(false);
    expect(archive.kind).toBe(SESSION_ARCHIVE_KIND);
    expect(archive.schemaVersion).toBe(SESSION_ARCHIVE_SCHEMA_VERSION);
    expect(archive.meta.lab).toBe("realtime-voice-lab");
    expect(archive.chat.messages).toHaveLength(2);
    expect(JSON.parse(json).ticks.ticks.length).toBe(4);

    const other = createLabSessionFacade({
      storage: null,
      storageKey: null,
      meta: { lab: "empty" },
    });
    expect(other.labChat.length).toBe(0);

    const imported = await other.importSessionArchive(json);
    expect(imported.chat.messages[0].text).toBe("你好呀");
    expect(other.labChat.length).toBe(2);
    expect(other.tickRecorder.length).toBe(4);
    expect(other.labChat.messages[1].role).toBe("assistant");
  });

  it("exportSessionArchive / importSessionArchive work as standalone lab APIs", async () => {
    const labChat = createLabChat({ storage: null, storageKey: null });
    const tickRecorder = createTickRecorder({ nowMs: () => 5000 });
    labChat.append({ role: "system", text: "session start", ts: "t0" });
    tickRecorder.record("connect");

    const { archive } = exportSessionArchive(
      { labChat, tickRecorder, meta: { source: "test" } },
      { download: false },
    );

    const labChat2 = createLabChat({ storage: null, storageKey: null });
    const tickRecorder2 = createTickRecorder();
    await importSessionArchive(archive, { labChat: labChat2, tickRecorder: tickRecorder2 });

    expect(labChat2.messages[0].text).toBe("session start");
    expect(tickRecorder2.ticks[0].type).toBe("connect");
  });

  it("rejects invalid archive kinds", () => {
    expect(() => parseSessionArchive({ kind: "nope", schemaVersion: 1 })).toThrow(
      /kind/,
    );
  });

  it("rehydrates labChat from storage", () => {
    const memory = new Map();
    const storage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
    };

    const first = createLabChat({ storage, storageKey: "persist-me" });
    first.append({ role: "user", text: "記得我", ts: "t1" });

    const second = createLabChat({ storage, storageKey: "persist-me" });
    expect(second.messages[0].text).toBe("記得我");
  });

  it("imports from a Blob like a lab file input", async () => {
    const facade = createLabSessionFacade({ storage: null, storageKey: null });
    facade.appendChat({ role: "user", text: "from-file" });
    const { json } = facade.exportSessionArchive({ download: false });

    const target = createLabSessionFacade({ storage: null, storageKey: null });
    const blob = new Blob([json], { type: "application/json" });
    await target.importSessionArchive(blob);
    expect(target.labChat.messages[0].text).toBe("from-file");
  });
});
