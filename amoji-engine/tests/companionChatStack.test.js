import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COMPANION_CHAT_STACK_SCHEMA } from "../engine/companion/companionChatStack.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("companionChatStack", () => {
  it("exports stack schema", () => {
    expect(COMPANION_CHAT_STACK_SCHEMA).toContain("grid-above-composer");
  });

  it("CSS keeps history in a scroll row above composer", () => {
    const css = readFileSync(
      join(root, "prototypes/companion-chat-stack.css"),
      "utf8",
    );
    expect(css).toMatch(/grid-template-areas[\s\S]*history[\s\S]*composer/);
    expect(css).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/justify-content:\s*flex-start/);
    expect(css).toMatch(/grid-area:\s*composer/);
  });

  it("companion HTML wires chat-stack stylesheet", () => {
    const html = readFileSync(
      join(root, "prototypes/amoji-companion.html"),
      "utf8",
    );
    expect(html).toContain("companion-chat-stack.css");
    expect(html).toMatch(/class="chat-column"[\s\S]*id="transcript"[\s\S]*id="listen-hint"/);
  });
});
