import { describe, expect, it } from "vitest";
import {
  buildAttachmentPromptBlock,
  buildChatTurnText,
  classifyAttachmentFile,
  composerFileInputAccept,
  formatBytes,
  readComposerAttachment,
} from "../engine/companion/companionComposerAttachments.js";

describe("companionComposerAttachments", () => {
  it("classifies image and text files", () => {
    expect(
      classifyAttachmentFile(new File(["x"], "photo.png", { type: "image/png" })),
    ).toBe("image");
    expect(
      classifyAttachmentFile(new File(["x"], "notes.md", { type: "text/markdown" })),
    ).toBe("text");
    expect(
      classifyAttachmentFile(new File(["x"], "archive.zip", { type: "application/zip" })),
    ).toBe("binary");
  });

  it("reads text attachments and builds LLM context", async () => {
    const file = new File(["line one\nline two"], "hello.txt", { type: "text/plain" });
    const result = await readComposerAttachment(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attachment.text).toContain("line one");
    const block = buildAttachmentPromptBlock([result.attachment], true);
    expect(block).toContain('Attached file "hello.txt"');
    expect(buildChatTurnText("Summarize this", [result.attachment], true)).toMatch(
      /Summarize this[\s\S]*Attached file/,
    );
  });

  it("formats bytes and accept list", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(composerFileInputAccept()).toContain("image/*");
    expect(composerFileInputAccept()).toContain(".md");
  });
});
