import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const htmlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/amoji-companion.html",
);

describe("amoji-companion module boot", () => {
  it("aligns Promise.all ami imports with destructuring slots", () => {
    const html = readFileSync(htmlPath, "utf8");
    const block = html.match(
      /\] = await Promise\.all\(\[\s*([\s\S]*?)\]\);/,
    )?.[1];
    expect(block).toBeTruthy();
    const imports = [...block.matchAll(/ami\([^)]+\)/g)].length;
    const destructure = html.match(
      /const \[\s*([\s\S]*?)\] = await Promise\.all/,
    )?.[1];
    expect(destructure).toBeTruthy();
    const slots = destructure
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean).length;
    expect(slots).toBe(imports);
    expect(destructure).toMatch(/characterMigrationMod,/);
    expect(destructure).toMatch(/uiEffectsMod,/);
    const afterMigration = destructure.indexOf("characterMigrationMod");
    const pickerIdx = destructure.indexOf("characterPickerMod");
    expect(afterMigration).toBeGreaterThan(-1);
    expect(pickerIdx).toBe(afterMigration + "characterMigrationMod,".length);
  });
});
