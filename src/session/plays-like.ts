import type { Elevation, ClubBaseline } from '@/core';
import { playsLike, type PlaysLikeBreakdown } from '@/engine';
import type { SessionState } from './state';

/**
 * Raw-conditions → yards conversions for the transparent plays-like card (step
 * 24). These live in the session layer, not the engine, so the engine stays a
 * pure function of pre-computed yard terms. Display-only: club selection does
 * not yet consume the total.
 *
 * ponytail: provisional magnitudes (SPEC §12 tune-during-build). Tune against
 * the player's real logged carries once enough rounds exist.
 */
const ELEVATION_YARDS = 5; // one club up/down per step
const YARDS_PER_MPH = 1; // headwind adds, tailwind subtracts
const BASE_TEMP_F = 70; // reference; colder plays longer
const YARDS_PER_DEG = 0.2;

/** Signed elevation adjustment: uphill plays longer (+), downhill shorter (−). */
export function elevationYards(e: Elevation): number {
  if (e === 'up') return ELEVATION_YARDS;
  if (e === 'down') return -ELEVATION_YARDS;
  return 0;
}

/**
 * Signed wind adjustment. Round weather carries only a magnitude, so treat it as
 * a headwind component (plays longer).
 * ponytail: no wind direction stored yet; fold direction in when logging captures it.
 */
export function windYards(windMph?: number): number {
  return (windMph ?? 0) * YARDS_PER_MPH;
}

/** Signed temperature adjustment: below the reference plays longer (+). */
export function tempYards(tempF?: number): number {
  if (tempF === undefined) return 0;
  return (BASE_TEMP_F - tempF) * YARDS_PER_DEG;
}

/**
 * Itemized plays-like breakdown for the pending approach shot. Undefined for a
 * tee shot (no target yardage) or when no shot context is set. The five terms
 * sum to `total` (lie + confidence fold into strikeTrend inside `playsLike`).
 */
export function currentPlaysLike(state: SessionState): PlaysLikeBreakdown | undefined {
  const cur = state.currentShot;
  if (cur?.kind !== 'approach') return undefined;
  return playsLike({
    base: cur.yardage,
    wind: windYards(state.round.weather.windMph),
    temp: tempYards(state.round.weather.tempF),
    elevation: elevationYards(cur.elevation),
    lie: cur.lie,
    confidence: cur.confidence,
  });
}

/** Default club for an approach: the baseline whose carry is closest to the yardage. */
export function nearestClub(baselines: readonly ClubBaseline[], yards: number): string | undefined {
  let best: ClubBaseline | undefined;
  for (const b of baselines) {
    if (!best || Math.abs(b.distanceYards - yards) < Math.abs(best.distanceYards - yards)) {
      best = b;
    }
  }
  return best?.club;
}
