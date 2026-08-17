import { describe, expect, it, vi } from 'vitest';
import {
  createSakuraFaceLiveClient,
  SAKURA_EXPRESSION_PRESETS,
} from '../engine/face/sakuraFaceLiveClient.js';
import { startMockFaceLiveBridge } from '../engine/face/mockFaceLiveBridge.js';
import { resolveFaceLiveConfig } from '../engine/lab/faceLiveUrl.js';
import { presenceToFaceLiveParams, sampleIdlePresence } from '../engine/face/idlePresence.js';
import { lipSyncParamsFromChunk } from '../engine/face/lipSyncFromChunk.js';
import { synthesizeWavBase64 } from '../engine/voice/browserAudio.js';

describe('resolveFaceLiveConfig', () => {
  it('defaults to local ws url', () => {
    const cfg = resolveFaceLiveConfig({ search: '', storage: null, env: {} });
    expect(cfg.url).toBe('ws://127.0.0.1:8765');
    expect(cfg.source).toBe('default');
  });

  it('reads ?face= query', () => {
    const cfg = resolveFaceLiveConfig({
      search: '?face=ws://127.0.0.1:8001',
      storage: null,
      env: {},
    });
    expect(cfg.url).toBe('ws://127.0.0.1:8001');
    expect(cfg.source).toBe('query');
  });
});

describe('Sakura Face Live client + mock bridge', () => {
  it('auths and injects idle + lip-sync params', async () => {
    const bridge = await startMockFaceLiveBridge();
    const events = [];
    const client = createSakuraFaceLiveClient({
      url: bridge.url,
      authTimeoutMs: 3000,
      onEvent: (ev) => events.push(ev),
    });

    await client.connect();
    expect(client.isAuthenticated).toBe(true);
    expect(bridge.authTokensIssued.length).toBe(1);
    expect(events).toContain('authenticated');

    client.setExpression('happy');
    await vi.waitFor(() => {
      expect(bridge.injected.some((p) => p.id === 'ParamMouthSmile')).toBe(true);
    });

    const idleParams = presenceToFaceLiveParams(sampleIdlePresence(0.8));
    expect(client.injectParameters(idleParams)).toBe(true);

    const lip = lipSyncParamsFromChunk({
      pcmBase64: synthesizeWavBase64({ durationSec: 0.1, amplitude: 0.25 }),
      text: '呀',
    });
    client.injectParameters(lip.parameters);
    await vi.waitFor(() => {
      expect(bridge.injected.some((p) => p.id === 'ParamMouthOpenY')).toBe(true);
    });

    expect(SAKURA_EXPRESSION_PRESETS.neutral.length).toBeGreaterThan(0);
    client.disconnect();
    await bridge.close();
  });

  it('rejects when mock denies auth', async () => {
    const bridge = await startMockFaceLiveBridge({ autoApprove: false });
    const client = createSakuraFaceLiveClient({
      url: bridge.url,
      authTimeoutMs: 2000,
    });
    await expect(client.connect()).rejects.toThrow(/reject/i);
    await bridge.close();
  });
});
