import { describe, expect, it } from "vitest";
import { pickOllamaModel } from "../engine/companion/companionOllama.js";

describe("companionOllama", () => {
  it("prefers qwen3:4b when installed", () => {
    const models = ["qwen3:8b", "qwen3:4b"];
    expect(pickOllamaModel(models)).toBe("qwen3:4b");
  });

  it("honours explicit preferred model", () => {
    const models = ["qwen3:4b", "qwen3:8b"];
    expect(pickOllamaModel(models, "qwen3:8b")).toBe("qwen3:8b");
  });

  it("falls back to qwen3:4b default when list empty", () => {
    expect(pickOllamaModel([], "qwen3:4b")).toBe("qwen3:4b");
  });
});
