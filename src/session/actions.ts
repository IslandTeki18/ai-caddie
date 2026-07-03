import type { Round, ClubBaseline, PlayerProfile, Shot } from '@/core';
import type { ShotInput } from './state';

/** Actions driving the round state machine (Phase D). */
export type Action =
  | { type: 'SETUP'; round: Round; baselines: readonly ClubBaseline[]; profile?: PlayerProfile }
  | { type: 'START_HOLE'; holeNumber: number }
  // Jump directly to any hole mid-round (manual hole selection). Preserves the
  // shot log; enters teeShot on the chosen hole.
  | { type: 'GOTO_HOLE'; holeNumber: number }
  | { type: 'SET_SHOT_CONTEXT'; input: ShotInput }
  | { type: 'LOG_SHOT'; shot: Shot }
  | { type: 'COMPLETE_HOLE' }
  // NEXT_HOLE advances to teeShot(n+1), or roundComplete at the last hole.
  | { type: 'NEXT_HOLE' }
  | { type: 'COMPLETE_ROUND' };
