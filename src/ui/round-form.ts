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
  /** Local id of a course picked at setup (see course search). Optional. */
  courseId?: string;
  windMph?: number;
  tempF?: number;
  aggressionDefault: AggressionLevel;
}

/**
 * Map the setup form to a validated `Round`. `courseId` links the round to a
 * locally-saved course when one was picked; otherwise it stays undefined and the
 * round still plays fully.
 */
export function roundFromSetupForm(form: SetupForm, now: number): Round {
  return RoundSchema.parse({
    id: newId(),
    courseId: form.courseId,
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
    club: state.currentShot?.club,
    timestamp: result.timestamp || now,
    updatedAt: now,
  });
}
