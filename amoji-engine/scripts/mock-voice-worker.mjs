/**
 * Minimal Node HTTP SenseVoice/CosyVoice worker stub (no FastAPI/GPU).
 * Mirrors voice_bridge_server.py endpoints for smoke tests / local lab.
 *
 *   node scripts/mock-voice-worker.mjs --port 7890
 */
import http from 'node:http';
import { parseSenseVoiceTranscript } from '../engine/voice/senseVoice.js';
import { synthesizeWavBase64 } from '../engine/voice/browserAudio.js';
import { prosodyFromMarkedText } from '../engine/voice/prosodyMarkers.js';

const port = Number(
  process.argv.includes('--port')
    ? process.argv[process.argv.indexOf('--port') + 1]
    : process.env.PORT || 7890,
);

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    ...headers,
  });
  res.end(json);
}

function mockTtsChunks(text, language, emotion, speed = 1) {
  const clean = String(text || '').trim() || '…';
  const step = Math.max(1, Math.ceil(clean.length / 4));
  const chunks = [];
  for (let i = 0; i < clean.length; i += step) {
    const piece = clean.slice(i, i + step);
    const durationSec = Math.max(0.12, piece.length * 0.08) / Math.max(0.5, speed);
    chunks.push({
      index: chunks.length,
      text: piece,
      pcmBase64: synthesizeWavBase64({
        durationSec,
        sampleRate: 22050,
        frequencyHz: 210 + chunks.length * 25,
      }),
      sampleRate: 22050,
      durationSec,
      final: i + step >= clean.length,
      provider: 'mock-http',
      langTag: language === 'en' ? '<|en|>' : '<|yue|>',
      emotion: emotion || 'neutral',
      speed,
    });
  }
  return chunks;
}

function handleAsr(body) {
  if (body.text) {
    const parsed = parseSenseVoiceTranscript(body.text);
    if (!parsed.language) parsed.language = body.language || 'yue';
    return { provider: 'passthrough', ...parsed };
  }
  const stubs = [
    '<|yue|><|HAPPY|><|Speech|>今日天氣好正呀',
    '<|yue|><|NEUTRAL|><|Speech|>喂，你喺度嗎？',
    '<|en|><|NEUTRAL|><|Speech|>Hello there',
  ];
  const seq = Number(body.sequence) || 0;
  const parsed = parseSenseVoiceTranscript(stubs[Math.abs(seq) % stubs.length]);
  return {
    provider: 'mock-http',
    interim: Boolean(body.interim),
    sequence: body.sequence || 0,
    ...parsed,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, {
      ok: true,
      schema: 'amoji.voiceWorker.v1',
      defaultLanguage: 'yue',
      asr: 'mock-http',
      tts: 'mock-http',
      endpoints: ['/health', '/asr', '/asr/partial', '/tts', '/tts/stream'],
    });
    return;
  }

  if (req.method !== 'POST') {
    send(res, 404, { error: 'not found' });
    return;
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    send(res, 400, { error: 'invalid json' });
    return;
  }

  if (url.pathname === '/asr' || url.pathname === '/asr/partial') {
    send(res, 200, handleAsr(body));
    return;
  }

  if (url.pathname === '/tts') {
    const prosody = prosodyFromMarkedText(body.text || '', {
      emotion: body.emotion || 'neutral',
      language: body.language || 'yue',
    });
    const chunks = mockTtsChunks(
      prosody.text,
      body.language || 'yue',
      body.emotion || 'neutral',
      body.speed || prosody.speed || 1,
    );
    send(res, 200, {
      provider: 'mock-http',
      language: body.language || 'yue',
      instruct: body.instruct || prosody.instruct,
      chunkCount: chunks.length,
      durationSec: chunks.reduce((s, c) => s + c.durationSec, 0),
      chunks,
    });
    return;
  }

  if (url.pathname === '/tts/stream') {
    const prosody = prosodyFromMarkedText(body.text || '', {
      emotion: body.emotion || 'neutral',
      language: body.language || 'yue',
    });
    const chunks = mockTtsChunks(
      prosody.text,
      body.language || 'yue',
      body.emotion || 'neutral',
      body.speed || prosody.speed || 1,
    );
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.write(
      `${JSON.stringify({
        type: 'meta',
        provider: 'mock-http',
        language: body.language || 'yue',
        chunkCount: chunks.length,
      })}\n`,
    );
    for (const c of chunks) {
      res.write(`${JSON.stringify({ type: 'chunk', data: c })}\n`);
    }
    res.write(`${JSON.stringify({ type: 'done', provider: 'mock-http' })}\n`);
    res.end();
    return;
  }

  send(res, 404, { error: 'not found' });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[mock-voice-worker] http://127.0.0.1:${port}`);
});
