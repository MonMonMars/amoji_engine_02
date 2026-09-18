#!/usr/bin/env node
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://127.0.0.1:9876";

const browser = await chromium.launch({
  headless: false,
  args: ["--window-size=420,900"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${base}/app`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

await page.getByRole("button", { name: /Tap to Start|開始遊戲/ }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /Continue as Guest|訪客繼續/ }).click();
await page.waitForTimeout(1500);

await page.getByRole("button", { name: /Pet Care|寵物照顧/ }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /←/ }).click();
await page.waitForTimeout(600);

await page.getByRole("button", { name: /Chase!|追逐！/ }).click();
await page.waitForTimeout(1000);
await page.getByRole("button", { name: /Start Run|開始/ }).click();
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /←/ }).click();
await page.waitForTimeout(600);

await page.getByRole("button", { name: /Shop|商店/ }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /←/ }).click();
await page.waitForTimeout(600);

await page.getByRole("button", { name: /Settings|設定/ }).click();
await page.waitForTimeout(1500);

await browser.close();
console.log("mobile-app-ui-demo done");
