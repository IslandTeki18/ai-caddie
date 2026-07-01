import {
  newId,
  RoundSchema,
  ShotSchema,
  type Round,
  type Shot,
  type AggressionLevel,
  type ShotLog,
} from '@/core';
import type { SessionState } from '@/session';

/** Raw pre-round setup form values (all optional except aggression). */
export interface SetupForm {
  courseName?: string;
  windMph?: number;
  tempF?: number;
  aggressionDefault: AggressionLevel;
}

/**
 * Map the setup form to a validated `Round`. Course pick is deferred (no course
 * seeding yet) so `courseId` stays undefined; the round still plays fully.
 */
export function roundFromSetupForm(form: SetupForm, now: number): Round {
  return RoundSchema.parse({
    id: newId(),
    weather: { windMph: form.windMph, tempF: form.tempF },
    aggressionDefault: form.aggressionDefault,
    startedAt: now,
    updatedAt: now,
  });
}

/**
 * Build a validated `Shot` from the current shot context (round/hole/kind) plus
 * the five logged result enums. The pending shot's `kind` supplies `Shot.kind`.
 */
export function shotFromResult(state: SessionState, result: ShotLog, now: number): Shot {
  const kind = state.currentShot?.kind ?? 'approach';
  return ShotSchema.parse({
    ...result,
    id: newId(),
    roundId: state.round.id,
    holeNumber: state.holeNumber,
    kind,
    timestamp: result.timestamp || now,
    updatedAt: now,
  });
}
