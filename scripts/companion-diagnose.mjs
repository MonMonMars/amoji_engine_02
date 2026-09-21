#!/usr/bin/env node
/**
 * Diagnose companion-full after Start tap — console errors, module boot, avatar, chat.
 */
import { chromium } from "playwright";
import { beginStartPickerSession } from "./companion-picker-smoke-util.mjs";

function resolveUrl() {
  const eq = process.argv.find((a) => a.startsWith("--url="));
  if (eq) return eq.split("=").slice(1).join("=");
  const flagIdx = process.argv.indexOf("--url");
  if (flagIdx >= 0 && process.argv[flagIdx + 1]) return process.argv[flagIdx + 1];
  return (
    process.env.COMPANION_URL ||
    process.env.BASE_URL ||
    "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/play?lang=yue&pick=1&automic=0"
  );
}
const url = resolveUrl();

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
  await page.waitForSelector(
    "#start-character-picker.is-open .picker-begin-btn",
    { timeout: 30000 },
  );

  const preStart = await page.evaluate(() => ({
    build: window.__amojiBuild,
    moduleBooted: window.__amojiModuleBooted,
    ready: window.__amojiStart?.ready,
    avatarKind: window.__amojiAvatarKind,
  }));

  await beginStartPickerSession(page);
  await page.waitForTimeout(3500);

  const postStart = await page.evaluate(() => ({
    moduleBooted: window.__amojiModuleBooted,
    ready: window.__amojiStart?.ready,
    sessionStarted: window.__amojiStart?.sessionStarted,
    avatarKind: window.__amojiAvatarKind,
    startPickerDismissed: (() => {
      const picker = document.getElementById("start-character-picker");
      if (!picker) return true;
      return (
        picker.classList.contains("hide") ||
        picker.hidden ||
        !picker.classList.contains("is-open")
      );
    })(),
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
  await page.evaluate(() => document.getElementById("send")?.click());
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
