import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AMOJI_BUILD } from "../engine/companion/buildVersion.mjs";

const script = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../scripts/check-production-build.mjs"),
  "utf8",
);

describe("check-production-build.mjs", () => {
  it("compares live health build to AMOJI_BUILD", () => {
    expect(script).toContain("AMOJI_BUILD");
    expect(script).toContain("/api/health");
    expect(AMOJI_BUILD).toMatch(/^2026-/);
  });
});
