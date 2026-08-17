/**
 * Smoke: mock Face Live bridge ← JS client idle + lip-sync injects.
 */
import {
  startMockFaceLiveBridge,
  createSakuraFaceLiveClient,
  presenceToFaceLiveParams,
  sampleIdlePresence,
  lipSyncParamsFromChunk,
  synthesizeWavBase64,
} from '../engine/index.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const bridge = await startMockFaceLiveBridge();
const client = createSakuraFaceLiveClient({
  url: bridge.url,
  authTimeoutMs: 3000,
});

try {
  await client.connect();
  assert(client.isAuthenticated, 'not authenticated');
  client.setExpression('happy');
  const idle = presenceToFaceLiveParams(sampleIdlePresence(1.2, { emotion: 'happy' }));
  client.injectParameters(idle);
  const lip = lipSyncParamsFromChunk({
    pcmBase64: synthesizeWavBase64({ durationSec: 0.12, amplitude: 0.3 }),
    emotion: 'happy',
    text: '開心',
  });
  client.injectParameters(lip.parameters);
  await new Promise((r) => setTimeout(r, 50));
  assert(bridge.injected.length >= 3, `expected injects got ${bridge.injected.length}`);
  assert(
    bridge.injected.some((p) => p.id === 'ParamMouthOpenY'),
    'missing mouth open',
  );
  console.log(
    '[facelive-smoke] ok → injects',
    bridge.injected.length,
    'token',
    client.authenticationToken,
  );
} finally {
  client.disconnect();
  await bridge.close();
}
