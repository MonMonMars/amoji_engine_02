import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const htmlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../prototypes/amoji-companion.html",
);

describe("amoji-companion module boot", () => {
  it("loads uiEffects and migration in the same Promise.all order", () => {
    const html = readFileSync(htmlPath, "utf8");
    const start = html.indexOf("] = await Promise.all([");
    const end = html.indexOf("]);", start);
    const block = html.slice(start, end);
    const paths = [...block.matchAll(/ami\("([^"]+)"/g)].map((m) => m[1]);
    const migrationIdx = paths.indexOf(
      "../amoji-engine/engine/companion/companionCharacterMigration.mjs",
    );
    const uiEffectsIdx = paths.indexOf(
      "../amoji-engine/engine/companion/companionUiEffects.js",
    );
    const pickerIdx = paths.indexOf(
      "../amoji-engine/engine/companion/companionCharacterPicker.js",
    );
    expect(migrationIdx).toBeGreaterThan(-1);
    expect(uiEffectsIdx).toBeGreaterThan(-1);
    expect(pickerIdx).toBe(migrationIdx + 1);
    const destructure = html.match(
      /const \[\s*([\s\S]*?)\] = await Promise\.all/,
    )?.[1];
    expect(destructure).toContain("characterMigrationMod");
    expect(destructure).toContain("characterPickerMod");
    expect(destructure.indexOf("characterMigrationMod")).toBeLessThan(
      destructure.indexOf("characterPickerMod"),
    );
    expect(destructure.indexOf("uiEffectsMod")).toBeGreaterThan(
      destructure.indexOf("proactiveTalkMod"),
    );
  });
});
