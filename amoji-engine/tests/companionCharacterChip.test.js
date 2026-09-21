import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../prototypes/amoji-companion.html"),
  "utf8",
);

describe("top-left companion chip", () => {
  it("keeps the brand chip clickable in conversation UI", () => {
    expect(html).toMatch(
      /body\.conversation-ui \.brand-btn \{[^}]*pointer-events:\s*auto;/,
    );
    expect(html).not.toMatch(
      /body\.conversation-ui \.brand-btn \{[^}]*pointer-events:\s*none;/,
    );
  });

  it("opens start picker before session and in-session picker after live session", () => {
    expect(html).toContain('id="brand-btn"');
    expect(html).toContain('id="companion-status-line"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('brandBtn?.addEventListener("click"');
    expect(html).toContain("openCharacterPicker()");
    expect(html).toContain("isLiveSession()");
    expect(html).toMatch(
      /if \(isLiveSession\(\)\) \{[\s\S]*characterPicker\?\.open\?\.\(\)/,
    );
    expect(html).toMatch(/startPicker\.show\(\)/);
    expect(html).toContain("characterPicker?.isOpen?.()");
    expect(html).toContain("startPicker?.isOpen?.()");
  });
});
