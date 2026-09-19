import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("mobileAppShell", () => {
  it("ships PWA manifest and Capacitor bridge for /app", () => {
    const index = readFileSync(join(root, "app/index.html"), "utf8");
    const manifest = readFileSync(join(root, "app/manifest.webmanifest"), "utf8");
    const main = readFileSync(join(root, "app/js/main.js"), "utf8");
    expect(index).toContain("manifest.webmanifest");
    expect(manifest).toContain('"start_url": "/app"');
    expect(main).toContain("initCapacitorBridge");
  });

  it("shows live build id in settings footer", () => {
    const settings = readFileSync(join(root, "app/js/screens/settings.js"), "utf8");
    expect(settings).toContain("fetchAppBuild");
    expect(settings).toContain("build ${appBuild}");
  });
});
