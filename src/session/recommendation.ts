import type { Recommendation, Shot } from '@/core';
import {
  recommend,
  adaptDispersion,
  type DispersionEllipse,
  type MissPattern,
} from '@/engine';
import type { SessionState } from './state';

const ZERO_ELLIPSE: DispersionEllipse = { lateralYards: 0, longYards: 0, biasYards: 0 };

/** Same-kind shots this round — the signal the engine adapts on (filtered by kind, not club). */
function sameKindShots(state: SessionState): readonly Shot[] {
  const kind = state.currentShot?.kind;
  return kind ? state.shots.filter((s) => s.kind === kind) : [];
}

/**
 * Current-round adapted dispersion for the pending shot. Folds this round's
 * same-kind logs into the club baseline; a missing baseline yields a zeroed
 * ellipse so the engine still produces a recommendation.
 */
export function currentDispersion(state: SessionState): DispersionEllipse {
  const cur = state.currentShot;
  if (!cur) return ZERO_ELLIPSE;
  const baseline = state.baselines.find((b) => b.club === cur.club);
  if (!baseline) return ZERO_ELLIPSE;
  return adaptDispersion(baseline, sameKindShots(state));
}

/**
 * Live miss tendency from the most recent same-kind shot (deterministic).
 * Lateral takes priority over distance, matching `cue.ts`'s own ordering.
 */
export function deriveMissPattern(shots: readonly Shot[]): MissPattern {
  const last = shots[shots.length - 1];
  if (!last) return 'none';
  if (last.curve === 'hook' || last.startDirection === 'left') return 'left';
  if (last.curve === 'slice' || last.startDirection === 'right') return 'right';
  if (last.distance === 'short') return 'short';
  if (last.distance === 'long') return 'long';
  return 'none';
}

/**
 * Assemble the engine recommendation for the pending shot from live state.
 * Returns undefined when no shot context is set.
 */
export function currentRecommendation(state: SessionState): Recommendation | undefined {
  const cur = state.currentShot;
  if (!cur) return undefined;

  const aggression = cur.aggression ?? state.round.aggressionDefault;
  const dispersion = currentDispersion(state);
  const missPattern = deriveMissPattern(sameKindShots(state));
  const cue = { confidence: cur.confidence, missPattern, aggression };

  if (cur.kind === 'tee') {
    return recommend({ shotKind: 'tee', tee: { hazards: cur.hazards, dispersion, aggression }, cue });
  }
  return recommend({
    shotKind: 'approach',
    club: cur.club,
    approach: {
      yardage: cur.yardage,
      lie: cur.lie,
      elevation: cur.elevation,
      pin: cur.pin,
      green: cur.green,
      dispersion,
      confidence: cur.confidence,
      aggression,
    },
    cue,
  });
}
