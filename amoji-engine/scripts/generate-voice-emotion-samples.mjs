#!/usr/bin/env node
/**
 * Download emotion comparison clips for voice-emotion-demo.html.
 * Uses Edge TTS (no key) or OpenAI when OPENAI_API_KEY is set.
 *
 * Usage (from repo root):
 *   node amoji-engine/scripts/generate-voice-emotion-samples.mjs
 *   node amoji-engine/scripts/generate-voice-emotion-samples.mjs --lang en --voice openai-coral
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { synthesizeSpeech } from "../engine/companion/ttsHandler.mjs";
import {
  EMOTION_DEMO_LINES,
  EMOTION_DEMO_VOICES,
} from "../engine/companion/companionVoiceEmotionDemo.js";
import {
  EN_VOICE_PROFILES,
  YUE_VOICE_PROFILES,
} from "../engine/companion/companionVoiceProfiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(
  __dirname,
  "../../prototypes/assets/voice-samples/emotion",
);

function parseArgs(argv) {
  const lang = argv.includes("--lang")
    ? argv[argv.indexOf("--lang") + 1]
    : "all";
  const voice = argv.includes("--voice")
    ? argv[argv.indexOf("--voice") + 1]
    : null;
  return { lang, voice };
}

function safeFileName(voiceId, mood) {
  return `${String(voiceId).replace(/[^a-zA-Z0-9-]+/g, "-")}-${mood}.mp3`;
}

async function synthOne(voiceId, langKey, mood, line) {
  const outLang = langKey === "en" ? "en" : "yue";
  const { audio, engine, voice } = await synthesizeSpeech(line.text, {
    voice: voiceId,
    lang: outLang,
    emotion: line.emotion,
    nuance: line.nuance,
    talkStyle: line.talkStyle,
    speechEnergy: line.speechEnergy,
  });
  const dir = path.join(OUT_DIR, langKey);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, safeFileName(voiceId, mood));
  fs.writeFileSync(file, audio);
  return { file, engine, voice, bytes: audio.byteLength };
}

async function runForLang(langKey, voices) {
  const lines = EMOTION_DEMO_LINES[langKey];
  /** @type {Array<object>} */
  const manifest = [];
  for (const voiceId of voices) {
    for (const [mood, line] of Object.entries(lines)) {
      try {
        const result = await synthOne(voiceId, langKey, mood, line);
        manifest.push({
          lang: langKey,
          voiceId,
          mood,
          path: `/prototypes/assets/voice-samples/emotion/${langKey}/${safeFileName(voiceId, mood)}`,
          engine: result.engine,
          openAiVoice: result.voice,
          bytes: result.bytes,
        });
        console.log(
          `[ok] ${langKey}/${voiceId}/${mood} (${result.engine}, ${result.bytes} bytes)`,
        );
      } catch (err) {
        console.warn(
          `[skip] ${langKey}/${voiceId}/${mood}: ${err?.message || err}`,
        );
      }
    }
  }
  return manifest;
}

async function main() {
  const { lang, voice } = parseArgs(process.argv.slice(2));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  /** @type {Array<object>} */
  let manifest = [];

  if (lang === "all" || lang === "en") {
    const voices = voice
      ? [voice]
      : EMOTION_DEMO_VOICES.en.filter((id) =>
          EN_VOICE_PROFILES.some((p) => p.id === id),
        );
    manifest = manifest.concat(await runForLang("en", voices));
  }
  if (lang === "all" || lang === "yue") {
    const voices = voice
      ? [voice]
      : EMOTION_DEMO_VOICES.yue.filter((id) =>
          YUE_VOICE_PROFILES.some((p) => p.id === id),
        );
    manifest = manifest.concat(await runForLang("yue", voices));
  }

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifest.length} clips → ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
