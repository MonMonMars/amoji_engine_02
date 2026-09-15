#!/usr/bin/env node
/**
 * Playwright: verify VRM loads and kungfu action moves arm bones.
 */
import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "http://127.0.0.1:5173/prototypes/amoji-companion.html?lang=yue&automic=0";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--enable-webgl"],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.click("#start-character-picker .companion-card");
  await page.waitForTimeout(8000);

  const before = await page.evaluate(() => {
    const avatar = window.__amojiAvatar;
    const vrm = avatar?.vrm;
    const humanoid = vrm?.humanoid;
    const arm = humanoid?.getNormalizedBoneNode?.("leftUpperArm");
    return {
      kind: window.__amojiAvatarKind,
      hasVrm: Boolean(vrm),
      armZ: arm?.rotation?.z ?? null,
      currentAction: avatar?.currentAction ?? null,
    };
  });

  await page.evaluate(() => {
    window.__amojiAvatar?.playAction?.("kungfu", { emotion: "happy" });
  });

  await page.waitForTimeout(500);

  const during = await page.evaluate(() => {
    const avatar = window.__amojiAvatar;
    const arm = avatar?.vrm?.humanoid?.getNormalizedBoneNode?.("leftUpperArm");
    return {
      currentAction: avatar?.currentAction ?? null,
      armZ: arm?.rotation?.z ?? null,
      modelY: avatar?.vrm?.scene?.position?.y ?? null,
    };
  });

  const report = { before, during, deltaZ: during.armZ - before.armZ };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();

  const ok =
    before.kind === "vrm3d" &&
    before.hasVrm &&
    during.currentAction === "kungfu" &&
    Math.abs(report.deltaZ) > 0.05;
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
