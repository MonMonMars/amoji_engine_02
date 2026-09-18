import { chromium } from "playwright";
import { createServer } from "http";
import { readFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = "/opt/cursor/artifacts";
await mkdir(artifacts, { recursive: true });

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  try {
    const data = await readFile(path.join(root, url));
    const ext = path.extname(url);
    const types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".css": "text/css",
      ".png": "image/png",
      ".vrm": "application/octet-stream",
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("nf");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(
  `http://127.0.0.1:${port}/prototypes/amoji-companion.html?lang=en&automic=0`,
  { waitUntil: "domcontentloaded", timeout: 120000 },
);
await page.waitForTimeout(5000);
await page.evaluate(() => {
  const boot = document.getElementById("amoji-boot-fallback");
  if (boot) {
    boot.hidden = true;
    boot.classList.remove("show");
  }
});

const readUi = () =>
  page.evaluate(() => {
    const style = (el) => el && getComputedStyle(el).display;
    const atmosphere = document.querySelector(".atmosphere");
    const atmosphereBg = atmosphere ? getComputedStyle(atmosphere).backgroundImage : "";
    return {
      chatBtn: document.getElementById("btn-toggle-chat")?.getAttribute("aria-pressed"),
      sceneBtn: style(document.getElementById("btn-open-scene")),
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

await page.click("#btn-open-scene");
await page.waitForTimeout(500);
ui.sceneSheetOpen = await page.evaluate(
  () => document.getElementById("scene-sheet")?.classList.contains("open"),
);
await page.screenshot({ path: `${artifacts}/scene-shortcuts-sheet.png`, fullPage: false });

await page.click('.scene-preset__swatch--sunset');
await page.waitForTimeout(400);
ui.afterSunset = await readUi();
await page.click("#scene-sheet-close");
await page.waitForTimeout(300);

await page.click("#btn-toggle-chat");
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
