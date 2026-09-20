import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("play entry static pages", () => {
  it("play.html opens stable /c/<build>/full with /companion-full fallback", () => {
    const html = readFileSync(join(root, "play.html"), "utf8");
    expect(html).toContain("/api/health");
    expect(html).toContain("/c/");
    expect(html).toContain("/companion-full");
  });

  it("vercel.json routes /play to play.html", () => {
    const vercel = readFileSync(join(root, "vercel.json"), "utf8");
    expect(vercel).toContain('"source": "/play"');
    expect(vercel).toContain('"destination": "/play.html"');
  });
});
