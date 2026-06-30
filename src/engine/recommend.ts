import { RecommendationSchema, type Recommendation } from '@/core';
import { recommendTee, type TeeContext } from './tee';
import { recommendApproach, type ApproachContext } from './approach';
import { selectMentalCue, type MentalCueInput } from './cue';

/**
 * Recommendation assembler (SPEC §7, P0-1): composes tee/approach strategy and
 * the mental cue into the single six-field `Recommendation` the UI consumes —
 * Club, Target, Shape, Best Miss, Do-Not, Cue. Never a menu.
 */
export type RecommendContext =
  | {
      shotKind: 'tee';
      tee: TeeContext;
      cue: MentalCueInput;
    }
  | {
      shotKind: 'approach';
      club: string;
      approach: ApproachContext;
      cue: MentalCueInput;
    };

/** Best-miss / do-not directions implied by the played shape (RH golfer). */
function missFromShape(shape: string): { bestMiss: string; doNot: string } {
  if (shape.includes('fade')) return { bestMiss: 'short-right', doNot: 'long-left' };
  if (shape.includes('draw')) return { bestMiss: 'short-left', doNot: 'long-right' };
  return { bestMiss: 'short', doNot: 'long' };
}

function approachTarget(lateralYards: number): string {
  if (lateralYards < 0) return 'functional center-left';
  if (lateralYards > 0) return 'functional center-right';
  return 'functional center';
}

/** Assemble one validated six-field recommendation for the shot. */
export function recommend(ctx: RecommendContext): Recommendation {
  const cue = selectMentalCue(ctx.cue);

  let rec: Recommendation;
  if (ctx.shotKind === 'tee') {
    const tee = recommendTee(ctx.tee);
    rec = {
      club: tee.club ?? 'Driver',
      target: tee.target ?? 'left-center',
      shape: tee.shape ?? 'stock fade',
      bestMiss: tee.bestMiss ?? 'left',
      doNot: tee.doNot ?? 'right',
      cue,
    };
  } else {
    const plan = recommendApproach(ctx.approach);
    const shape = plan.shape ?? 'soft fade';
    const miss = missFromShape(shape);
    rec = {
      club: ctx.club,
      target: approachTarget(plan.targetBias.lateralYards),
      shape,
      bestMiss: miss.bestMiss,
      doNot: miss.doNot,
      cue,
    };
  }

  return RecommendationSchema.parse(rec);
}
