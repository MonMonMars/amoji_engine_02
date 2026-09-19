// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import { createCompanionSecretaryBridge } from "../engine/companion/secretary/companionSecretaryBridge.js";
import { addMemoryFact } from "../engine/companion/secretary/memoryStore.js";

describe("companionSecretaryBridge", () => {
  /** @type {Storage} */
  let storage;

  beforeEach(() => {
    document.body.innerHTML = `
      <header class="topbar">
        <div class="topbar-actions"></div>
      </header>
    `;
    const map = new Map();
    storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => map.set(key, value),
      removeItem: (key) => map.delete(key),
    };
  });

  it("opens Me panel with saved memories", async () => {
    addMemoryFact("Prefers morning meetings", { storage });
    const bridge = createCompanionSecretaryBridge({
      doc: document,
      isEnglish: true,
      storage,
    });
    bridge.openPanel("me");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const body = document.getElementById("secretary-sheet-body");
    expect(body?.textContent).toContain("Prefers morning meetings");
    expect(document.querySelector(".secretary-overlay")?.hidden).toBe(false);
  });

  it("wires secretary tools into the unified settings menu section", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="settings-secretary-section" class="settings-secretary-section" hidden>
        <div class="settings-row settings-secretary-nav">
          <button type="button" id="settings-btn-secretary-today">Today</button>
          <button type="button" id="settings-btn-secretary-tasks">Tasks</button>
          <button type="button" id="settings-btn-secretary-memory">Memories</button>
        </div>
        <div id="settings-secretary-mode-row"></div>
      </div>
    `,
    );
    const bridge = createCompanionSecretaryBridge({
      doc: document,
      isEnglish: true,
      storage,
    });
    bridge.syncSettingsMenu();
    const section = document.getElementById("settings-secretary-section");
    expect(section?.hidden).toBe(false);
    expect(document.getElementById("settings-btn-secretary-memory")).toBeTruthy();
    expect(
      document.querySelectorAll("#settings-secretary-mode-row .secretary-chip").length,
    ).toBe(3);
    expect(document.getElementById("secretary-quick-bar")).toBeNull();
  });

  it("re-renders Me panel after memory tags", async () => {
    const bridge = createCompanionSecretaryBridge({
      doc: document,
      isEnglish: true,
      storage,
    });
    bridge.openPanel("me");
    await bridge.applyReplyTags("Got it [memory:loves oat milk]");
    const body = document.getElementById("secretary-sheet-body");
    expect(body?.textContent).toContain("oat milk");
  });

  it("routes tab=me via uiHandlers", () => {
    const bridge = createCompanionSecretaryBridge({
      doc: document,
      isEnglish: true,
      storage,
    });
    bridge.uiHandlers.switchTab("me");
    expect(document.querySelector("#secretary-sheet-title")?.textContent).toBe(
      "Me",
    );
  });
});
