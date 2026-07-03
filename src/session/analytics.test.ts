import { describe, it, expect } from 'vitest';
import type { Round, Shot } from '@/core';
import { summarizeTrends } from './analytics';

function mkRound(over: Partial<Round>): Round {
  return { id: 'r', weather: {}, aggressionDefault: 'neutral', startedAt: 0, updatedAt: 0, ...over };
}

function mkShot(over: Partial<Shot>): Shot {
  return {
    id: 'x',
    roundId: 'r',
    holeNumber: 1,
    kind: 'tee',
    startDirection: 'onLine',
    curve: 'straight',
    contact: 'center',
    distance: 'pinHigh',
    quality: 'neutral',
    timestamp: 0,
    updatedAt: 0,
    ...over,
  };
}

describe('summarizeTrends', () => {
  it('handles no rounds', () => {
    const t = summarizeTrends([]);
    expect(t).toEqual({ roundsAnalyzed: 0, totalShots: 0, clubs: [], byAggression: [] });
  });

  it('aggregates club performance across rounds', () => {
    const t = summarizeTrends([
      { round: mkRound({ id: 'r1' }), shots: [mkShot({ club: '7i', quality: 'good' })] },
      { round: mkRound({ id: 'r2' }), shots: [mkShot({ club: '7i', quality: 'poor' })] },
    ]);
    expect(t.roundsAnalyzed).toBe(2);
    expect(t.totalShots).toBe(2);
    expect(t.clubs[0]).toEqual({ club: '7i', kind: 'tee', n: 2, goodRate: 0.5, poorRate: 0.5 });
  });

  it('splits outcomes by round aggression', () => {
    const t = summarizeTrends([
      {
        round: mkRound({ id: 'r1', aggressionDefault: 'aggressive' }),
        shots: [mkShot({ quality: 'good' }), mkShot({ quality: 'poor' })],
      },
      {
        round: mkRound({ id: 'r2', aggressionDefault: 'conservative' }),
        shots: [mkShot({ quality: 'good' }), mkShot({ quality: 'good' })],
      },
    ]);
    const byAgg = Object.fromEntries(t.byAggression.map((o) => [o.aggression, o]));
    expect(byAgg.aggressive).toMatchObject({ rounds: 1, goodRate: 0.5 });
    expect(byAgg.conservative).toMatchObject({ rounds: 1, goodRate: 1 });
  });
});
