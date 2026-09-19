import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("companionNativePurchases", () => {
  it("configures RevenueCat on native via Capacitor Purchases plugin", () => {
    const src = readFileSync(
      join(root, "amoji-engine/engine/mobile/companionNativePurchases.js"),
      "utf8",
    );
    expect(src).toContain("ensureNativePurchasesConfigured");
    expect(src).toContain("fetchIapStoreMeta");
    expect(src).toContain("purchaseNativeStoreProduct");
    expect(src).toContain("registerPushNotificationsIfEnabled");
  });

  it("boots native shell from main.js", () => {
    const main = readFileSync(join(root, "app/js/main.js"), "utf8");
    expect(main).toContain("bootNativeShell");
  });
});
