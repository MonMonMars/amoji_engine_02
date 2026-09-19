import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("mobile hub secretary", () => {
  it("opens secretary inside the app shell (not external /play picker)", () => {
    const hub = readFileSync(join(root, "app/js/screens/hub.js"), "utf8");
    const layout = readFileSync(
      join(root, "amoji-engine/engine/mobile/mobileHubLayout.js"),
      "utf8",
    );
    expect(layout).toContain('setRole: "secretary"');
    expect(hub).toContain("renderMobileHubCard");
    expect(hub).not.toMatch(/data-open="\/play\?role=secretary/);
  });

  it("companion embed honors navigate params role", () => {
    const companion = readFileSync(join(root, "app/js/screens/companion.js"), "utf8");
    expect(companion).toContain("params?.role");
    expect(companion).toContain("buildMobileCompanionPlayPath");
  });

  it("supports ?screen=companion&role= deep link on boot", () => {
    const main = readFileSync(join(root, "app/js/main.js"), "utf8");
    expect(main).toContain('params.get("role")');
    expect(main).toContain("saveCompanionRole");
  });

  it("pulls remote settings and cloud save on boot when signed in", () => {
    const main = readFileSync(join(root, "app/js/main.js"), "utf8");
    expect(main).toContain("pullRemoteSettings");
    expect(main).toContain("syncFromCloud");
  });
});
