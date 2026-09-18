#!/usr/bin/env node
/**
 * Copies web assets into Capacitor webDir (../app is already the shell).
 * Run from repo root after deploy URL is set in capacitor.config.ts server.url.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "../../app");
if (!fs.existsSync(appDir)) {
  console.error("Missing app/ directory");
  process.exit(1);
}
console.log("Amoji mobile webDir:", appDir);
console.log("Run: cd mobile && npm install && npx cap sync");
