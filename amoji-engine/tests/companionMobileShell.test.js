import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const html = readFileSync(join(root, "prototypes/amoji-companion.html"), "utf8");
const mobileCss = readFileSync(
  join(root, "prototypes/companion-mobile-shell.css"),
  "utf8",
);
const companionScreen = readFileSync(
  join(root, "app/js/screens/companion.js"),
  "utf8",
);
const hub = readFileSync(join(root, "app/js/screens/hub.js"), "utf8");

describe("companionMobileShell", () => {
  it("links mobile shell CSS and activates class from mobile=1", () => {
    expect(html).toContain("companion-mobile-shell.css");
    expect(html).toContain('params.get("mobile") === "1"');
    expect(html).toContain("companion-mobile-shell");
    expect(html).toContain("amoji.mobile.lastCharacterId");
    expect(mobileCss).toMatch(/companion-mobile-shell[\s\S]*100dvh/);
  });

  it("embeds companion with mobile=1 and pick=0 in the app shell", () => {
    expect(companionScreen).toContain("buildMobileCompanionPlayPath");
    expect(companionScreen).toContain("/api/health");
  });

  it("exposes Pet Care from the mobile hub", () => {
    const layout = readFileSync(
      join(root, "amoji-engine/engine/mobile/mobileHubLayout.js"),
      "utf8",
    );
    expect(hub).toContain("mobileHubCardDefs");
    expect(layout).toMatch(/Pet Care|寵物照顧/);
    expect(layout).toContain('screen: "pet"');
  });
});
