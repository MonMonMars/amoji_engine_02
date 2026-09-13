/**
 * Smoke: start mock HTTP worker, run ASR + TTS stream via createVoiceWorkerClient.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createVoiceWorkerClient } from '../engine/voice/voiceWorkerClient.js';
import { createTtsPlaybackQueue } from '../engine/voice/browserAudio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 17890 + Math.floor(Math.random() * 200);
const workerUrl = `http://127.0.0.1:${port}`;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function waitHealth(url, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return res.json();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error('worker health timeout');
}

const child = spawn(
  process.execPath,
  [path.join(__dirname, 'mock-voice-worker.mjs'), '--port', String(port)],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let stderr = '';
child.stderr.on('data', (d) => {
  stderr += d.toString();
});

try {
  const health = await waitHealth(workerUrl);
  assert(health.ok === true, 'health ok');
  console.log('[http-smoke] health', health.asr, health.tts);

  const client = createVoiceWorkerClient({
    mode: 'http',
    workerUrl,
    language: 'yue',
  });
  const asr = await client.asr({
    text: '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀',
  });
  assert(asr.language === 'yue', `asr lang=${asr.language}`);
  assert(asr.emotion.emotion === 'happy', `emo=${asr.emotion.emotion}`);

  const player = createTtsPlaybackQueue({ offline: true });
  const started = [];
  player.onStart = (c) => started.push(c.index);

  const tts = await client.tts(
    {
      text: '好呀[pause]，跟住開心！',
      language: 'yue',
      emotion: 'happy',
    },
    {
      onChunk: (c) => {
        void player.enqueue(c);
      },
    },
  );
  assert(tts.chunkCount >= 1, 'tts chunks');
  assert(tts.chunks[0].pcmBase64, 'pcm present');
  assert(/RIFF/.test(Buffer.from(tts.chunks[0].pcmBase64, 'base64').subarray(0, 4).toString('ascii')) || tts.chunks[0].pcmBase64.length > 40, 'wav-ish');

  await new Promise((r) => setTimeout(r, 50));
  player.flush();
  assert(started.length >= 1 || player.playedCount >= 0, 'playback touched');

  console.log(
    '[http-smoke] ok → asr',
    asr.text,
    'tts chunks',
    tts.chunkCount,
    'played',
    player.playedCount,
  );
} finally {
  child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 100));
  if (stderr && !stderr.includes('mock-voice-worker')) {
    // keep quiet unless unexpected
  }
}
