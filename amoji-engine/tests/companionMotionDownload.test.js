import { describe, expect, it, vi } from "vitest";
import { createMotionDownloadClient } from "../engine/companion/companionMotionDownload.js";
import { BASIC_MOTION_PACK } from "../engine/companion/motionPackData.mjs";

function mockStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("companionMotionDownload", () => {
  it("installs basic pack from mock cloud API", async () => {
    const storage = mockStorage();
    const phases = [];
    const client = createMotionDownloadClient({
      storage,
      fetchImpl: async (url) => {
        if (String(url).includes("pack=basic")) {
          return {
            ok: true,
            json: async () => ({ ok: true, pack: BASIC_MOTION_PACK }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ ok: false }) };
      },
      onProgress: (ev) => phases.push(ev.phase),
    });

    const result = await client.ensureBasicPack();
    expect(result.ok).toBe(true);
    expect(client.isInstalled("dance")).toBe(true);
    expect(phases).toContain("ready");
  });

  it("uses prefetched basic pack without extra fetch", async () => {
    const storage = mockStorage();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ ok: false }),
    }));
    const client = createMotionDownloadClient({
      storage,
      fetchImpl,
      getPrefetchedBasicPack: async () => ({
        ok: true,
        pack: BASIC_MOTION_PACK,
      }),
    });

    const result = await client.ensureBasicPack();
    expect(result.ok).toBe(true);
    expect(result.cached).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.isInstalled("dance")).toBe(true);
  });

  it("downloads cloud extension motion on demand", async () => {
    const storage = mockStorage();
    const client = createMotionDownloadClient({
      storage,
      fetchImpl: async (url) => {
        const u = String(url);
        if (u.includes("pack=basic")) {
          return {
            ok: true,
            json: async () => ({ ok: true, pack: BASIC_MOTION_PACK }),
          };
        }
        if (u.includes("action=breakdance")) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              motion: { id: "breakdance", extends: "dance" },
            }),
          };
        }
        return { ok: false, status: 404, json: async () => ({ ok: false }) };
      },
    });

    await client.ensureBasicPack();
    expect(client.isInstalled("breakdance")).toBe(false);
    const learned = await client.ensureMotion("breakdance");
    expect(learned.ok).toBe(true);
    expect(client.isInstalled("breakdance")).toBe(true);
  });
});
