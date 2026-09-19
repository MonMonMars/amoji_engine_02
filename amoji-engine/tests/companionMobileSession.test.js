import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mergeSessionEntitlements } from "../engine/mobile/companionIapCatalog.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("companionMobileSession", () => {
  it("merges entitlements into saved auth session", () => {
    const storage = {
      data: {
        "amoji.mobile.auth.v1": JSON.stringify({
          userId: "u1",
          token: "tok",
          entitlements: { premium: false },
        }),
      },
      getItem(k) {
        return this.data[k] || null;
      },
      setItem(k, v) {
        this.data[k] = v;
      },
    };
    const next = mergeSessionEntitlements({ premium: true, unlimitedChat: true }, storage);
    expect(next?.entitlements?.premium).toBe(true);
    const raw = JSON.parse(storage.data["amoji.mobile.auth.v1"]);
    expect(raw.entitlements.premium).toBe(true);
  });

  it("companion embed shows loading shell until iframe load", () => {
    const companion = readFileSync(join(root, "app/js/screens/companion.js"), "utf8");
    expect(companion).toContain("companion-embed-loading");
    expect(companion).toContain('addEventListener("load"');
  });

  it("persists session on entitlement patch", () => {
    const main = readFileSync(join(root, "app/js/main.js"), "utf8");
    expect(main).toContain("if (session?.token) saveAuthSession");
  });
});
