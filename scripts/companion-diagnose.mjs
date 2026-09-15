#!/usr/bin/env node
/**
 * Diagnose companion-full after Start tap — console errors, module boot, avatar, chat.
 */
import { chromium } from "playwright";

const url =
  process.argv.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=") ||
  process.argv[process.argv.indexOf("--url") + 1] ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/companion-full?lang=yue";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const logs = [];
  const errors = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("#start-character-picker .companion-card", { timeout: 30000 });

  const preStart = await page.evaluate(() => ({
    build: window.__amojiBuild,
    moduleBooted: window.__amojiModuleBooted,
    ready: window.__amojiStart?.ready,
    avatarKind: window.__amojiAvatarKind,
  }));

  await page.click("#start-character-picker .companion-card");
  await page.waitForTimeout(3500);

  const postStart = await page.evaluate(() => ({
    moduleBooted: window.__amojiModuleBooted,
    ready: window.__amojiStart?.ready,
    sessionStarted: window.__amojiStart?.sessionStarted,
    avatarKind: window.__amojiAvatarKind,
    startGone: !document.getElementById("start-character-picker"),
    canvas: (() => {
      const c = document.getElementById("avatar-canvas");
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 };
    })(),
    micBtn: document.getElementById("btn-mic")?.textContent,
    micDisabled: document.getElementById("btn-mic")?.disabled,
    systemBubbles: [...document.querySelectorAll(".msg-row.system .bubble")].map(
      (el) => el.textContent,
    ),
    bootFallback: document.getElementById("amoji-boot-fallback")?.classList.contains("show"),
  }));

  await page.fill("#input", "你好");
  await page.click("#send");
  let chatResult = { user: false, assistant: false, system: [] };
  try {
    await page.waitForSelector(".msg-row.user .bubble", { timeout: 8000 });
    chatResult.user = true;
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll(".msg-row.assistant .bubble");
        const last = rows[rows.length - 1];
        return last && !last.classList.contains("thinking") && last.textContent?.length > 1;
      },
      undefined,
      { timeout: 45000 },
    );
    chatResult.assistant = true;
  } catch (err) {
    chatResult.error = String(err.message || err);
  }
  chatResult.system = await page.evaluate(() =>
    [...document.querySelectorAll(".msg-row.system .bubble")].map((el) => el.textContent),
  );

  const report = { url, preStart, postStart, chatResult, errors, logs: logs.slice(-30) };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
