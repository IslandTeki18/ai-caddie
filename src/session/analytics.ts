import type { Round, Shot, AggressionLevel } from '@/core';
import { analyzeRound, type ClubPerformance } from '@/engine';

/**
 * Cross-round trend aggregation (Phase I step 29). Pure glue over the engine's
 * per-round `analyzeRound`: rolls club performance up across every stored round
 * and splits outcomes by the round's aggression setting — the one dimension a
 * single `Shot` can't express (see analytics.ts note). Screen stays thin.
 */

export interface AggressionOutcome {
  aggression: AggressionLevel;
  rounds: number;
  /** good / total shots across rounds at this aggression. */
  goodRate: number;
}

export interface TrendSummary {
  roundsAnalyzed: number;
  totalShots: number;
  /** Club performance aggregated across all rounds, sorted by n desc then club. */
  clubs: ClubPerformance[];
  /** Conservative-vs-aggressive outcomes, one row per aggression seen. */
  byAggression: AggressionOutcome[];
}

export function summarizeTrends(
  rounds: readonly { round: Round; shots: readonly Shot[] }[],
): TrendSummary {
  const allShots = rounds.flatMap((r) => [...r.shots]);

  // Reuse the engine's club aggregation over the flattened shot set.
  const clubs = analyzeRound(allShots).clubs;

  const agg = new Map<AggressionLevel, { rounds: number; good: number; total: number }>();
  for (const { round, shots } of rounds) {
    const a = agg.get(round.aggressionDefault) ?? { rounds: 0, good: 0, total: 0 };
    a.rounds++;
    a.total += shots.length;
    a.good += shots.filter((s) => s.quality === 'good').length;
    agg.set(round.aggressionDefault, a);
  }

  const byAggression: AggressionOutcome[] = [...agg.entries()].map(([aggression, a]) => ({
    aggression,
    rounds: a.rounds,
    goodRate: a.total ? a.good / a.total : 0,
  }));

  return { roundsAnalyzed: rounds.length, totalShots: allShots.length, clubs, byAggression };
}
