import { describe, it, expect } from 'vitest';
import type { ClubBaseline } from '@/core';
import { elevationYards, windYards, tempYards, currentPlaysLike, nearestClub } from './plays-like';
import type { SessionState } from './state';
import type { ApproachShotInput, TeeShotInput } from './state';

const baseState = (): SessionState => ({
  phase: 'approach',
  round: {
    id: 'r1',
    weather: { windMph: 10, tempF: 50 },
    aggressionDefault: 'neutral',
    startedAt: 0,
    updatedAt: 0,
  },
  baselines: [],
  holeNumber: 1,
  shots: [],
});

const approach = (over: Partial<ApproachShotInput> = {}): ApproachShotInput => ({
  kind: 'approach',
  club: '7i',
  confidence: 'high',
  yardage: 150,
  lie: 'fairway',
  elevation: 'flat',
  pin: 'middle',
  green: {},
  ...over,
});

describe('conversions', () => {
  it('elevation is signed: up +, down -, flat 0', () => {
    expect(elevationYards('up')).toBeGreaterThan(0);
    expect(elevationYards('down')).toBeLessThan(0);
    expect(elevationYards('flat')).toBe(0);
  });

  it('wind adds yards (headwind), missing wind is 0', () => {
    expect(windYards(10)).toBeGreaterThan(0);
    expect(windYards(undefined)).toBe(0);
  });

  it('temp below reference plays longer, missing temp is 0', () => {
    expect(tempYards(50)).toBeGreaterThan(0);
    expect(tempYards(90)).toBeLessThan(0);
    expect(tempYards(undefined)).toBe(0);
  });
});

describe('currentPlaysLike', () => {
  it('is undefined for a tee shot', () => {
    const tee: TeeShotInput = { kind: 'tee', club: 'Driver', confidence: 'high' };
    expect(currentPlaysLike({ ...baseState(), currentShot: tee })).toBeUndefined();
  });

  it('is undefined with no shot context', () => {
    expect(currentPlaysLike(baseState())).toBeUndefined();
  });

  it('five terms sum to total for an approach', () => {
    const pl = currentPlaysLike({ ...baseState(), currentShot: approach() })!;
    expect(pl).toBeDefined();
    expect(pl.base + pl.wind + pl.temp + pl.elevation + pl.strikeTrend).toBe(pl.total);
    expect(pl.base).toBe(150);
  });
});

describe('nearestClub', () => {
  const bl = (club: string, distanceYards: number): ClubBaseline => ({
    id: club,
    club,
    distanceYards,
    dispersion: { lateralYards: 0, longYards: 0 },
    tendency: '',
    updatedAt: 0,
  });

  it('picks the closest carry', () => {
    expect(nearestClub([bl('9i', 130), bl('7i', 155), bl('6i', 170)], 150)).toBe('7i');
  });

  it('returns undefined with no baselines', () => {
    expect(nearestClub([], 150)).toBeUndefined();
  });
});
