#!/usr/bin/env node
/**
 * Debug companion load on live or local URL — console errors, overlay, __amojiStart.
 */
import { chromium } from "playwright-core";

const url =
  process.argv.find((a) => a.startsWith("--url="))?.split("=").slice(1).join("=") ||
  "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/prototypes/amoji-companion.html?automic=0";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err.message || err));
  });
  page.on("requestfailed", (req) => {
    failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText,
    });
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch((e) => {
    console.log("goto warning:", e.message);
  });

  // Wait up to 10s and sample state
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => ({
      ready: window.__amojiStart?.ready,
      tapped: window.__amojiStart?.tapped,
      sessionStarted: window.__amojiStart?.sessionStarted,
      hasRun: typeof window.__amojiStart?.run === "function",
      overlayVisible: (() => {
        const el = document.querySelector(".avatar-loading");
        if (!el) return "removed";
        return el.classList.contains("hide") ? "hidden" : "visible";
      })(),
      startBtn: (() => {
        const btn = document.getElementById("start-character-picker");
        if (!btn) return "removed";
        return {
          hidden: btn.classList.contains("hide"),
          disabled: btn.disabled,
          text: btn.textContent?.trim(),
        };
      })(),
      transcriptBubbles: document.querySelectorAll(".msg-row").length,
      statusPill: document.getElementById("status-pill")?.textContent?.trim(),
    }));
    console.log(`t+${i + 1}s`, JSON.stringify(state));
    if (state.ready && state.overlayVisible !== "visible") break;
  }

  const afterLoad = await page.evaluate(() => ({
    ready: window.__amojiStart?.ready,
    overlay: document.querySelector(".avatar-loading")
      ? document.querySelector(".avatar-loading").className
      : "none",
    startBtn: document.getElementById("start-character-picker")?.textContent,
    bubbles: document.querySelectorAll(".msg-row").length,
  }));

  // Try select + begin
  try {
    const { beginStartPickerSession } = await import(
      "../../scripts/companion-picker-smoke-util.mjs"
    );
    await beginStartPickerSession(page);
    await page.waitForTimeout(2500);
  } catch {
    /* picker may be hidden with autostart */
  }

  const afterTap = await page.evaluate(() => ({
    sessionStarted: window.__amojiStart?.sessionStarted,
    startBtn: (() => {
      const btn = document.getElementById("start-character-picker");
      if (!btn) return "removed";
      return { hidden: btn.classList.contains("hide"), text: btn.textContent?.trim() };
    })(),
    overlay: document.querySelector(".avatar-loading")
      ? document.querySelector(".avatar-loading").className
      : "none",
  }));

  // Try chat
  await page.fill("#input", "hello test");
  await page.click("#send");
  await page.waitForTimeout(3000);

  const afterChat = await page.evaluate(() => ({
    userBubbles: document.querySelectorAll(".msg-row.user .bubble").length,
    assistantBubbles: document.querySelectorAll(".msg-row.assistant .bubble").length,
    systemBubbles: document.querySelectorAll(".msg-row.system .bubble").length,
  }));

  const result = {
    url,
    elapsedMs: Date.now() - t0,
    afterLoad,
    afterTap,
    afterChat,
    pageErrors,
    failedRequests: failedRequests.filter((r) => !r.url.includes("favicon")),
    consoleErrors: consoleLogs.filter((l) => l.type === "error"),
    consoleWarnings: consoleLogs.filter((l) => l.type === "warning").slice(0, 10),
  };

  console.log("\n=== RESULT ===");
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
