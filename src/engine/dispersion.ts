import type { ClubBaseline, ShotLog } from '@/core';

/**
 * Directional dispersion as an ellipse with a signed lateral center bias.
 * `biasYards` > 0 means the expected center sits right of the target line; the
 * tee logic reads `biasYards + lateralYards` as the right edge to test hazard
 * overlap. `lateralYards`/`longYards` are half-extents.
 */
export interface DispersionEllipse {
  lateralYards: number;
  longYards: number;
  biasYards: number;
}

/** Baseline dispersion straight from the TrackMan club baseline, no adaptation. */
export function baselineDispersion(baseline: ClubBaseline): DispersionEllipse {
  return {
    lateralYards: baseline.dispersion.lateralYards,
    longYards: baseline.dispersion.longYards,
    biasYards: 0,
  };
}

// ponytail: provisional moderate-strength weights + caps (SPEC P0-5, §12 open).
// Per-shot contribution is clamped so one swing can't dominate; consistent
// patterns accumulate across shots. Tune magnitudes against real logged misses.
const PER_SHOT_BIAS_CAP = 2; // max lateral bias one shot can add, yards
const PER_SHOT_WIDTH_CAP = 1.5; // max spread one shot can add, yards

const startDirBias: Record<ShotLog['startDirection'], number> = {
  left: -1.5,
  onLine: 0,
  right: 1.5,
};
const curveBias: Record<ShotLog['curve'], number> = {
  hook: -1,
  fade: 0.5,
  straight: 0,
  slice: 1,
};

const clamp = (v: number, cap: number): number => Math.max(-cap, Math.min(cap, v));

/**
 * Fold current-round signal into the baseline at moderate strength. Each shot's
 * lateral-bias and width contributions are clamped to a per-shot cap, then
 * summed — so one bad shot shifts dispersion slightly while a consistent
 * pattern shifts it more (SPEC §7 dispersion model, P0-5).
 */
export function adaptDispersion(baseline: ClubBaseline, shots: readonly ShotLog[]): DispersionEllipse {
  const start = baselineDispersion(baseline);

  let biasDelta = 0;
  let widthDelta = 0;
  for (const shot of shots) {
    biasDelta += clamp(startDirBias[shot.startDirection] + curveBias[shot.curve], PER_SHOT_BIAS_CAP);
    const spread =
      (shot.contact === 'center' ? 0 : 1) + (shot.distance === 'pinHigh' ? 0 : 0.5);
    widthDelta += clamp(spread, PER_SHOT_WIDTH_CAP);
  }

  return {
    lateralYards: start.lateralYards + widthDelta,
    longYards: start.longYards + widthDelta,
    biasYards: start.biasYards + biasDelta,
  };
}
