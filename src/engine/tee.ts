import type { Recommendation, AggressionLevel } from '@/core';
import type { DispersionEllipse } from './dispersion';

/**
 * Tee strategy (SPEC §7, P0-3): keep driver on a fixed stock-fade model by
 * default; downgrade only when a right-side OB/water/penalty hazard overlaps
 * the expected dispersion. Left-side hazards never downgrade — the stock fade
 * works away from them.
 */
export interface Hazard {
  side: 'left' | 'right';
  type: 'ob' | 'water' | 'penalty' | 'bunker';
  /** Lateral distance from the target line where the hazard begins, in yards. */
  lateralYards?: number;
}

export interface TeeContext {
  hazards?: readonly Hazard[];
  dispersion: DispersionEllipse;
  aggression: AggressionLevel;
}

const PENALIZING = new Set(['ob', 'water', 'penalty']);
// ponytail: one-step downgrade is enough for V1; widen if the player wants it.
const DOWNGRADE_CLUB = '3-wood';

/** Partial recommendation for the tee shot (club/shape/target/miss fields). */
export function recommendTee(ctx: TeeContext): Partial<Recommendation> {
  const rightEdge = ctx.dispersion.biasYards + ctx.dispersion.lateralYards;
  const downgrade = (ctx.hazards ?? []).some(
    (h) =>
      h.side === 'right' &&
      PENALIZING.has(h.type) &&
      (h.lateralYards ?? 0) <= rightEdge,
  );

  if (downgrade) {
    return {
      club: DOWNGRADE_CLUB,
      shape: 'soft fade',
      target: 'left-center, short of the trouble',
      bestMiss: 'left',
      doNot: 'right',
    };
  }

  return {
    club: 'Driver',
    shape: 'stock fade',
    target: 'left-center',
    bestMiss: 'left',
    doNot: 'right',
  };
}
