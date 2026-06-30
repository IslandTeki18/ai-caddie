import { describe, it, expect } from 'vitest';
import type { ClubBaseline, ShotLog } from '@/core';
import {
  playsLike,
  baselineDispersion,
  adaptDispersion,
  recommendTee,
  recommendApproach,
  selectMentalCue,
  recommend,
  type Hazard,
} from './index';

const club7i: ClubBaseline = {
  id: 'club-7i',
  club: '7i',
  distanceYards: 165,
  dispersion: { lateralYards: 8, longYards: 6 },
  tendency: 'pull-prone under pressure',
  updatedAt: 0,
};

const shot = (over: Partial<ShotLog> = {}): ShotLog => ({
  startDirection: 'onLine',
  curve: 'straight',
  contact: 'center',
  distance: 'pinHigh',
  quality: 'neutral',
  timestamp: 0,
  ...over,
});

// --- Step 7: playsLike -----------------------------------------------------

describe('playsLike', () => {
  it('itemizes each term independently', () => {
    expect(playsLike({ base: 150, wind: 6 }).wind).toBe(6);
    expect(playsLike({ base: 150, temp: 2 }).temp).toBe(2);
    expect(playsLike({ base: 150, elevation: -3 }).elevation).toBe(-3);
    expect(playsLike({ base: 150, strikeTrend: 4 }).strikeTrend).toBe(4);
  });

  it('folds lie + confidence into the strikeTrend term', () => {
    const b = playsLike({ base: 150, strikeTrend: 4, lie: 'rough', confidence: 'low' });
    expect(b.strikeTrend).toBe(4 + 3 + 2);
  });

  it('terms always sum to total (transparency invariant)', () => {
    const b = playsLike({ base: 150, wind: 6, temp: 2, elevation: -3, strikeTrend: 4 });
    expect(b.base + b.wind + b.temp + b.elevation + b.strikeTrend).toBe(b.total);
  });

  it('matches the SPEC worked example: 150 -> 159', () => {
    expect(playsLike({ base: 150, wind: 6, temp: 2, elevation: -3, strikeTrend: 4 }).total).toBe(159);
  });
});

// --- Step 8: baseline dispersion -------------------------------------------

describe('baselineDispersion', () => {
  it('reflects the club baseline with no bias', () => {
    expect(baselineDispersion(club7i)).toEqual({ lateralYards: 8, longYards: 6, biasYards: 0 });
  });
});

// --- Step 9: adaptive dispersion -------------------------------------------

describe('adaptDispersion', () => {
  it('shifts bias slightly for one right miss', () => {
    const one = adaptDispersion(club7i, [shot({ startDirection: 'right' })]);
    expect(one.biasYards).toBeGreaterThan(0);
    expect(one.biasYards).toBeLessThanOrEqual(2);
  });

  it('shifts more for five consistent right misses', () => {
    const one = adaptDispersion(club7i, [shot({ startDirection: 'right' })]);
    const five = adaptDispersion(
      club7i,
      Array.from({ length: 5 }, () => shot({ startDirection: 'right' })),
    );
    expect(five.biasYards).toBeGreaterThan(one.biasYards);
  });

  it('caps a single extreme shot (cap holds)', () => {
    const extreme = adaptDispersion(club7i, [shot({ startDirection: 'right', curve: 'slice' })]);
    // right(1.5) + slice(1) = 2.5 would exceed the 2yd per-shot cap; clamps to 2.
    expect(extreme.biasYards).toBe(2);
  });
});

// --- Step 10: tee ----------------------------------------------------------

describe('recommendTee', () => {
  const dispersion = baselineDispersion(club7i);

  it('keeps driver on a clean hole', () => {
    expect(recommendTee({ hazards: [], dispersion, aggression: 'neutral' }).club).toBe('Driver');
  });

  it('downgrades for right-side water inside dispersion', () => {
    const hazards: Hazard[] = [{ side: 'right', type: 'water', lateralYards: 5 }];
    expect(recommendTee({ hazards, dispersion, aggression: 'neutral' }).club).not.toBe('Driver');
  });

  it('does not downgrade for a left-side hazard', () => {
    const hazards: Hazard[] = [{ side: 'left', type: 'water', lateralYards: 0 }];
    expect(recommendTee({ hazards, dispersion, aggression: 'neutral' }).club).toBe('Driver');
  });
});

// --- Step 11: approach -----------------------------------------------------

describe('recommendApproach', () => {
  const base = {
    yardage: 165,
    lie: 'fairway' as const,
    elevation: 'flat' as const,
    green: {},
    dispersion: baselineDispersion(club7i),
    aggression: 'neutral' as const,
  };

  it('pushes the target deeper for a front pin over a false front', () => {
    const plan = recommendApproach({ ...base, pin: 'front', green: { falseFront: true }, confidence: 'high' });
    expect(plan.targetBias.depthYards).toBeGreaterThan(0);
  });

  it('stays center-biased for a tucked pin', () => {
    const plan = recommendApproach({ ...base, pin: 'right', confidence: 'high' });
    expect(Math.abs(plan.targetBias.lateralYards)).toBeLessThanOrEqual(2);
  });

  it('widens the margin at low confidence', () => {
    const high = recommendApproach({ ...base, pin: 'middle', confidence: 'high' });
    const low = recommendApproach({ ...base, pin: 'middle', confidence: 'low' });
    expect(low.marginYards).toBeGreaterThan(high.marginYards);
  });
});

// --- Step 12: mental cue ---------------------------------------------------

describe('selectMentalCue', () => {
  it('is deterministic for fixed inputs', () => {
    const input = { confidence: 'high' as const, missPattern: 'none' as const, aggression: 'neutral' as const };
    expect(selectMentalCue(input)).toBe('commit to the picture');
    expect(selectMentalCue(input)).toBe(selectMentalCue(input));
  });

  it('prioritizes the live miss pattern', () => {
    expect(
      selectMentalCue({ confidence: 'high', missPattern: 'left', aggression: 'aggressive' }),
    ).toBe('feel the finish left-to-right');
  });
});

// --- Step 13: assembler ----------------------------------------------------

describe('recommend', () => {
  it('produces a six-field tee recommendation (driver kept)', () => {
    const rec = recommend({
      shotKind: 'tee',
      tee: { hazards: [], dispersion: baselineDispersion(club7i), aggression: 'neutral' },
      cue: { confidence: 'high', missPattern: 'none', aggression: 'neutral' },
    });
    expect(rec.club).toBe('Driver');
    expect(rec.bestMiss).toBe('left');
    expect(rec.doNot).toBe('right');
    expect(rec.cue).toBe('commit to the picture');
  });

  it('produces the SPEC approach example fields', () => {
    const rec = recommend({
      shotKind: 'approach',
      club: '7i',
      approach: {
        yardage: 165,
        lie: 'fairway',
        elevation: 'flat',
        pin: 'left',
        green: {},
        dispersion: baselineDispersion(club7i),
        confidence: 'high',
        aggression: 'neutral',
      },
      cue: { confidence: 'high', missPattern: 'none', aggression: 'neutral' },
    });
    expect(rec).toEqual({
      club: '7i',
      target: 'functional center-left',
      shape: 'soft fade',
      bestMiss: 'short-right',
      doNot: 'long-left',
      cue: 'commit to the picture',
    });
  });
});
