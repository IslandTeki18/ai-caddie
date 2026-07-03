import { describe, it, expect } from 'vitest';
import type { Shot } from '@/core';
import { analyzeRound } from './analytics';

/** Minimal Shot factory; overrides pin down whatever a case cares about. */
function mk(over: Partial<Shot>): Shot {
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

describe('analyzeRound', () => {
  it('returns a zeroed struct for no shots', () => {
    const a = analyzeRound([]);
    expect(a.shotCount).toBe(0);
    expect(a.quality).toEqual({ good: 0, neutral: 0, poor: 0 });
    expect(a.teeMiss.dominant).toBeUndefined();
    expect(a.approachDistance.dominant).toBeUndefined();
    expect(a.clubs).toEqual([]);
  });

  it('tallies quality across all shots', () => {
    const a = analyzeRound([
      mk({ quality: 'good' }),
      mk({ quality: 'good' }),
      mk({ quality: 'poor' }),
    ]);
    expect(a.shotCount).toBe(3);
    expect(a.quality).toEqual({ good: 2, neutral: 0, poor: 1 });
  });

  it('flags a dominant tee miss at ≥60% over ≥3 tee shots', () => {
    const a = analyzeRound([
      mk({ kind: 'tee', startDirection: 'right' }),
      mk({ kind: 'tee', startDirection: 'right' }),
      mk({ kind: 'tee', startDirection: 'left' }),
    ]);
    expect(a.teeMiss).toMatchObject({ left: 1, onLine: 0, right: 2, dominant: 'right' });
  });

  it('leaves tee dominant undefined below the threshold', () => {
    const a = analyzeRound([
      mk({ kind: 'tee', startDirection: 'right' }),
      mk({ kind: 'tee', startDirection: 'left' }),
      mk({ kind: 'tee', startDirection: 'onLine' }),
    ]);
    expect(a.teeMiss.dominant).toBeUndefined();
  });

  it('flags a dominant approach distance bias', () => {
    const a = analyzeRound(
      Array.from({ length: 3 }, () => mk({ kind: 'approach', distance: 'short' })),
    );
    expect(a.approachDistance).toMatchObject({ short: 3, pinHigh: 0, long: 0, dominant: 'short' });
  });

  it('computes per-club good/poor rates and sample counts, sorted by n desc', () => {
    const a = analyzeRound([
      mk({ kind: 'tee', club: 'Driver', quality: 'good' }),
      mk({ kind: 'tee', club: 'Driver', quality: 'poor' }),
      mk({ kind: 'tee', club: 'Driver', quality: 'good' }),
      mk({ kind: 'approach', club: '7i', quality: 'good' }),
    ]);
    expect(a.clubs[0]).toEqual({ club: 'Driver', kind: 'tee', n: 3, goodRate: 2 / 3, poorRate: 1 / 3 });
    expect(a.clubs[1]).toEqual({ club: '7i', kind: 'approach', n: 1, goodRate: 1, poorRate: 0 });
  });

  it('ignores shots with no club in the club breakdown', () => {
    const a = analyzeRound([mk({ kind: 'tee', quality: 'good' })]);
    expect(a.clubs).toEqual([]);
    expect(a.quality.good).toBe(1); // still counted in the overall tally
  });
});
