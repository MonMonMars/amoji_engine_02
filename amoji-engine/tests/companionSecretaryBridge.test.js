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

  it("adds Me button to secretary quick bar", () => {
    createCompanionSecretaryBridge({
      doc: document,
      isEnglish: true,
      storage,
    });
    const bar = document.getElementById("secretary-quick-bar");
    expect(bar?.textContent).toContain("Me");
    expect(bar?.querySelector('[data-secretary-panel="me"]')).toBeTruthy();
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
