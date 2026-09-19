#!/usr/bin/env node
/**
 * Print demo dialogue pools for QA / agent reference.
 *
 * Usage: node scripts/demo-dialogue-showcase.mjs [characterId]
 */
import {
  DEMO_CONVERSATION_SCENES,
  DEMO_PROACTIVE_LINES,
  pickTutorialStarterPrompts,
  TUTORIAL_STARTER_PROMPTS,
} from "../amoji-engine/engine/companion/companionDemoDialogue.mjs";

const characterId = process.argv[2] || "nova";

console.log(`\n=== Demo dialogue — ${characterId} ===\n`);

console.log(`Tutorial pool (${TUTORIAL_STARTER_PROMPTS.length} prompts across feature categories)`);

console.log("\nStarter chips (EN):");
for (const chip of pickTutorialStarterPrompts(characterId, true, { max: 8, seed: "showcase" })) {
  console.log(`  • [${chip.cat}] ${chip.text}`);
}

console.log("\nStarter chips (粵):");
for (const chip of pickTutorialStarterPrompts(characterId, false, { max: 8, seed: "showcase" })) {
  console.log(`  • [${chip.cat}] ${chip.text}`);
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
