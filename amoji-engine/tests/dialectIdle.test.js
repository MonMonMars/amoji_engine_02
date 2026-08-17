import { describe, expect, it } from 'vitest';
import { detectLanguage, stripAsrTags } from '../engine/voice/dialect.js';
import { sampleIdlePresence, createIdlePresenceClock } from '../engine/face/idlePresence.js';
import { createVoiceRobotBridge } from '../engine/voice/voiceRobotBridge.js';

describe('dialect + idle presence', () => {
  it('detects SenseVoice language tags', () => {
    const yue = detectLanguage({ asrRaw: '<|yue|><|Speech|>早晨' }, { sticky: 'en' });
    expect(yue.id).toBe('yue');
    expect(yue.switched).toBe(true);
    const en = detectLanguage(
      { asrRaw: '<|en|><|NEUTRAL|><|Speech|>Hello there' },
      { sticky: 'yue' },
    );
    expect(en.id).toBe('en');
    expect(stripAsrTags('<|en|><|Speech|>Hello')).toBe('Hello');
  });

  it('robot bridge switches yue → en across turns', async () => {
    const robot = createVoiceRobotBridge({ language: 'yue' });
    await robot.runTurn('<|yue|><|Speech|>早晨呀');
    expect(robot.language).toBe('yue');
    const en = await robot.runTurn('<|en|><|Speech|>Hello there, how are you today?');
    expect(en.language).toBe('en');
    expect(en.reply).toMatch(/got it|talk about/i);
  });

  it('idle presence drifts over time', () => {
    const a = sampleIdlePresence(0.2);
    const b = sampleIdlePresence(1.4);
    expect(a.speechActive).toBe(false);
    expect(a.lookX).not.toBe(b.lookX);
    const clock = createIdlePresenceClock();
    clock.step(0.1);
    expect(clock.timeSec).toBeGreaterThan(0);
  });
});
