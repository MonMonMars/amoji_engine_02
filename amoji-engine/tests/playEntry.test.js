import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("play entry static pages", () => {
  it("play.html opens fresh /n/<stamp>/full (never sticky /companion-full)", () => {
    const html = readFileSync(join(root, "play.html"), "utf8");
    expect(html).toContain("/api/health");
    expect(html).toContain("/n/");
    expect(html).not.toContain("/companion-full");
    expect(html).not.toContain('"/c/"');
  });

  it("vercel.json routes /play to api/play (303 fresh path)", () => {
    const vercel = readFileSync(join(root, "vercel.json"), "utf8");
    expect(vercel).toContain('"source": "/play"');
    expect(vercel).toContain('"destination": "/api/play"');
  });
});
