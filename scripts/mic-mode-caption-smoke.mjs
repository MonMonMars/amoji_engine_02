#!/usr/bin/env node
/**
 * Smoke: mic mode transcript shows multi-line captions (not clipped to one line).
 */
import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "http://127.0.0.1:5173/companion-full?lang=yue&automic=0";

const LONG_REPLY =
  "第一行測試。\n第二行應該睇到。\n第三行都要清楚可見。\n第四行仲要見到。\n第五行最底最清晰。";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.click("#start-talking");
  await page.waitForTimeout(400);

  await page.evaluate((text) => {
    const transcript = document.getElementById("transcript");
    transcript.innerHTML = "";
    const row = document.createElement("div");
    row.className = "msg-row assistant";
    const bubble = document.createElement("div");
    bubble.className = "bubble assistant";
    bubble.textContent = text;
    row.appendChild(bubble);
    transcript.appendChild(row);
  }, LONG_REPLY);

  await page.evaluate(() => {
    document.querySelector(".stage")?.classList.add("mic-mode");
  });

  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".stage");
    const transcript = document.getElementById("transcript");
    const bubble = transcript?.querySelector(".bubble.assistant");
    const bubbleRect = bubble?.getBoundingClientRect();
    const transcriptStyle = transcript ? getComputedStyle(transcript) : null;
    const lineCount = (bubble?.textContent || "").split("\n").length;
    return {
      build: window.__amojiBuild,
      micMode: stage?.classList.contains("mic-mode"),
      transcriptMaxHeight: transcriptStyle?.maxHeight,
      bubbleHeight: bubbleRect?.height ?? 0,
      bubbleScrollHeight: bubble?.scrollHeight ?? 0,
      lineCount,
      fiveLinesVisible: lineCount >= 5 && (bubbleRect?.height ?? 0) >= 90,
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();

  const maxPx = Number.parseFloat(metrics.transcriptMaxHeight) || 0;
  const ok =
    metrics.micMode && metrics.fiveLinesVisible && maxPx >= 260;
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
