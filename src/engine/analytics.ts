import type { Shot, ShotKind, StartDirection, DistanceResult } from '@/core';

/**
 * Post-round analytics (Phase I step 28). Pure: turns a round's persisted shots
 * into a readable summary — quality tally, dominant tee-miss side, approach
 * distance bias, and per-club performance. Imports `@/core` only.
 *
 * Derivable-only by design: it reads what a `Shot` actually stores (start
 * direction, distance result, quality, club). It does NOT replay the
 * recommendation that was given (none is persisted), so "decision quality" is
 * left to the shot-quality signal rather than reconstructed context.
 * ponytail: conservative-vs-aggressive is not here — a Shot carries no
 * aggression; that split lives at the cross-round layer keyed on the round.
 */

export interface ClubPerformance {
  club: string;
  kind: ShotKind;
  n: number;
  /** Fraction 0..1 with quality === 'good'. */
  goodRate: number;
  /** Fraction 0..1 with quality === 'poor'. */
  poorRate: number;
}

export interface RoundAnalysis {
  shotCount: number;
  quality: { good: number; neutral: number; poor: number };
  /** Tee shots bucketed by start direction; `dominant` set only above threshold. */
  teeMiss: { left: number; onLine: number; right: number; dominant?: StartDirection };
  /** Approach shots bucketed by distance result; `dominant` set only above threshold. */
  approachDistance: { short: number; pinHigh: number; long: number; dominant?: DistanceResult };
  /** One row per (club, kind), sorted by sample size desc then club asc. */
  clubs: ClubPerformance[];
}

/** Shared with learning.ts: min sample and dominant fraction before a call fires. */
const MIN_SAMPLE = 3;
const DOMINANCE = 0.6;

/** Top key of a count record if its share ≥ DOMINANCE over ≥ MIN_SAMPLE total. */
function dominantKey<K extends string>(counts: Record<K, number>): K | undefined {
  const entries = Object.entries(counts) as [K, number][];
  const total = entries.reduce((sum, [, c]) => sum + c, 0);
  if (total < MIN_SAMPLE) return undefined;
  const [key, count] = entries.reduce((best, e) => (e[1] > best[1] ? e : best));
  return count / total >= DOMINANCE ? key : undefined;
}

export function analyzeRound(shots: readonly Shot[]): RoundAnalysis {
  const quality = { good: 0, neutral: 0, poor: 0 };
  const teeMiss = { left: 0, onLine: 0, right: 0 };
  const approachDistance = { short: 0, pinHigh: 0, long: 0 };
  const byClub = new Map<string, { club: string; kind: ShotKind; n: number; good: number; poor: number }>();

  for (const s of shots) {
    quality[s.quality]++;
    if (s.kind === 'tee') teeMiss[s.startDirection]++;
    else approachDistance[s.distance]++;

    if (s.club) {
      const key = `${s.kind}:${s.club}`;
      const row = byClub.get(key) ?? { club: s.club, kind: s.kind, n: 0, good: 0, poor: 0 };
      row.n++;
      if (s.quality === 'good') row.good++;
      if (s.quality === 'poor') row.poor++;
      byClub.set(key, row);
    }
  }

  const clubs: ClubPerformance[] = [...byClub.values()]
    .map((r) => ({ club: r.club, kind: r.kind, n: r.n, goodRate: r.good / r.n, poorRate: r.poor / r.n }))
    .sort((a, b) => b.n - a.n || a.club.localeCompare(b.club));

  return {
    shotCount: shots.length,
    quality,
    teeMiss: { ...teeMiss, dominant: dominantKey(teeMiss) },
    approachDistance: { ...approachDistance, dominant: dominantKey(approachDistance) },
    clubs,
  };
}
