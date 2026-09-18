import { describe, expect, it, beforeEach } from "vitest";
import {
  appendChatHistory,
  chatHistoryStorageKey,
  clearChatHistory,
  hasUserMessages,
  loadChatHistory,
  saveChatHistory,
  starterPromptsForCharacter,
  trimChatHistory,
} from "../engine/companion/companionChatPersistence.js";

function createStorage() {
  /** @type {Map<string, string>} */
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
  };
}

describe("companionChatPersistence", () => {
  /** @type {ReturnType<typeof createStorage>} */
  let storage;

  beforeEach(() => {
    storage = createStorage();
    globalThis.localStorage = storage;
  });

  it("stores per-character history keys", () => {
    expect(chatHistoryStorageKey("nova")).toContain("nova");
    expect(chatHistoryStorageKey("amoji")).not.toBe(chatHistoryStorageKey("nova"));
  });

  it("appends and loads user/assistant messages", () => {
    appendChatHistory("nova", { role: "user", text: "Hello Nova" }, storage);
    appendChatHistory("nova", { role: "assistant", text: "Hi there!" }, storage);
    const loaded = loadChatHistory("nova", storage);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].role).toBe("user");
    expect(loaded[1].text).toBe("Hi there!");
  });

  it("trims history to max length", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: `u-${i}`,
      role: "user",
      text: `msg ${i}`,
      ts: i,
    }));
    const trimmed = trimChatHistory(many, 40);
    expect(trimmed).toHaveLength(40);
    expect(trimmed[0].text).toBe("msg 10");
    saveChatHistory("amoji", many, storage);
    expect(loadChatHistory("amoji", storage)).toHaveLength(40);
  });

  it("clears character history", () => {
    appendChatHistory("sora", { role: "user", text: "test" }, storage);
    clearChatHistory("sora", storage);
    expect(loadChatHistory("sora", storage)).toHaveLength(0);
  });

  it("returns character starter prompts", () => {
    expect(starterPromptsForCharacter("nova", true)).toHaveLength(4);
    expect(starterPromptsForCharacter("nova", true)[0]).toMatch(/today/i);
    expect(starterPromptsForCharacter("unknown", false)).toHaveLength(4);
  });

  it("detects user messages in history", () => {
    expect(hasUserMessages([])).toBe(false);
    expect(
      hasUserMessages([{ id: "a", role: "assistant", text: "hi", ts: 1 }]),
    ).toBe(false);
    expect(
      hasUserMessages([{ id: "u", role: "user", text: "hi", ts: 1 }]),
    ).toBe(true);
  });
});
