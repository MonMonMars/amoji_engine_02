#!/usr/bin/env node
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, statSync } from "fs";
import { extname, join } from "path";

const root = join(import.meta.dirname, "..");
const artifacts = process.env.ARTIFACT_DIR || "/opt/cursor/artifacts";

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.pathname.replace(/^\//, "") || "prototypes/amoji-companion.html";
  const file = join(root, path);
  try {
    const data = readFileSync(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("missing");
  }
});

await new Promise((r) => server.listen(8771, r));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8771/prototypes/amoji-companion.html?lang=en&automic=0", {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector("#btn-open-setup", { timeout: 20000 });
await page.evaluate(() => {
  const picker = document.getElementById("start-character-picker");
  if (picker) picker.style.display = "none";
  document.body.classList.add("companion-minimal-chrome");
});

const readUi = () =>
  page.evaluate(() => {
    const style = (el) => el && getComputedStyle(el).display;
    const atmosphere = document.querySelector(".atmosphere");
    const atmosphereBg = atmosphere ? getComputedStyle(atmosphere).backgroundImage : "";
    return {
      menuBtn: style(document.getElementById("btn-open-setup")),
      chatMenu: document.getElementById("settings-btn-chat")?.textContent?.trim(),
      speakerBtn: document.getElementById("settings-btn-speaker")?.getAttribute("aria-pressed"),
      chatHidden: document.body.classList.contains("chat-panel-hidden"),
      sceneBg: atmosphere?.dataset?.sceneBg || null,
      atmosphereUsesSunset: atmosphereBg.includes("ff8a5c") || atmosphereBg.includes("255, 138, 92"),
      outfitSoonBadges: [...document.querySelectorAll(".scene-preset__soon")].length,
      menuScene: document.getElementById("settings-btn-scene")?.textContent?.trim(),
    };
  });

let ui = await readUi();
await page.screenshot({ path: `${artifacts}/scene-shortcuts-default.png`, fullPage: false });

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-scene");
await page.waitForTimeout(500);
ui.sceneSheetOpen = await page.evaluate(
  () => document.getElementById("scene-sheet")?.classList.contains("open"),
);
await page.screenshot({ path: `${artifacts}/scene-shortcuts-sheet.png`, fullPage: false });

await page.click(".scene-preset__swatch--sunset");
await page.waitForTimeout(400);
ui.afterSunset = await readUi();
await page.click("#scene-sheet-close");
await page.waitForTimeout(300);

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-chat");
await page.waitForTimeout(300);
ui.afterChatHide = await readUi();
await page.screenshot({ path: `${artifacts}/scene-shortcuts-chat-hidden.png`, fullPage: false });

await page.click("#btn-open-setup");
await page.waitForSelector("#settings.open", { timeout: 5000 });
await page.click("#settings-btn-speaker");
await page.waitForTimeout(200);
ui.afterSpeakerMute = await readUi();
await page.click("#settings-close");

console.log(JSON.stringify(ui, null, 2));
await browser.close();
server.close();
