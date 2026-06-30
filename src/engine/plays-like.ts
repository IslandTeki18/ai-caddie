import type { Lie, Confidence } from '@/core';

/**
 * Transparent yardage model (SPEC §7, P0-2). Every adjustment is an itemized
 * signed yard term; the five terms sum exactly to `total` so the UI can show
 * the math and the player trusts the number.
 *
 * `wind`/`temp`/`elevation`/`strikeTrend` are signed yards the caller computes
 * from raw conditions (headwind = +, downhill = −, etc.). `elevation` is a
 * number here rather than the core `Elevation` enum because the enum carries no
 * magnitude and the math needs one. `lie` + `confidence` fold into the
 * strikeTrend term (both express expected strike quality) so the breakdown
 * stays at five visible terms that sum to the total.
 */
export interface PlaysLikeInput {
  base: number;
  wind?: number;
  temp?: number;
  elevation?: number;
  strikeTrend?: number;
  lie?: Lie;
  confidence?: Confidence;
}

export interface PlaysLikeBreakdown {
  base: number;
  wind: number;
  temp: number;
  elevation: number;
  strikeTrend: number;
  total: number;
}

// ponytail: provisional magnitudes — SPEC §12 lists these as tune-during-build.
// Tune against the player's real logged carries once logging exists.
const LIE_PENALTY: Record<Lie, number> = {
  tee: 0,
  fairway: 0,
  rough: 3,
  sand: 5,
};
const CONFIDENCE_PENALTY: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Itemized "plays like" breakdown whose terms sum to `total`. */
export function playsLike(input: PlaysLikeInput): PlaysLikeBreakdown {
  const base = input.base;
  const wind = input.wind ?? 0;
  const temp = input.temp ?? 0;
  const elevation = input.elevation ?? 0;
  const strikeTrend =
    (input.strikeTrend ?? 0) +
    (input.lie ? LIE_PENALTY[input.lie] : 0) +
    (input.confidence ? CONFIDENCE_PENALTY[input.confidence] : 0);

  return {
    base,
    wind,
    temp,
    elevation,
    strikeTrend,
    total: base + wind + temp + elevation + strikeTrend,
  };
}
