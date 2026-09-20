import { describe, expect, it } from "vitest";
import { createCompanionChat } from "../engine/companion/chatLlm.js";

describe("createCompanionChat history", () => {
  it("setHistory hydrates in-memory turns for the LLM client", () => {
    const chat = createCompanionChat({ apiUrl: null });
    chat.setHistory([
      { role: "user", content: "Earlier question" },
      { role: "assistant", text: "Earlier answer" },
      { role: "system", content: "ignored" },
    ]);
    expect(chat.history).toEqual([
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
    ]);
    chat.clearHistory();
    expect(chat.history).toEqual([]);
  });
});
