#!/usr/bin/env node
/**
 * Print demo dialogue pools for QA / agent reference.
 *
 * Usage: node scripts/demo-dialogue-showcase.mjs [characterId]
 */
import {
  DEMO_CONVERSATION_SCENES,
  DEMO_PROACTIVE_LINES,
  DEMO_STARTER_PROMPTS,
  demoStarterPrompts,
} from "../amoji-engine/engine/companion/companionDemoDialogue.mjs";

const characterId = process.argv[2] || "nova";

console.log(`\n=== Demo dialogue — ${characterId} ===\n`);

console.log("Starter prompts (EN):");
for (const line of demoStarterPrompts(characterId, true)) {
  console.log(`  • ${line}`);
}

console.log("\nStarter prompts (粵):");
for (const line of demoStarterPrompts(characterId, false)) {
  console.log(`  • ${line}`);
}

const proactive =
  DEMO_PROACTIVE_LINES[characterId] || DEMO_PROACTIVE_LINES.default;
console.log(`\nProactive lines (${proactive.en.length} EN / ${proactive.yue.length} 粵)`);
console.log("  EN sample:", proactive.en.slice(0, 3).join(" | "));

console.log(`\nSample scenes (${DEMO_CONVERSATION_SCENES.length}):`);
for (const scene of DEMO_CONVERSATION_SCENES) {
  console.log(`  [${scene.id}] ${scene.title}`);
  for (const turn of scene.turns) {
    console.log(`    ${turn.role}: ${turn.text.slice(0, 72)}${turn.text.length > 72 ? "…" : ""}`);
  }
}

console.log("");
