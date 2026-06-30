import type {
  AggressionLevel,
  Confidence,
  Elevation,
  Lie,
  PinLocation,
  Yardage,
} from '@/core';
import type { DispersionEllipse } from './dispersion';

/**
 * Approach strategy (SPEC §7, P0-4): target the functional center of the green,
 * never the flag by default. Adjusts for pin, false fronts, and confidence.
 * `targetBias` is the signed offset from the geometric center (depth +=deeper,
 * lateral +=right) so the bias is inspectable and testable; `marginYards` is the
 * safety cushion that widens as confidence drops.
 */
export interface GreenContext {
  falseFront?: boolean;
}

export interface ApproachContext {
  yardage: Yardage;
  lie: Lie;
  elevation: Elevation;
  pin: PinLocation;
  green: GreenContext;
  dispersion: DispersionEllipse;
  confidence: Confidence;
  aggression: AggressionLevel;
}

export interface ApproachPlan {
  shape: string;
  targetBias: { depthYards: number; lateralYards: number };
  marginYards: number;
}

// ponytail: provisional weights (SPEC §12: false-front depth + low-confidence
// margin are explicitly tune-during-build). Tune against logged misses.
const FALSE_FRONT_DEPTH = 5; // yards deeper when front pin guards a false front
const CONFIDENCE_MARGIN: Record<Confidence, number> = {
  high: 5,
  medium: 8,
  low: 12,
};
const TUCKED_PIN_LATERAL_LEAN = 1; // small lean toward pin; center stays dominant

/** Functional-center approach plan with inspectable bias + safety margin. */
export function recommendApproach(ctx: ApproachContext): ApproachPlan {
  let depthYards = 0;
  let lateralYards = 0;

  // Front pin over a false front: push the target deeper to clear the reject slope.
  if (ctx.pin === 'front' && ctx.green.falseFront) {
    depthYards += FALSE_FRONT_DEPTH;
  }

  // Tucked (left/right) pins stay center-biased: only a small lean, never chase.
  if (ctx.pin === 'left') {
    lateralYards -= TUCKED_PIN_LATERAL_LEAN;
  } else if (ctx.pin === 'right') {
    lateralYards += TUCKED_PIN_LATERAL_LEAN;
  }

  const marginYards = CONFIDENCE_MARGIN[ctx.confidence];

  return {
    shape: 'soft fade',
    targetBias: { depthYards, lateralYards },
    marginYards,
  };
}
