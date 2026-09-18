#!/usr/bin/env node
/**
 * Download legally usable VRM test models into prototypes/assets/.
 * Sources: VRoid AvatarSample (via madjin/vrm-samples mirror), ToxSam 100Avatars CC0.
 *
 * Do NOT use this script to rip assets from commercial companion apps.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../../prototypes/assets");

/** @type {{ file: string, url: string, license: string, source: string, note?: string }[]} */
const LEGAL_DOWNLOADS = [
  {
    file: "companion-avatarsample-a.vrm",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_A.vrm",
    license: "VRoid AvatarSample (pixiv terms — commercial OK, not CC0)",
    source: "https://vroid.pixiv.help/hc/en-us/articles/4402394424089",
    note: "Industry-standard female VRoid baseline for lip-sync / spring-bone testing",
  },
  {
    file: "companion-avatarsample-b.vrm",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_B.vrm",
    license: "VRoid AvatarSample (pixiv terms — commercial OK, not CC0)",
    source: "https://hub.vroid.com/en/characters/7939147878897061040/models/2292219474373673889",
    note: "Most common VRoid reference model used by VRM companion apps (Ami-style)",
  },
  {
    file: "companion-avatarsample-c.vrm",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/stable/AvatarSample_C.vrm",
    license: "VRoid AvatarSample (pixiv terms — commercial OK, not CC0)",
    source: "https://vroid.pixiv.help/hc/en-us/articles/4402394424089",
  },
  {
    file: "companion-vroid-male.vrm",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/masc_vroid.vrm",
    license: "VRoid sample (pixiv terms)",
    source: "https://github.com/madjin/vrm-samples",
    note: "Male VRoid proportions — boyfriend / secretary male reference rig",
  },
  {
    file: "companion-vroid-female.vrm",
    url: "https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/fem_vroid.vrm",
    license: "VRoid sample (pixiv terms)",
    source: "https://github.com/madjin/vrm-samples",
  },
  {
    file: "companion-chad.vrm",
    url: "https://arweave.net/s15TxeRcxamOZ0qDfjME1Bl2Ku7Vs4IQs8RthpxYjOQ",
    license: "CC0 1.0 — ToxSam 100Avatars #079",
    source: "https://opensourceavatars.com",
    note: "Confident male — iBoy / Replika boyfriend archetype testing",
  },
  {
    file: "companion-david.vrm",
    url: "https://arweave.net/H3cBhsOEoiQ8XZiwG31SyCUtiDewBZRccxIDztyHfSY",
    license: "CC0 1.0 — ToxSam 100Avatars #047",
    source: "https://opensourceavatars.com",
    note: "Soft male companion — Nomi boyfriend vibe testing",
  },
  {
    file: "companion-hugo.vrm",
    url: "https://arweave.net/iYaEdMdq8faogyRdgF4plnZIq40oOERENie94XmEdvQ",
    license: "CC0 1.0 — ToxSam 100Avatars #008",
    source: "https://opensourceavatars.com",
  },
  {
    file: "companion-polydancer.vrm",
    url: "https://arweave.net/jPOg-G0MPH55ZQmamFhT9f8cHn-hjeAQ0mRO5gWeKMQ",
    license: "CC0 1.0 — ToxSam 100Avatars #021 Polydancer",
    source: "https://opensourceavatars.com",
  },
  {
    file: "companion-jennifer.vrm",
    url: "https://arweave.net/LKp1uJLAZFmncdCNSZ8oopU7ZElXTvn4BmM4CUcFclc",
    license: "CC0 1.0 — ToxSam 100Avatars #052 Jennifer",
    source: "https://opensourceavatars.com",
  },
  {
    file: "companion-shiro.vrm",
    url: "https://arweave.net/7skrWhSd_4mrqe-tiqMfCL746xu8UWghRh1dZm7irzM",
    license: "CC0 1.0 — ToxSam 100Avatars #058 Shiro",
    source: "https://opensourceavatars.com",
  },
  {
    file: "companion-aesthetica.vrm",
    url: "https://arweave.net/orNIoMYKafN-EyZRft2No1ZQsPNl3XUcMXhfT2rKQVc",
    license: "CC0 1.0 — ToxSam 100Avatars #062 Aesthetica",
    source: "https://opensourceavatars.com",
  },
];

async function downloadOne(entry) {
  const dest = path.join(ASSETS, entry.file);
  try {
    const stat = await fs.stat(dest);
    if (stat.size > 100_000) {
      console.log("skip (exists)", entry.file, `${Math.round(stat.size / 1024)}KB`);
      return { file: entry.file, skipped: true };
    }
  } catch {
    /* download */
  }
  console.log("fetch", entry.file);
  const res = await fetch(entry.url);
  if (!res.ok) throw new Error(`${entry.file}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  const readme = `${entry.file}\n\nSource: ${entry.source}\nLicense: ${entry.license}\n${entry.note ? `Note: ${entry.note}\n` : ""}Downloaded by amoji-engine/scripts/download-legal-vrm.mjs\n`;
  await fs.writeFile(dest.replace(/\.vrm$/, ".README.txt"), readme);
  console.log("saved", entry.file, `${Math.round(buf.length / 1024)}KB`);
  return { file: entry.file, bytes: buf.length };
}

async function main() {
  await fs.mkdir(ASSETS, { recursive: true });
  const results = [];
  for (const entry of LEGAL_DOWNLOADS) {
    results.push(await downloadOne(entry));
  }
  console.log("done", results.length, "models");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
