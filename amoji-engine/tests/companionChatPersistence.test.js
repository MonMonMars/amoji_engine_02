import { describe, expect, it, beforeEach } from "vitest";
import {
  appendChatHistory,
  chatHistoryStorageKey,
  clearChatHistory,
  storedChatForLlm,
  hasUserMessages,
  loadChatHistory,
  resolveTutorialSeed,
  saveChatHistory,
  starterPromptsForCharacter,
  trimChatHistory,
  TUTORIAL_VISIT_STORAGE_KEY,
} from "../engine/companion/companionChatPersistence.js";
import { AUTH_STORAGE_KEY } from "../engine/mobile/companionMobileAuth.js";

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
    appendChatHistory("mio", { role: "user", text: "test" }, storage);
    clearChatHistory("mio", storage);
    expect(loadChatHistory("mio", storage)).toHaveLength(0);
  });

  it("maps stored transcript to LLM history entries", () => {
    appendChatHistory("nova", { role: "user", text: "Hi" }, storage);
    appendChatHistory("nova", { role: "assistant", text: "Hello" }, storage);
    expect(storedChatForLlm("nova", storage)).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]);
  });

  it("returns tutorial starter prompts with feature copy", () => {
    const prompts = starterPromptsForCharacter("nova", true, { storage, seed: "test-seed" });
    expect(prompts).toHaveLength(8);
    expect(prompts.some((p) => /voice|mic|tap|camera|scene|menu/i.test(p))).toBe(true);
    const detailed = starterPromptsForCharacter("alicia", true, {
      storage,
      seed: "test-seed",
      detailed: true,
    });
    expect(detailed).toHaveLength(8);
    expect(detailed[0]).toMatchObject({ text: expect.any(String), cat: expect.any(String) });
  });

  it("changes starter prompts when character or login seed changes", () => {
    const nova = starterPromptsForCharacter("nova", true, { storage, seed: "user:1|visit-a" });
    const kizuna = starterPromptsForCharacter("kizuna", true, { storage, seed: "user:1|visit-a" });
    const novaLoggedOut = starterPromptsForCharacter("nova", true, { storage, seed: "visit-only" });
    expect(nova.join("|")).not.toBe(kizuna.join("|"));
    expect(nova.join("|")).not.toBe(novaLoggedOut.join("|"));
  });

  it("includes auth user id in tutorial seed when logged in", () => {
    storage.setItem(TUTORIAL_VISIT_STORAGE_KEY, "visit:abc");
    storage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token: "t", userId: "user-42", provider: "guest" }),
    );
    expect(resolveTutorialSeed(storage)).toBe("user:user-42|visit:abc");
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
