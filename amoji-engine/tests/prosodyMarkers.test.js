import { describe, expect, it } from 'vitest';
import {
  parseProsodyMarkers,
  prosodyFromMarkedText,
  resolveProsody,
} from '../engine/voice/prosodyMarkers.js';
import { createVoiceRobotBridge } from '../engine/voice/voiceRobotBridge.js';

describe('prosodyMarkers', () => {
  it('parses pause/fast/slow and strips markers from text', () => {
    const p = parseProsodyMarkers('等陣[pause:0.5]，我[slow]慢慢講[fast]！');
    expect(p.text).toContain('等陣');
    expect(p.text).not.toMatch(/\[/);
    expect(p.overrides.pauseBonusMs).toBe(500);
    expect(p.overrides.speedMul).toBeLessThan(1);
    expect(p.markers.map((m) => m.kind)).toEqual(
      expect.arrayContaining(['pause', 'slow', 'fast']),
    );
  });

  it('builds instruct-ready prosody from marked text', () => {
    const merged = prosodyFromMarkedText('Hello[pause][bright]', {
      language: 'en',
      emotion: 'happy',
    });
    expect(merged.text).toBe('Hello');
    expect(merged.pauseMs).toBeGreaterThan(180);
    expect(merged.instruct).toMatch(/English/i);
    expect(resolveProsody({ language: 'yue' }).instruct).toMatch(/粤语|粵語/);
  });

  it('robot forceReply carries prosody on done', async () => {
    const robot = createVoiceRobotBridge({ language: 'yue' });
    const turn = await robot.runTurn('demo', {
      forceReply: '好呀[pause]，跟住[fast]開心！',
    });
    expect(turn.reply).toBe('好呀，跟住開心！');
    expect(turn.prosody.markers.length).toBeGreaterThanOrEqual(2);
    expect(turn.prosody.pauseMs).toBeGreaterThan(180);
  });
});
