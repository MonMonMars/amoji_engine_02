import { describe, expect, it } from "vitest";
import {
  buildCharacterLlmRecord,
  buildLlmContextDatabaseFragment,
  buildUserMenuCatalog,
  compressChatHistoryForLlm,
  readLlmContextDb,
  refreshLlmContextDb,
  writeLlmContextDb,
} from "../engine/companion/companionLlmContextDb.js";

describe("companionLlmContextDb", () => {
  const storage = {
    data: /** @type {Record<string, string>} */ ({}),
    getItem(k) {
      return this.data[k] ?? null;
    },
    setItem(k, v) {
      this.data[k] = v;
    },
    removeItem(k) {
      delete this.data[k];
    },
  };

  it("builds character record with voice, idle, and performance fields", () => {
    const rec = buildCharacterLlmRecord("rex", "yue", false);
    expect(rec.id).toBe("rex");
    expect(rec.gender).toBe("male");
    expect(rec.voices.yue).toContain("WanLung");
    expect(rec.tapLines.length).toBeGreaterThan(0);
    expect(rec.postureIdle.greetingPerformance.talkStyle).toBeTruthy();
    expect(rec.performanceStyle.moves.length).toBeGreaterThan(0);
  });

  it("compresses user chat into main points and summary", () => {
    const mem = compressChatHistoryForLlm(
      [
        { role: "user", text: "Today I want to finish the report", ts: 1, id: "1" },
        { role: "assistant", text: "OK", ts: 2, id: "2" },
        { role: "user", text: "Remember that my dog is named Mochi", ts: 3, id: "3" },
      ],
      { isEnglish: true, storage },
    );
    expect(mem.mainPoints.length).toBeGreaterThan(0);
    expect(mem.compressedSummary).toMatch(/report|Mochi/i);
  });

  it("persists and injects database fragment into prompt text", () => {
    refreshLlmContextDb({
      characterId: "nova",
      langCode: "en",
      isEnglish: true,
      role: "girlfriend",
      storage,
      menuState: { companionName: "Nova" },
    });
    const fragment = buildLlmContextDatabaseFragment({ storage, isEnglish: true });
    expect(fragment).toMatch(/LLM CONTEXT DATABASE/);
    expect(fragment).toMatch(/USER MENU/);
    expect(fragment).toMatch(/Nova/);
    expect(fragment).toMatch(/ACTIVE 3D CHARACTER/);
    const db = readLlmContextDb(storage);
    expect(db.userMenu.items.length).toBeGreaterThan(5);
    writeLlmContextDb({ chatMemory: { ...db.chatMemory, compressedSummary: "test" } }, storage);
    expect(readLlmContextDb(storage).chatMemory.compressedSummary).toBe("test");
  });

  it("lists settings menu entries for LLM help", () => {
    const menu = buildUserMenuCatalog(true, { companionName: "Sky" });
    expect(menu.items.some((i) => i.id === "switch_companion")).toBe(true);
    expect(menu.items.some((i) => i.id === "attach_files")).toBe(true);
  });
});
