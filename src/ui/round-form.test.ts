import { describe, it, expect } from 'vitest';
import { RoundSchema, ShotSchema, type ShotLog } from '@/core';
import type { SessionState } from '@/session';
import { roundFromSetupForm, shotFromResult } from './round-form';

describe('roundFromSetupForm', () => {
  it('produces a schema-valid round carrying weather + aggression', () => {
    const round = roundFromSetupForm(
      { windMph: 12, tempF: 55, aggressionDefault: 'aggressive' },
      1000,
    );
    expect(() => RoundSchema.parse(round)).not.toThrow();
    expect(round.weather).toEqual({ windMph: 12, tempF: 55 });
    expect(round.aggressionDefault).toBe('aggressive');
    expect(round.startedAt).toBe(1000);
    expect(round.id.length).toBeGreaterThan(0);
    expect(round.courseId).toBeUndefined();
  });

  it('allows omitted weather', () => {
    const round = roundFromSetupForm({ aggressionDefault: 'neutral' }, 1);
    expect(() => RoundSchema.parse(round)).not.toThrow();
    expect(round.weather).toEqual({ windMph: undefined, tempF: undefined });
  });
});

describe('shotFromResult', () => {
  const state = {
    phase: 'approach',
    round: { id: 'round-1', weather: {}, aggressionDefault: 'neutral', startedAt: 0, updatedAt: 0 },
    baselines: [],
    holeNumber: 4,
    shots: [],
    currentShot: { kind: 'approach', club: '7i', confidence: 'high', yardage: 150, lie: 'fairway', elevation: 'flat', pin: 'middle', green: {} },
  } as unknown as SessionState;

  const result: ShotLog = {
    startDirection: 'onLine',
    curve: 'straight',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'good',
    timestamp: 0,
  };

  it('builds a schema-valid shot keyed to the round/hole/kind', () => {
    const shot = shotFromResult(state, result, 2000);
    expect(() => ShotSchema.parse(shot)).not.toThrow();
    expect(shot.roundId).toBe('round-1');
    expect(shot.holeNumber).toBe(4);
    expect(shot.kind).toBe('approach');
    expect(shot.timestamp).toBe(2000); // falls back to now when result.timestamp is 0
  });
});
