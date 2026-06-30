import type {
  Round,
  ClubBaseline,
  PlayerProfile,
  Shot,
  Confidence,
  AggressionLevel,
  Yardage,
  Lie,
  Elevation,
  PinLocation,
} from '@/core';
import type { Hazard, GreenContext } from '@/engine';

/**
 * Round session state (Phase D, SPEC §7 orchestration). The reducer is pure and
 * sync; the live round + current-round shot logs live here so the engine can be
 * called with full context without touching SQLite. Per-shot UI inputs (the
 * fields Phase F's screens will dispatch) are carried in `currentShot`.
 */
export type Phase = 'setup' | 'teeShot' | 'approach' | 'holeComplete' | 'roundComplete';

interface ShotInputBase {
  /** Which baseline to adapt; the tee shot defaults to 'Driver'. */
  club: string;
  /** Per-shot confidence, supplied by the UI (engine + cue both read it). */
  confidence: Confidence;
  /** Overrides the round default when set. */
  aggression?: AggressionLevel;
}

export interface TeeShotInput extends ShotInputBase {
  kind: 'tee';
  hazards?: readonly Hazard[];
}

export interface ApproachShotInput extends ShotInputBase {
  kind: 'approach';
  yardage: Yardage;
  lie: Lie;
  elevation: Elevation;
  pin: PinLocation;
  green: GreenContext;
}

export type ShotInput = TeeShotInput | ApproachShotInput;

export interface SessionState {
  phase: Phase;
  round: Round;
  baselines: readonly ClubBaseline[];
  /** Held for completeness; the cue derives miss from live logs, not the profile. */
  profile?: PlayerProfile;
  holeNumber: number;
  /** Full current-round log. `Shot` is a superset of `ShotLog`, so the engine reads it directly. */
  shots: readonly Shot[];
  /** Per-shot UI context for `currentRecommendation`; cleared after each logged shot. */
  currentShot?: ShotInput;
}

export const LAST_HOLE = 18;
